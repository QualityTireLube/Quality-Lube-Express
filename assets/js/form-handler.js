/**
 * Quality Lube Express - Simple Form Handler
 * Sends form submissions directly to Google Apps Script
 */

(function() {
    'use strict';
    
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxlDZg38Hp2LO46GQgOAS2ch1SX3OjNko9nfxCQJDGsvkx1ML_HlKQTpeQwZQhHeGVKg/exec';
    const SITE_DOMAIN = 'qualitytirelube.com';
    
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupForms);
        } else {
            setupForms();
        }
    }
    
    function setupForms() {
        // Find all WPForms forms
        const forms = document.querySelectorAll('form.wpforms-form');
        
        forms.forEach(form => {
            // Remove the wpforms-ajax-form class to prevent WPForms from handling it
            form.classList.remove('wpforms-ajax-form');
            
            // Add our submit handler
            form.addEventListener('submit', handleSubmit);
        });
        
        // Also disable WPForms JavaScript if it loaded
        disableWPForms();
    }
    
    function disableWPForms() {
        // Neutralize WPForms settings
        if (window.wpforms_settings) {
            window.wpforms_settings.ajaxurl = null;
        }
        if (window.wpforms) {
            window.wpforms = null;
        }
        if (window.WPForms) {
            window.WPForms = null;
        }
    }
    
    function handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const spinner = form.querySelector('.wpforms-submit-spinner');
        
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }
        if (spinner) {
            spinner.style.display = 'inline';
        }
        
        // Extract form data
        const formData = extractFormData(form);
        
        // Send to Google Apps Script
        sendToGoogleScript(formData, form, submitBtn, spinner);
    }
    
    function extractFormData(form) {
        const data = {
            site: SITE_DOMAIN,
            form_type: 'contact',
            timestamp: new Date().toISOString(),
            page_url: window.location.href
        };
        
        // Get all form inputs
        const formData = new FormData(form);
        
        // Extract WPForms fields
        for (const [key, value] of formData.entries()) {
            if (!value) continue;
            
            // First name
            if (key.includes('[0][first]') || key.toLowerCase().includes('first')) {
                data.first_name = value;
            }
            // Last name
            else if (key.includes('[0][last]') || key.toLowerCase().includes('last')) {
                data.last_name = value;
            }
            // Email
            else if (key.includes('[1]') && !key.includes('[0]') || key.toLowerCase().includes('email')) {
                if (value.includes('@')) {
                    data.email = value;
                }
            }
            // Phone
            else if (key.includes('[3]') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('tel')) {
                data.phone = value;
            }
            // Message
            else if (key.includes('[2]') || key.toLowerCase().includes('message') || key.toLowerCase().includes('comment')) {
                data.message = value;
            }
        }
        
        // Combine first and last name
        if (data.first_name || data.last_name) {
            data.name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        }
        
        return data;
    }
    
    function sendToGoogleScript(data, form, submitBtn, spinner) {
        // Format data to match what Google Apps Script expects
        const payload = {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            message: data.message || '',
            site_domain: SITE_DOMAIN
        };
        
        // Log what we're sending for debugging
        console.log('Sending JSON payload:', JSON.stringify(payload, null, 2));
        
        // Send as JSON - Google Apps Script expects JSON.parse(e.postData.contents)
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(() => {
            console.log('Fetch completed (no-cors mode)');
            showSuccess(form, submitBtn, spinner);
        })
        .catch(error => {
            console.error('Form submission error:', error);
            showError(form, submitBtn, spinner, 'Failed to send. Please try again.');
        });
    }
    
    function showSuccess(form, submitBtn, spinner) {
        // Hide spinner
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
        
        // Show success message
        const existingMsg = form.querySelector('.form-success-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        const successDiv = document.createElement('div');
        successDiv.className = 'form-success-message';
        successDiv.style.cssText = 'background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;';
        successDiv.innerHTML = '<strong>Thank you!</strong> Your message has been sent. We\'ll get back to you soon.';
        
        form.appendChild(successDiv);
        
        // Clear form
        form.reset();
        
        // Remove success message after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
    
    function showError(form, submitBtn, spinner, message) {
        // Hide spinner
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
        
        // Show error message
        const existingMsg = form.querySelector('.form-error-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error-message';
        errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;';
        errorDiv.innerHTML = '<strong>Error:</strong> ' + (message || 'Failed to send message. Please try again or call us directly.');
        
        form.appendChild(errorDiv);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Start
    init();
})();
