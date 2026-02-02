/**
 * Quality Lube Express - Simple Form Handler
 * Sends form submissions directly to Google Apps Script
 * Supports file attachments via Base64 encoding.
 */

(function () {
  "use strict";

  // Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwxlDZg38Hp2LO46GQgOAS2ch1SX3OjNko9nfxCQJDGsvkx1ML_HlKQTpeQwZQhHeGVKg/exec";
  const SITE_DOMAIN = "qualitytirelube.com";

  // Track if user actually clicked the submit button (vs phantom/programmatic submit)
  let submitButtonClicked = false;

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
      form.classList.remove("wpforms-ajax-form");
      
      // Track actual submit button clicks
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .wpforms-submit');
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          submitButtonClicked = true;
          // Reset after a short delay in case submit doesn't happen
          setTimeout(() => { submitButtonClicked = false; }, 1000);
        }, true);
      }
      
      // Use capture phase to intercept submit BEFORE other handlers
      form.addEventListener("submit", handleSubmit, true);
      
      // Disable HTML5 form validation which can also trigger alerts
      form.setAttribute("novalidate", "novalidate");
    });
    disableWPForms();
  }


  function disableWPForms() {
    if (window.wpforms_settings) {
      window.wpforms_settings.ajaxurl = "";
    }
    if (window.wpforms) {
      if (typeof window.wpforms.updateToken === "function") {
        window.wpforms.updateToken = function () {};
      }
      if (typeof window.wpforms.submitHandler === "function") {
        window.wpforms.submitHandler = function (e) {
          return false;
        };
      }
    }
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

  async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const form = e.target;
    
    // ONLY process if user actually clicked the submit button
    // This blocks ALL phantom submits from captcha interactions, validation libraries, etc.
    if (!submitButtonClicked) {
        return;
    }
    
    // Reset the flag immediately
    submitButtonClicked = false;

    const submitBtn = form.querySelector(
      'button[type="submit"], input[type="submit"]',
    );
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

      // Heuristic Mapping
      if (k.includes("first") && k.includes("name")) data.first_name = value;
      else if (k.includes("last") && k.includes("name")) data.last_name = value;
      else if (k.includes("email")) data.email = value;
      else if (k.includes("phone") || k.includes("tel")) data.phone = value;
      else if (k.includes("address1")) data.address1 = value;
      else if (k.includes("address2")) data.address2 = value;
      else if (k.includes("city")) data.city = value;
      else if (k.includes("state")) data.state = value;
      else if (k.includes("postal") || k.includes("zip")) data.zip = value;
      else if (
        k.includes("message") ||
        k.includes("comment") ||
        k.includes("[5]")
      )
        data.message = value; // Fallback for ID 5 (textarea)
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
      message: data.message || data.raw_data || "",
      site_domain: SITE_DOMAIN,
      form_type: data.form_type,
      captcha_token: data.captcha_token, // Pass captcha token
      // Pass attachments directly; Google Script must parse them
      attachments: data.attachments,
    };

    // Add extended address info to message if present
    if (data.address1) {
      const addressFunc = [
        data.address1,
        data.address2,
        data.city,
        data.state,
        data.zip,
      ]
        .filter(Boolean)
        .join(", ");
      payload.message = `Applicant Address: ${addressFunc}\n\nNotes:\n${payload.message}`;
    }

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
        // Saving full data including attachments as requested
        // Note: Firestore has a 1MB limit per document.
        // Large files might fail or need Storage.

        db.collection("form_submissions")
          .add(data)
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
