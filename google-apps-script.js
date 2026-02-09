/**
 * Google Apps Script for Quality Lube Express Form Handling
 *
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Open your existing project (linked in assets/js/form-handler.js) OR Create a New Project
 * 3. Paste this code into Code.gs (replacing existing code)
 * 4. Save
 * 5. Deploy -> New Deployment -> Web App -> "Me" -> "Anyone" -> Deploy
 * 6. Update the URL in assets/js/form-handler.js
 */

// CONFIGURATION
const EMAIL_RECIPIENT = "qualitytirelube@gmail.com";
const EMAIL_SUBJECT_PREFIX = "[Quality Lube Web Form] ";
const HCAPTCHA_SECRET = "YOUR_HCAPTCHA_SECRET_KEY"; // Replace with your actual secret key in the script editor

function verifyCaptcha(token) {
  // hCaptcha requires form-encoded data, UrlFetchApp handles 'payload' as such by default
  const response = UrlFetchApp.fetch("https://hcaptcha.com/siteverify", {
    method: "post",
    payload: {
      secret: HCAPTCHA_SECRET,
      response: token,
    },
  });
  return JSON.parse(response.getContentText());
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);

    // Verify hCaptcha
    if (!postData.captcha_token) {
      throw new Error("Verification failed: Missing captcha token.");
    }
    const verifyResult = verifyCaptcha(postData.captcha_token);
    if (!verifyResult.success) {
      throw new Error("Verification failed: Invalid captcha.");
    }

    // Default Values
    const site =
      postData.site_domain || postData.site || "Quality Lube Express";
    const formType = (postData.form_type || "").toLowerCase();

    // ---------------------------------------------------------------
    // STEP 1: Parse raw wpforms data out of the message field
    // The old client dumps everything into message as "key: value\n"
    // when field mapping fails. Detect and extract properly.
    // ---------------------------------------------------------------
    const messageVal = postData.message || "";
    if (messageVal.indexOf("wpforms[fields]") !== -1) {
      // Parse "key: value" lines from the raw dump
      const lines = messageVal.split(/\n/);
      const parsed = {};
      lines.forEach(function(line) {
        const idx = line.indexOf(": ");
        if (idx > 0) {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 2).trim();
          if (v) parsed[k] = v;
        }
      });

      // Also handle space-separated format ("key: val key2: val2" on one line)
      // by re-splitting on known wpforms/metadata key patterns
      if (Object.keys(parsed).length <= 1) {
        // Match wpforms[...] keys, and common metadata keys
        const knownKeys = [
          "wpforms\\[fields\\]\\[\\d+\\](?:\\[[^\\]]*\\])*",
          "wpforms\\[id\\]",
          "wpforms\\[post_id\\]",
          "page_title",
          "page_url",
          "page_id",
          "url_referer",
          "g-recaptcha-response",
          "h-captcha-response",
        ];
        const pattern = new RegExp("(" + knownKeys.join("|") + "):\\s*", "g");
        const keys = [];
        let m;
        while ((m = pattern.exec(messageVal)) !== null) {
          keys.push({ key: m[1].trim(), start: m.index, valueStart: m.index + m[0].length });
        }
        for (var i = 0; i < keys.length; i++) {
          var end = i + 1 < keys.length ? keys[i + 1].start : messageVal.length;
          var val = messageVal.substring(keys[i].valueStart, end).trim();
          if (val) parsed[keys[i].key] = val;
        }
      }

      // Map parsed wpforms keys to clean fields
      const wpFieldMap = {
        "wpforms[fields][0][first]": "_first_name",
        "wpforms[fields][0][last]": "_last_name",
        "wpforms[fields][1][first]": "_first_name",
        "wpforms[fields][1][last]": "_last_name",
        "wpforms[fields][1]": "email",
        "wpforms[fields][2]": formType === "careers" ? "about" : "clean_message",
        "wpforms[fields][3]": "phone",
        "wpforms[fields][4]": "email",
        "wpforms[fields][5]": formType === "careers" ? "about" : "clean_message",
        "wpforms[fields][2][address1]": "address1",
        "wpforms[fields][2][address2]": "address2",
        "wpforms[fields][2][city]": "city",
        "wpforms[fields][2][state]": "state",
        "wpforms[fields][2][postal]": "zip",
      };

      Object.keys(parsed).forEach(function(k) {
        if (wpFieldMap[k]) {
          var target = wpFieldMap[k];
          if (!postData["_parsed_" + target]) postData["_parsed_" + target] = parsed[k];
        }
      });

      // Build name from parsed first/last
      var pFirst = postData["_parsed__first_name"] || "";
      var pLast = postData["_parsed__last_name"] || "";
      if (pFirst || pLast) {
        postData.name = (pFirst + " " + pLast).trim();
      }
      if (postData["_parsed_email"]) postData.email = postData["_parsed_email"];
      if (postData["_parsed_phone"]) postData.phone = postData["_parsed_phone"];
      if (postData["_parsed_clean_message"]) postData.message = postData["_parsed_clean_message"];
      if (postData["_parsed_about"]) postData.message = postData["_parsed_about"];
      if (postData["_parsed_address1"]) postData.address1 = postData["_parsed_address1"];
      if (postData["_parsed_address2"]) postData.address2 = postData["_parsed_address2"];
      if (postData["_parsed_city"]) postData.city = postData["_parsed_city"];
      if (postData["_parsed_state"]) postData.state = postData["_parsed_state"];
      if (postData["_parsed_zip"]) postData.zip = postData["_parsed_zip"];

      // Extract page_url from parsed data if not already set
      if (!postData.page_url && parsed["page_url"]) postData.page_url = parsed["page_url"];
    }

    // ---------------------------------------------------------------
    // STEP 2: Map wpforms keys that came as direct postData properties
    // (for the updated client that sends them as separate keys)
    // ---------------------------------------------------------------
    const wpMap = {
      "wpforms[fields][0][first]": "First Name",
      "wpforms[fields][0][last]": "Last Name",
      "wpforms[fields][1]": "Email", 
      "wpforms[fields][2]": formType === "careers" ? "About Yourself" : "Message",
      "wpforms[fields][3]": "Phone", 
      "wpforms[fields][4]": "Address Line 1",
      "wpforms[fields][1][first]": "First Name",
      "wpforms[fields][1][last]": "Last Name",
      "wpforms[fields][2][address1]": "Address Line 1",
      "wpforms[fields][2][address2]": "Address Line 2",
      "wpforms[fields][2][city]": "City",
      "wpforms[fields][2][state]": "State",
      "wpforms[fields][2][postal]": "Zip Code",
      "wpforms[fields][4]": "Email",
      "wpforms[fields][5]": formType === "careers" ? "About Yourself" : "Message",
    };
    
    Object.keys(postData).forEach(function(key) {
      if (wpMap[key]) {
         var niceName = wpMap[key];
         if (niceName === "First Name") postData["_first_name"] = postData[key];
         else if (niceName === "Last Name") postData["_last_name"] = postData[key];
         else if (!postData[niceName]) postData[niceName] = postData[key];
      }
    });

    // Synthesize "Name" if we have parts but not the whole
    if ((!postData["Name"] || postData["Name"] === "Unknown") && (postData["_first_name"] || postData["_last_name"])) {
        postData["Name"] = ((postData["_first_name"] || "") + " " + (postData["_last_name"] || "")).trim();
    }

    // ---------------------------------------------------------------
    // STEP 3: Normalize lowercase field names to display labels
    // ---------------------------------------------------------------
    var msgLabel = formType === "careers" ? "About Yourself" : "Message";
    var fieldCaseMap = {
      name: "Name",
      email: "Email",
      phone: "Phone",
      message: msgLabel,
      address1: "Address Line 1",
      address2: "Address Line 2",
      city: "City",
      state: "State",
      zip: "Zip Code",
    };
    Object.keys(fieldCaseMap).forEach(function(key) {
      if (postData[key] && postData[key] !== "Unknown" && postData[key] !== "no-reply@qualitytirelube.com") {
        // Only overwrite if the uppercase version is missing or is a placeholder
        if (!postData[fieldCaseMap[key]] || postData[fieldCaseMap[key]] === "Unknown" || postData[fieldCaseMap[key]] === "no-reply@qualitytirelube.com") {
          postData[fieldCaseMap[key]] = postData[key];
        }
      }
    });

    // Clean out placeholder values
    if (postData["Name"] === "Unknown") delete postData["Name"];
    if (postData["Email"] === "no-reply@qualitytirelube.com") delete postData["Email"];

    // If Message still contains raw wpforms dump after parsing, clear it
    // (all useful data was already extracted into proper fields)
    if (postData["Message"] && postData["Message"].indexOf("wpforms[fields]") !== -1) {
      delete postData["Message"];
    }
    if (postData[msgLabel] && postData[msgLabel].indexOf("wpforms[fields]") !== -1) {
      delete postData[msgLabel];
    }

    // Field title mapping for any extra fields
    var fieldTitles = {
      resume: "Resume",
    };
    
    // 1. Prepare Attachments
    const emailAttachments = [];
    if (postData.attachments && Array.isArray(postData.attachments)) {
      postData.attachments.forEach((file) => {
        if (file.content && file.name && file.type) {
          const checkBlob = Utilities.newBlob(
            Utilities.base64Decode(file.content),
            file.type,
            file.name,
          );
          emailAttachments.push(checkBlob);
        }
      });
    }
    // 2. Construct Email Body (HTML)
    let subject = EMAIL_SUBJECT_PREFIX;
    let heading = "";
    let order = [];
    if (formType === "careers") {
      subject += "Careers Submission";
      heading = "New Careers Submission";
      order = [
        "Name",
        "Email",
        "Phone",
        "Address Line 1",
        "Address Line 2",
        "City",
        "State",
        "Zip Code",
        "About Yourself",
      ];
    } else {
      subject += "Contact Submission";
      heading = "New Contact Submission";
      order = [
        "Name",
        "Email",
        "Phone",
        "Address Line 1",
        "Address Line 2",
        "City",
        "State",
        "Zip Code",
        "Message",
      ];
    }
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
        <div style="background-color: #fff; padding: 20px; text-align: center; border-bottom: 3px solid #D32F2F;">
          <img src="https://qualitytirelube.com/assets/img/logo-01.png" alt="Quality Lube Express" style="max-width: 220px; height: auto; margin-bottom: 10px;">
          <h2 style="color: #D32F2F; margin: 0; font-size: 22px;">${heading}</h2>
        </div>
        <div style="padding: 24px 24px 10px 24px; background: #fafafa;">
          <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
    `;
    // Add fields in order
    order.forEach((label) => {
      if (postData[label]) {
        htmlBody += `<tr><td style="padding: 10px 8px; font-weight: bold; color: #333; width: 38%;">${label}</td><td style="padding: 10px 8px; color: #444;">${postData[label]}</td></tr>`;
      }
    });
    // Add any other fields not in the order
    // Exclude internal fields, captcha fields, and unmapped wpforms keys
    const ignoredKeys = [
          "site", "site_domain", "form_type", "timestamp", "page_url", "attachments", "raw_data",
          "captcha_token", "g-recaptcha-response", "h-captcha-response", "spam_check",
          "wpforms[id]", "wpforms[post_id]", "page_id", "url_referer", "page_title",
          "_first_name", "_last_name", "undefined",
          // Lowercase variants (already normalized to capitalized versions above)
          "name", "email", "phone", "message", "address1", "address2", "city", "state", "zip",
          "Captcha Token", "Name", "Email", "Phone", "Message", "About Yourself",
          "Address Line 1", "Address Line 2", "City", "State", "Zip Code",
    ];
    
    Object.keys(postData).forEach((key) => {
      // Skip if in ordered list
      if (order.includes(key)) return;
      
      // Skip if in ignored list
      if (ignoredKeys.includes(key)) return;
      
      // Skip raw wpforms keys that look like wpforms[fields]...
      if (key.startsWith("wpforms[")) return;

      // Skip internal parsed keys
      if (key.startsWith("_parsed_")) return;

      let label = fieldTitles[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      htmlBody += `<tr><td style="padding: 10px 8px; font-weight: bold; color: #333; width: 38%;">${label}</td><td style="padding: 10px 8px; color: #444;">${postData[key]}</td></tr>`;
    });
    htmlBody += `</table>
          <div style="margin-top: 25px; font-size: 13px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
            Submitted on ${new Date().toLocaleString()}<br>
            Page: <a href="${postData.page_url || ""}" style="color: #D32F2F;">${postData.page_url || ""}</a>
          </div>
        </div>
      </div>
    `;
    // Text fallback
    let textBody = `New submission from ${site}\nForm: ${formType ? formType.charAt(0).toUpperCase() + formType.slice(1) : "Contact"}\nDate: ${new Date().toLocaleString()}\n`;
    order.forEach((label) => {
      if (postData[label]) textBody += `${label}: ${postData[label]}\n`;
    });
    Object.keys(postData).forEach((key) => {
      if (order.includes(key)) return;
      if (ignoredKeys.includes(key)) return;
      if (key.startsWith("wpforms[")) return;
      if (key.startsWith("_parsed_")) return;
      let label =
        fieldTitles[key] ||
        key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      textBody += `${label}: ${postData[key]}\n`;
    });
    textBody += `\n----------------------------------------\nPage: ${postData.page_url || "Unknown"}`;
    // Send Email
    MailApp.sendEmail({
      to: EMAIL_RECIPIENT,
      subject: subject,
      htmlBody: htmlBody,
      body: textBody,
      attachments: emailAttachments,
    });
    // Return JSON Success
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "Email sent successfully",
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
