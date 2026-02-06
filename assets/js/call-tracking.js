/**
 * SEO-Safe Call Tracking Implementation
 * qualitytirelube.com
 * 
 * This script dynamically replaces phone numbers for HUMAN visitors only,
 * ensuring Google and other bots ONLY see the real business number.
 * 
 * CRITICAL: This script MUST load AFTER the DOM is ready and MUST NOT
 * modify any structured data (schema.org) markup.
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION - LOCKED PHONE NUMBERS
  // ============================================================================
  
  const CONFIG = {
    // Real business number (SEO + GBP) - MUST match Google Business Profile
    realNumber: {
      display: '(225) 658-9099',
      tel: '+12256589099',
      telDisplay: 'tel:+12256589099'
    },
    
    // Website call tracking number (HUMANS ONLY)
    trackingNumber: {
      display: '(225) 269-5446',
      tel: '+12252695446',
      telDisplay: 'tel:+12252695446'
    },
    
    // Selectors to target for replacement (excludes schema/structured data)
    selectors: [
      'a[href*="2256589099"]',
      'a[href*="225-658-9099"]',
      'a[href*="tel:+12256589099"]',
      '.phone-number',
      '.w-text-value',
      '.f-num a'
    ],
    
    // Delay before replacement (milliseconds) - ensures page is fully loaded
    replacementDelay: 100,
    
    // Enable debug logging
    debug: false
  };

  // ============================================================================
  // BOT DETECTION
  // ============================================================================
  
  /**
   * Detects if the current visitor is a bot/crawler
   * Returns TRUE if bot detected (do NOT swap numbers)
   * Returns FALSE if human visitor (safe to swap)
   */
  function isBot() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Known bot patterns
    const botPatterns = [
      'googlebot',
      'bingbot',
      'slurp',
      'duckduckbot',
      'baiduspider',
      'yandexbot',
      'sogou',
      'exabot',
      'facebot',
      'facebookexternalhit',
      'ia_archiver',
      'chrome-lighthouse',
      'gtmetrix',
      'pingdom',
      'uptimerobot',
      'headless',
      'phantom',
      'crawler',
      'spider',
      'bot',
      'crawl'
    ];
    
    // Check user agent against bot patterns
    const isBotUserAgent = botPatterns.some(pattern => userAgent.includes(pattern));
    
    // Additional bot detection checks
    const hasWebdriver = navigator.webdriver === true;
    const hasPhantom = window._phantom || window.callPhantom;
    const hasHeadless = /HeadlessChrome/.test(userAgent);
    
    // Check for common bot properties
    const suspiciousProperties = !navigator.languages || 
                                 navigator.languages.length === 0 ||
                                 !navigator.plugins ||
                                 navigator.plugins.length === 0;
    
    const detected = isBotUserAgent || hasWebdriver || hasPhantom || hasHeadless;
    
    if (CONFIG.debug) {
      console.log('Bot Detection:', {
        userAgent: userAgent,
        isBotUserAgent: isBotUserAgent,
        hasWebdriver: hasWebdriver,
        hasPhantom: hasPhantom,
        hasHeadless: hasHeadless,
        suspiciousProperties: suspiciousProperties,
        finalDecision: detected ? 'BOT' : 'HUMAN'
      });
    }
    
    return detected;
  }

  // ============================================================================
  // PHONE NUMBER REPLACEMENT
  // ============================================================================
  
  /**
   * Replaces phone numbers in the DOM for human visitors only
   * Preserves original numbers in HTML source for SEO
   */
  function replacePhoneNumbers() {
    // CRITICAL: Do not replace if bot detected
    if (isBot()) {
      if (CONFIG.debug) {
        console.log('Bot detected - phone numbers will NOT be replaced');
      }
      return;
    }
    
    if (CONFIG.debug) {
      console.log('Human visitor detected - replacing phone numbers with tracking number');
    }
    
    let replacementCount = 0;
    
    // Find all phone number elements (excluding schema/structured data)
    const elements = document.querySelectorAll(CONFIG.selectors.join(','));
    
    elements.forEach(element => {
      // Skip if element is inside a script tag (protects schema markup)
      if (element.closest('script')) {
        if (CONFIG.debug) {
          console.log('Skipping element inside script tag:', element);
        }
        return;
      }
      
      // Skip if element is inside noscript tag
      if (element.closest('noscript')) {
        return;
      }
      
      // Replace href attribute if it's a link
      if (element.tagName === 'A' && element.href) {
        const oldHref = element.href;
        
        // Replace various formats of the real number
        element.href = element.href
          .replace(/tel:\+?1?2256589099/gi, CONFIG.trackingNumber.telDisplay)
          .replace(/tel:\+?1?225-658-9099/gi, CONFIG.trackingNumber.telDisplay)
          .replace(/tel:2256589099/gi, CONFIG.trackingNumber.telDisplay);
        
        if (oldHref !== element.href) {
          replacementCount++;
          
          // Add data attribute to track replacement
          element.setAttribute('data-original-phone', CONFIG.realNumber.tel);
          element.setAttribute('data-tracking-phone', CONFIG.trackingNumber.tel);
          
          if (CONFIG.debug) {
            console.log('Replaced href:', oldHref, '→', element.href);
          }
        }
      }
      
      // Replace text content (display number)
      if (element.textContent) {
        const oldText = element.textContent;
        
        // Replace various display formats
        const newText = element.textContent
          .replace(/\(225\)\s*658-9099/gi, CONFIG.trackingNumber.display)
          .replace(/225-658-9099/gi, CONFIG.trackingNumber.display)
          .replace(/225\.658\.9099/gi, CONFIG.trackingNumber.display.replace(/-/g, '.'))
          .replace(/225\s+658\s+9099/gi, CONFIG.trackingNumber.display.replace(/-/g, ' '))
          .replace(/2256589099/gi, CONFIG.trackingNumber.tel.replace('+1', ''));
        
        if (oldText !== newText) {
          element.textContent = newText;
          replacementCount++;
          
          if (CONFIG.debug) {
            console.log('Replaced text:', oldText, '→', newText);
          }
        }
      }
      
      // Replace innerHTML for elements with icons
      if (element.innerHTML && element.innerHTML.includes('658-9099')) {
        const oldHTML = element.innerHTML;
        element.innerHTML = element.innerHTML.replace(/225-658-9099/gi, CONFIG.trackingNumber.display);
        
        if (oldHTML !== element.innerHTML) {
          replacementCount++;
          
          if (CONFIG.debug) {
            console.log('Replaced innerHTML');
          }
        }
      }
    });
    
    if (CONFIG.debug) {
      console.log(`Call tracking complete: ${replacementCount} replacements made`);
    }
    
    // Track replacement event (for analytics)
    if (typeof window.dataLayer !== 'undefined') {
      window.dataLayer.push({
        'event': 'callTrackingActive',
        'trackingNumber': CONFIG.trackingNumber.display,
        'replacementCount': replacementCount
      });
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize call tracking when DOM is ready
   */
  function init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(replacePhoneNumbers, CONFIG.replacementDelay);
      });
    } else {
      // DOM already loaded
      setTimeout(replacePhoneNumbers, CONFIG.replacementDelay);
    }
  }
  
  // Start initialization
  init();
  
  // ============================================================================
  // MUTATION OBSERVER (for dynamically loaded content)
  // ============================================================================
  
  /**
   * Watch for dynamically added phone numbers and replace them
   * This handles AJAX-loaded content, modals, etc.
   */
  if (!isBot() && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      let shouldReplace = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // Element node
              // Check if added node contains phone numbers
              const hasPhoneNumber = node.textContent && 
                                    (node.textContent.includes('658-9099') || 
                                     node.textContent.includes('2256589099'));
              
              if (hasPhoneNumber) {
                shouldReplace = true;
              }
            }
          });
        }
      });
      
      if (shouldReplace) {
        setTimeout(replacePhoneNumbers, 50);
      }
    });
    
    // Start observing after initial replacement
    setTimeout(function() {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      if (CONFIG.debug) {
        console.log('MutationObserver started - watching for dynamic content');
      }
    }, CONFIG.replacementDelay + 100);
  }
  
  // ============================================================================
  // PUBLIC API (for manual triggering if needed)
  // ============================================================================
  
  window.QualityLubeCallTracking = {
    replace: replacePhoneNumbers,
    isBot: isBot,
    config: CONFIG
  };
  
})();
