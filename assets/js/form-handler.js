/**
 * Hosting Platform - Universal Form Handler
 * 
 * This script intercepts form submissions and sends them to the hosting platform API.
 * It's designed to be reusable across ALL hosted sites without modification.
 * 
 * Features:
 * - Auto-detects site domain (works with host-based and path-based routing)
 * - Auto-detects form type from form ID, class, or content
 * - Handles WPForms, Contact Form 7, and standard HTML forms
 * - Shows success/error messages
 * - Clears form on successful submission
 * 
 * Usage:
 * Simply include this script in your HTML:
 * <script src="/assets/js/form-handler.js"></script>
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    
    // Google Apps Script URL (Free Backend)
    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwxlDZg38Hp2LO46GQgOAS2ch1SX3OjNko9nfxCQJDGsvkx1ML_HlKQTpeQwZQhHeGVKg/exec';
    
    // ============================================
    // DOMAIN DETECTION
    // ============================================
    
    function detectDomain() {
        // 1. Check for manual override global variable
        if (window.HOSTING_PLATFORM_SITE_DOMAIN) {
            return window.HOSTING_PLATFORM_SITE_DOMAIN;
        }

        // 2. Check for meta tag override
        const metaDomain = document.querySelector('meta[name="hosting-platform-site"]');
        if (metaDomain && metaDomain.content) {
            return metaDomain.content;
        }

        const hostname = window.location.hostname.replace('www.', '');
        
        // 3. Check for path-based routing (e.g. /quality.test/...)
        // This works for ANY hostname (localhost, tunnels, ip addresses)
        // We look for the first path segment being a dot-separated string
        const pathMatch = window.location.pathname.match(/^\/([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\//i);
        if (pathMatch && pathMatch[1].includes('.')) {
            return pathMatch[1];
        }
        
        // 4. Default to hostname
        return hostname;
    }
    
    // Global override for Cloudflare Tunnel
    // 2026-01-21 fix: if no valid domain found and running on trycloudflare, default to quality.test for testing
    let SITE_DOMAIN = detectDomain();
    
    // Check if valid "real" domain (has dot, not localhost, not trycloudflare)
    if (SITE_DOMAIN.includes('trycloudflare.com')) {
         console.warn("[Hosting Platform] Detected Cloudflare Tunnel URL. Checking path or meta for real domain...");
         // If we are here, path detection failed or returned the tunnel domain.
         // We check if the PATH has a valid domain segment.
         // e.g. /quality.test/
         const segments = window.location.pathname.split('/');
         const domainSegment = segments.find(s => s.includes('.') && !s.includes('trycloudflare'));
         if (domainSegment) {
             SITE_DOMAIN = domainSegment;
             console.log(`[Hosting Platform] Rescued domain from path segment: ${SITE_DOMAIN}`);
         } else {
             // FALLBACK: If we absolutely cannot find it, assume quality.test for now (User Request)
             // Ideally this should come from a server-injected var.
             // Check for the injected global first
             if (window.HOSTING_PLATFORM_SITE_DOMAIN) {
                 SITE_DOMAIN = window.HOSTING_PLATFORM_SITE_DOMAIN;
             } else {
                 // Check for HEAD meta tag again explicitly
                 const meta = document.querySelector('meta[name="hosting-platform-site"]');
                 if (meta) {
                     SITE_DOMAIN = meta.content;
                     console.log(`[Hosting Platform] Found domain via meta tag: ${SITE_DOMAIN}`);
                 } 
                 // If NOT found via meta, we really are lost.
                 // But wait, the previous injection logic in static_server.py is working.
                 // Why did detectDomain() fail?
                 // Because `document.querySelector` runs at the top level immediately.
                 // If the script runs BEFORE the <head> is fully parsed (if in head), it might be too early?
                 // Or if script is injected via JS.
                 
                 // Let's defer SITE_DOMAIN finalization to init?
                 // No, it's const.
                 // Let's make it let.
             }
         }
    }
    
    // ============================================
    // FORM TYPE DETECTION
    // ============================================
    
    function detectFormType(form) {
        const formId = (form.id || '').toLowerCase();
        const formClass = (form.className || '').toLowerCase();
        const formAction = (form.action || '').toLowerCase();
        const formHTML = form.innerHTML.toLowerCase();
        
        // Check for specific form types
        if (formId.includes('contact') || formClass.includes('contact') || 
            formAction.includes('contact') || formHTML.includes('contact')) {
            return 'contact';
        }
        
        if (formId.includes('appointment') || formClass.includes('appointment') || 
            formHTML.includes('appointment') || formHTML.includes('schedule')) {
            return 'appointment';
        }
        
        if (formId.includes('career') || formClass.includes('career') || 
            formHTML.includes('career') || formHTML.includes('resume') || 
            formHTML.includes('job') || formHTML.includes('apply')) {
            return 'careers';
        }
        
        if (formId.includes('quote') || formClass.includes('quote') || 
            formHTML.includes('quote') || formHTML.includes('estimate')) {
            return 'quote';
        }
        
        if (formId.includes('newsletter') || formClass.includes('newsletter') || 
            formHTML.includes('newsletter') || formHTML.includes('subscribe')) {
            return 'newsletter';
        }
        
        // Default to contact form
        return 'contact';
    }
    
    // ============================================
    // FORM DATA EXTRACTION
    // ============================================
    
    function extractFormData(form) {
        const formData = new FormData(form);
        const data = {};
        let name = '';
        let firstName = '';
        let lastName = '';
        let email = '';
        let phone = '';
        let message = '';
        
        // Build a map of WPForms field IDs to their labels
        // This allows us to use human-readable names instead of "field_1", "field_2", etc.
        const fieldLabelMap = buildFieldLabelMap(form);
        
        // Debug: Log all form fields
        console.log('[Hosting Platform] Raw form fields:');
        for (const [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        console.log('[Hosting Platform] Field label map:', fieldLabelMap);
        
        // Process all form fields
        for (const [key, value] of formData.entries()) {
            // Skip empty values and internal WPForms fields
            if (!value || key === 'wpforms[id]' || key === 'wpforms[author]' || 
                key === 'page_title' || key === 'page_url' || key === 'url_referer' || 
                key === 'page_id' || key.includes('post_id') || key.includes('token') ||
                key === 'wpforms[submit]' || key === 'wpforms[hp]') {
                continue;
            }
            
            const keyLower = key.toLowerCase();
            const valueStr = String(value).trim();
            
            if (!valueStr) continue;
            
            // =====================================================
            // WPForms specific field detection
            // WPForms uses: wpforms[fields][N] or wpforms[fields][N][subfield]
            // =====================================================
            
            // Check for WPForms name field with first/last subfields
            if (keyLower.includes('wpforms[fields]') && keyLower.includes('[first]')) {
                firstName = valueStr;
            } else if (keyLower.includes('wpforms[fields]') && keyLower.includes('[last]')) {
                lastName = valueStr;
            }
            // Check for labels in form HTML to identify field purpose
            else if (keyLower.includes('wpforms[fields]')) {
                // Try to identify field type by looking at the input element
                const fieldMatch = key.match(/wpforms\[fields\]\[(\d+)\]/);
                if (fieldMatch) {
                    const fieldId = fieldMatch[1];
                    // Look for the input element and its associated label
                    const input = form.querySelector(`[name="${key}"]`);
                    let labelText = '';
                    
                    if (input) {
                        // Try to find label
                        const wrapper = input.closest('.wpforms-field');
                        if (wrapper) {
                            const label = wrapper.querySelector('.wpforms-field-label, label');
                            if (label) {
                                labelText = label.textContent.toLowerCase();
                            }
                        }
                        
                        // Also check input type and placeholder
                        const inputType = (input.type || '').toLowerCase();
                        const placeholder = (input.placeholder || '').toLowerCase();
                        
                        // Identify by label, type, or placeholder
                        if (labelText.includes('email') || inputType === 'email' || placeholder.includes('email')) {
                            if (!email) email = valueStr;
                        } else if (labelText.includes('phone') || inputType === 'tel' || placeholder.includes('phone')) {
                            if (!phone) phone = valueStr;
                        } else if (labelText.includes('name') && !labelText.includes('first') && !labelText.includes('last')) {
                            if (!name && !firstName) name = valueStr;
                        } else if (labelText.includes('message') || labelText.includes('comment') || 
                                   labelText.includes('reason') || input.tagName.toLowerCase() === 'textarea') {
                            if (!message) message = valueStr;
                        }
                    }
                }
            }
            // =====================================================
            // Generic field detection (non-WPForms)
            // =====================================================
            else if (keyLower.includes('name')) {
                if (keyLower.includes('first')) {
                    firstName = valueStr;
                } else if (keyLower.includes('last')) {
                    lastName = valueStr;
                } else if (!name && !firstName) {
                    name = valueStr;
                }
            }
            else if (keyLower.includes('email')) {
                if (!email) email = valueStr;
            }
            else if (keyLower.includes('phone') || keyLower.includes('tel')) {
                if (!phone) phone = valueStr;
            }
            else if (keyLower.includes('message') || keyLower.includes('comment')) {
                if (!message) message = valueStr;
            }
            
            // Store all data with human-readable key names
            const readableKey = convertToReadableKey(key, fieldLabelMap);
            data[readableKey] = valueStr;
        }
        
        // Combine first/last name if we got them separately
        if (firstName || lastName) {
            name = [firstName, lastName].filter(Boolean).join(' ');
        }
        
        // Validate email format - if it doesn't look like an email, clear it
        if (email && !email.includes('@')) {
            console.warn(`[Hosting Platform] Invalid email format: "${email}", moving to additional fields`);
            data['invalid_email_value'] = email;
            email = '';
        }
        
        console.log('[Hosting Platform] Extracted fields:', { name, email, phone, message });
        
        return {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            message: message.trim(),
            raw_data: data
        };
    }
    
    /**
     * Build a map of WPForms field IDs to their human-readable labels.
     * This looks at the form HTML to find labels associated with each field.
     */
    function buildFieldLabelMap(form) {
        const labelMap = {};
        
        // Find all WPForms field containers
        const fieldContainers = form.querySelectorAll('.wpforms-field[data-field-id]');
        fieldContainers.forEach(container => {
            const fieldId = container.getAttribute('data-field-id');
            if (!fieldId) return;
            
            // Find the label for this field
            const label = container.querySelector('.wpforms-field-label');
            if (label) {
                // Clean up the label text (remove required asterisk, trim whitespace)
                let labelText = label.textContent.trim();
                labelText = labelText.replace(/\s*\*\s*$/, '').trim(); // Remove trailing asterisk
                
                // Convert to a clean key format (e.g., "Vehicle Year" -> "vehicle_year")
                const cleanLabel = labelText
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
                    .replace(/\s+/g, '_')        // Spaces to underscores
                    .replace(/_+/g, '_')         // Collapse multiple underscores
                    .replace(/^_|_$/g, '');      // Trim underscores
                
                if (cleanLabel) {
                    labelMap[fieldId] = {
                        original: labelText,
                        clean: cleanLabel
                    };
                }
            }
        });
        
        // Also check for sub-labels (like First/Last name)
        const subLabels = form.querySelectorAll('.wpforms-field-sublabel');
        subLabels.forEach(subLabel => {
            const input = subLabel.previousElementSibling;
            if (input && input.name) {
                const match = input.name.match(/wpforms\[fields\]\[(\d+)\]\[([^\]]+)\]/);
                if (match) {
                    const fieldId = match[1];
                    const subField = match[2];
                    const subText = subLabel.textContent.trim().toLowerCase();
                    
                    // Store sublabel info
                    if (!labelMap[fieldId]) {
                        labelMap[fieldId] = { original: '', clean: `field_${fieldId}`, subfields: {} };
                    }
                    if (!labelMap[fieldId].subfields) {
                        labelMap[fieldId].subfields = {};
                    }
                    labelMap[fieldId].subfields[subField] = subText;
                }
            }
        });
        
        return labelMap;
    }
    
    /**
     * Convert a WPForms field key to a human-readable name.
     * e.g., "wpforms[fields][10]" -> "vehicle_make"
     * e.g., "wpforms[fields][1][first]" -> "name_first"
     */
    function convertToReadableKey(key, labelMap) {
        // Check if this is a WPForms field
        const wpformsMatch = key.match(/wpforms\[fields\]\[(\d+)\](?:\[([^\]]+)\])?/);
        
        if (wpformsMatch) {
            const fieldId = wpformsMatch[1];
            const subField = wpformsMatch[2]; // e.g., "first", "last", "date", "time"
            
            const fieldInfo = labelMap[fieldId];
            if (fieldInfo && fieldInfo.clean) {
                if (subField) {
                    // Check if we have a subfield label
                    if (fieldInfo.subfields && fieldInfo.subfields[subField]) {
                        return `${fieldInfo.clean}_${fieldInfo.subfields[subField]}`;
                    }
                    return `${fieldInfo.clean}_${subField}`;
                }
                return fieldInfo.clean;
            }
            
            // Fallback: use field_N format
            if (subField) {
                return `field_${fieldId}_${subField}`;
            }
            return `field_${fieldId}`;
        }
        
        // For non-WPForms fields, just clean up the key
        return key
            .toLowerCase()
            .replace(/[\[\]]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    // ============================================
    // MESSAGE DISPLAY
    // ============================================
    
    function showMessage(form, type, message) {
        // Remove any existing messages
        const existingMsg = form.parentElement.querySelector('.form-submission-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        // Create message element
        const msgDiv = document.createElement('div');
        msgDiv.className = 'form-submission-message';
        msgDiv.style.cssText = `
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            animation: fadeIn 0.3s ease;
        `;
        
        if (type === 'success') {
            msgDiv.style.backgroundColor = '#d4edda';
            msgDiv.style.color = '#155724';
            msgDiv.style.border = '1px solid #c3e6cb';
        } else {
            msgDiv.style.backgroundColor = '#f8d7da';
            msgDiv.style.color = '#721c24';
            msgDiv.style.border = '1px solid #f5c6cb';
        }
        
        msgDiv.textContent = message;
        
        // Insert before form
        form.parentElement.insertBefore(msgDiv, form);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            msgDiv.style.opacity = '0';
            msgDiv.style.transition = 'opacity 0.3s ease';
            setTimeout(() => msgDiv.remove(), 300);
        }, 10000);
    }
    
    // ============================================
    // FORM SUBMISSION HANDLER
    // ============================================
    
    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // Prevent other handlers from running
        
        console.log('[Hosting Platform] Form submit intercepted');
        
        // ALWAYS check meta tag first - it's the most reliable source injected by the server
        const meta = document.querySelector('meta[name="hosting-platform-site"]');
        let currentDomain;
        
        if (meta && meta.content && !meta.content.includes('trycloudflare')) {
            currentDomain = meta.content;
            console.log('[Hosting Platform] Domain from meta tag:', currentDomain);
        } else {
            // Fallback: try to extract from path
            const pathMatch = window.location.pathname.match(/^\/([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\//i);
            if (pathMatch && pathMatch[1].includes('.') && !pathMatch[1].includes('trycloudflare')) {
                currentDomain = pathMatch[1];
                console.log('[Hosting Platform] Domain from path:', currentDomain);
            } else {
                // Last resort fallback
                currentDomain = SITE_DOMAIN;
                console.log('[Hosting Platform] Domain from initial detection:', currentDomain);
            }
        }
        
        // Final safety check - if still a tunnel URL, try hard fallback
        if (currentDomain.includes('trycloudflare') || currentDomain.includes('ngrok') || currentDomain.includes('localhost')) {
            // Extract from path one more time
            const segments = window.location.pathname.split('/').filter(s => s);
            const domainSegment = segments.find(s => s.includes('.') && !s.includes('trycloudflare') && !s.includes('ngrok'));
            if (domainSegment) {
                currentDomain = domainSegment;
                console.log('[Hosting Platform] Domain rescued from path segments:', currentDomain);
            }
        }
        
        console.log('[Hosting Platform] Final domain for submission:', currentDomain);

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent || submitBtn.value : '';
        
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            if (submitBtn.tagName === 'BUTTON') {
                submitBtn.textContent = 'Sending...';
            } else {
                submitBtn.value = 'Sending...';
            }
        }
        
        try {
            const formType = detectFormType(form);
            const extractedData = extractFormData(form);
            
            const payload = {
                site_domain: currentDomain,
                form_type: formType,
                form_name: form.id || form.name || 'main-form',
                name: extractedData.name,
                email: extractedData.email,
                phone: extractedData.phone,
                message: extractedData.message,
                additional_fields: extractedData.raw_data
            };
            
            console.log('[Hosting Platform] Submitting form to:', API_BASE_URL);
            console.log('[Hosting Platform] Payload:', payload);
            
            // Send to Google Apps Script (Free Backend)
            // We use text/plain to avoid CORS preflight (OPTIONS) requests which GAS doesn't handle natively
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });
            
            console.log('[Hosting Platform] Response status:', response.status);
            
            const result = await response.json();
            console.log('[Hosting Platform] Response body:', result);
            
            if (response.ok && result.success) {
                showMessage(form, 'success', result.message || 'Thank you! Your message has been sent successfully.');
                form.reset();
            } else {
                throw new Error(result.detail || result.message || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            showMessage(form, 'error', 'Sorry, there was an error sending your message. Please try again or contact us directly.');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.tagName === 'BUTTON') {
                    submitBtn.textContent = originalBtnText;
                } else {
                    submitBtn.value = originalBtnText;
                }
            }
        }
    }
    
    // ============================================
    // THIRD-PARTY FORM PLUGIN DISABLING
    // ============================================
    
    function disableThirdPartyFormHandlers() {
        // Disable WPForms AJAX
        document.querySelectorAll('form.wpforms-ajax-form').forEach(form => {
            form.classList.remove('wpforms-ajax-form');
        });
        
        // Neutralize WPForms settings
        if (window.wpforms_settings) {
            // Setting to null prevents it from fetching index.html
            window.wpforms_settings.ajaxurl = null; 
            window.wpforms_settings.submit = null;
        }
        
        // Disable WPForms object but keep validation
        if (window.WPForms) {
            // Keep validation but disable submit handling
            if (window.WPForms.FrontendModern) {
                window.WPForms.FrontendModern = null;
            }
        }
        
        // Prevent WPForms from binding submit handlers
        if (window.jQuery && window.jQuery.fn) {
            // Remove wpforms submit handlers
            const $ = window.jQuery;
            $('form.wpforms-form').off('submit.wpforms');
            $('form.wpforms-form').off('wpformsBeforeFormSubmit');
            $('form.wpforms-form').off('wpformsAjaxSubmitActionComplete');
        }
        
        // Disable Contact Form 7
        if (window.wpcf7) {
            window.wpcf7 = null;
        }
        
        // Disable Gravity Forms AJAX
        if (window.gform) {
            window.gform = null;
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        // Disable third-party handlers first
        disableThirdPartyFormHandlers();
        
        // Find all forms that should be handled
        const formSelectors = [
            'form.wpforms-form',
            'form.wpforms-validate',
            'form.wpcf7-form',
            'form.gform_wrapper form',
            'form[data-hosting-platform]',
            'form.contact-form',
            'form#contact-form',
            'form[action*="contact"]'
        ];
        
        const forms = document.querySelectorAll(formSelectors.join(', '));
        
        forms.forEach(form => {
            // Remove existing action to prevent default submission
            form.removeAttribute('action');
            
            // Remove ajax classes that WPForms uses
            form.classList.remove('wpforms-ajax-form');
            
            // Mark form as handled to prevent double-handling
            if (form.dataset.hostingPlatformHandled) {
                console.log(`[Hosting Platform] Form already handled: ${form.id || 'unnamed'}`);
                return;
            }
            form.dataset.hostingPlatformHandled = 'true';
            
            // Use capture phase to intercept before any other handlers
            // This prevents WPForms/CF7 from handling the submit first
            form.addEventListener('submit', handleFormSubmit, { capture: true });
            
            // Also add a direct handler as backup
            form.addEventListener('submit', handleFormSubmit, { capture: false });
            
            console.log(`[Hosting Platform] Form handler attached: ${form.id || 'unnamed'} (${detectFormType(form)})`);
        });
        
        if (forms.length === 0) {
            console.log('[Hosting Platform] No compatible forms found on this page');
        } else {
            console.log(`[Hosting Platform] Initialized ${forms.length} form(s) for ${SITE_DOMAIN}`);
        }
    }
    
    // Run initialization
    if (document.readyState === 'loading') {
        disableThirdPartyFormHandlers(); // Run immediately to catch early scripts
        document.addEventListener('DOMContentLoaded', init);
    } else {
        disableThirdPartyFormHandlers();
        init();
    }
    
    // Re-run on window load as backup
    window.addEventListener('load', function() {
        disableThirdPartyFormHandlers();
    });
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

})();
