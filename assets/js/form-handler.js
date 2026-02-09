/**
 * Quality Lube Express - Simple Form Handler
 * Sends form submissions directly to Google Apps Script
 * Supports file attachments via Base64 encoding.
 */

(function () {
  "use strict";

  // Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyIeJeyhmlm2vXXky816sQ5hnn9kRuXqOKpFRx-8ihYXInXJeR9MBOJA_L0sGEaJDWe/exec";
  const SITE_DOMAIN = "qualitytirelube.com";

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupForms);
    } else {
      setupForms();
    }
  }

  function setupForms() {
    const forms = document.querySelectorAll("form.wpforms-form");
    forms.forEach((form) => {
      // Remove WPForms classes that trigger their JS
      form.classList.remove("wpforms-ajax-form");
      form.classList.remove("wpforms-validate");
      
      // Disable HTML5 form validation
      form.setAttribute("novalidate", "novalidate");
      
      // Find submit button and change its type to prevent any submit events
      const submitBtn = form.querySelector('button[type="submit"], .wpforms-submit');
      if (submitBtn) {
        // Change type from "submit" to "button" - this prevents form submit events entirely
        submitBtn.type = "button";
        
        // Handle click on the button directly
        submitBtn.addEventListener("click", () => {
          handleFormSubmission(form, submitBtn);
        });
      }
      
      // Also block any submit events just in case
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  // No longer needed - keeping it simple
  function disableWPForms() {
    // Intentionally empty - we just handle submit event directly
  }

  // --- FILE HANDLING HELPERS ---

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          type: file.type,
          content: reader.result.split(",")[1], // Get base64 part
        });
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // --- FORM VALIDATION ---
  
  function validateForm(form) {
    // Check all inputs with required attribute
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    for (const input of requiredInputs) {
      if (!input.value || input.value.trim() === '') {
        const label = form.querySelector(`label[for="${input.id}"]`);
        const fieldName = label ? label.textContent.replace('*', '').trim() : 'Required field';
        return `Please fill in the ${fieldName} field.`;
      }
    }
    
    // Check inputs inside wpforms-field-required containers
    const requiredContainers = form.querySelectorAll('.wpforms-field-required');
    for (const container of requiredContainers) {
      const input = container.querySelector('input, textarea, select');
      if (input && (!input.value || input.value.trim() === '')) {
        const label = container.querySelector('label');
        const fieldName = label ? label.textContent.replace('*', '').trim() : 'Required field';
        return `Please fill in the ${fieldName} field.`;
      }
    }
    
    // Validate email format if email field exists
    const emailInput = form.querySelector('input[type="email"], input[name*="email"]');
    if (emailInput && emailInput.value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailInput.value.trim())) {
        return 'Please enter a valid email address.';
      }
    }
    
    // Validate phone number format if phone field exists
    const phoneInput = form.querySelector('input[type="tel"], input[name*="phone"]');
    if (phoneInput && phoneInput.value) {
      const digitsOnly = phoneInput.value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return 'Please enter a valid phone number with at least 10 digits.';
      }
    }
    
    return null; // No validation errors
  }

  async function handleFormSubmission(form, submitBtn) {
    // Validate required fields first
    const validationError = validateForm(form);
    if (validationError) {
      alert(validationError);
      return;
    }

    const spinner = form.querySelector(".wpforms-submit-spinner");

    // Check for hCaptcha
    const captchaResponse = hcaptcha.getResponse();
    if (!captchaResponse) {
      alert("Please complete the captcha verification.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }
    if (spinner) {
      spinner.style.display = "inline";
    }

    try {
      // Await the extraction of data (files take time to read)
      const formData = await extractFormData(form);
      formData.captcha_token = captchaResponse; // Add token to payload

      sendToGoogleScript(formData, form, submitBtn, spinner);
    } catch (error) {
      console.error("Error preparing form data:", error);
      showError(form, submitBtn, spinner, "Error preparing form data.");
    }
  }

  async function extractFormData(form) {
    const data = {
      site: SITE_DOMAIN,
      form_type: "contact",
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      attachments: [], // Array to hold file objects
    };

    if (form.getAttribute("data-form-name")) {
      data.form_type = form.getAttribute("data-form-name").toLowerCase();
    }

    const formData = new FormData(form);
    const filePromises = [];

    // Identify inputs and map them
    for (const [key, value] of formData.entries()) {
      // Check if it's a file
      if (value instanceof File) {
        if (value.size > 0) {
          filePromises.push(readFileAsBase64(value));
        }
        continue; // Don't add file object to simple key values
      }

      if (!value) continue;

      // Default: add raw key-value to data (ensures unmapped fields are sent)
      data[key] = value;

      const k = key.toLowerCase();

      // Heuristic Mapping (covers both semantic names and WPForms bracket keys)
      if (k.includes("[first]") || (k.includes("first") && k.includes("name"))) data.first_name = value;
      else if (k.includes("[last]") || (k.includes("last") && k.includes("name"))) data.last_name = value;
      else if (k.includes("email")) data.email = value;
      else if (k.includes("phone") || k.includes("tel")) data.phone = value;
      else if (k.includes("address1") || k.includes("[address1]")) data.address1 = value;
      else if (k.includes("address2") || k.includes("[address2]")) data.address2 = value;
      else if (k.includes("city") || k.includes("[city]")) data.city = value;
      else if (k.includes("state") || k.includes("[state]")) data.state = value;
      else if (k.includes("postal") || k.includes("zip") || k.includes("[postal]")) data.zip = value;
      else if (
        k.includes("message") ||
        k.includes("comment") ||
        k.includes("[5]")
      )
        data.message = value;
    }

    // Fallback: detect unmapped fields by input type if heuristics missed them
    if (!data.email) {
      const emailInput = form.querySelector('input[type="email"]');
      if (emailInput && emailInput.value) data.email = emailInput.value;
    }
    if (!data.phone) {
      const phoneInput = form.querySelector('input[type="tel"]');
      if (phoneInput && phoneInput.value) data.phone = phoneInput.value;
    }
    if (!data.message) {
      const textarea = form.querySelector('textarea');
      if (textarea && textarea.value) data.message = textarea.value;
    }

    // Wait for all files to be read
    if (filePromises.length > 0) {
      data.attachments = await Promise.all(filePromises);
    }

    // Combine Name if split
    if ((data.first_name || data.last_name) && !data.name) {
      data.name = [data.first_name, data.last_name].filter(Boolean).join(" ");
    }

    // Generic "Full message" blob for email if fields don't map perfectly
    let fullKeyValues = "";
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        fullKeyValues += `${key}: ${value}\n`;
      }
    }
    data.raw_data = fullKeyValues;

    return data;
  }

  function sendToGoogleScript(data, form, submitBtn, spinner) {
    // Construct Payload
    const payload = {
      name: data.name || "Unknown",
      email: data.email || "no-reply@qualitytirelube.com",
      phone: data.phone || "",
      message: data.message || "",
      site_domain: SITE_DOMAIN,
      form_type: data.form_type,
      page_url: data.page_url || window.location.href,
      captcha_token: data.captcha_token,
      attachments: data.attachments,
    };

    // Add address fields individually (for careers form)
    if (data.address1) payload.address1 = data.address1;
    if (data.address2) payload.address2 = data.address2;
    if (data.city) payload.city = data.city;
    if (data.state) payload.state = data.state;
    if (data.zip) payload.zip = data.zip;

    console.log(
      "Sending Payload with " +
        (payload.attachments ? payload.attachments.length : 0) +
        " attachments.",
    );

    // 1. Save to Firebase
    // Check if firebase is available AND firestore is loaded
    if (
      typeof firebase !== "undefined" &&
      firebase.apps.length &&
      typeof firebase.firestore === "function"
    ) {
      try {
        const db = firebase.firestore();
        // Save clean submission data (no captcha tokens, no raw dumps)
        const firestoreData = {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          message: payload.message,
          site_domain: SITE_DOMAIN,
          form_type: data.form_type,
          page_url: data.page_url || window.location.href,
          timestamp: new Date().toISOString(),
        };
        if (data.address1) firestoreData.address1 = data.address1;
        if (data.address2) firestoreData.address2 = data.address2;
        if (data.city) firestoreData.city = data.city;
        if (data.state) firestoreData.state = data.state;
        if (data.zip) firestoreData.zip = data.zip;

        db.collection("form_submissions")
          .add(firestoreData)
          .then(() => console.log("Saved to Firestore"))
          .catch((err) => console.error("Firestore Error:", err));
      } catch (err) {
        console.warn("Firestore initialization failed:", err);
      }
    }

    // 2. Send to Google Apps Script
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => {
        console.log("Fetch completed");
        showSuccess(form, submitBtn, spinner);
        if (typeof hcaptcha !== "undefined") hcaptcha.reset();
      })
      .catch((error) => {
        console.error("Form submission error:", error);
        showError(
          form,
          submitBtn,
          spinner,
          "Failed to send. Please try again.",
        );
        if (typeof hcaptcha !== "undefined") hcaptcha.reset();
      });
  }

  function showSuccess(form, submitBtn, spinner) {
    if (spinner) spinner.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }

    const existingMsg = form.querySelector(".form-success-message");
    if (existingMsg) existingMsg.remove();

    const successDiv = document.createElement("div");
    successDiv.className = "form-success-message";
    successDiv.style.cssText =
      "background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;";
    successDiv.innerHTML =
      "<strong>Success!</strong> Your application has been sent.";

    form.appendChild(successDiv);
    form.reset();

    setTimeout(() => {
      successDiv.remove();
    }, 8000);
  }

  function showError(form, submitBtn, spinner, msg) {
    if (spinner) spinner.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
    alert(msg);
  }

  init();
})();
