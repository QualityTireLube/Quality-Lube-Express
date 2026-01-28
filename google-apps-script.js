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

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // Default Values
    const site = postData.site_domain || postData.site || "Quality Lube Express";
    const formType = postData.form_type || "Contact";
    
    // --- KEY MAPPING FOR WPFORMS ---
    // Maps raw form field names to cleaner labels or standard keys
    const fieldMap = {
      "wpforms[fields][1][first]": "First Name",
      "wpforms[fields][1][last]": "Last Name",
      "wpforms[fields][2][address1]": "address1",
      "wpforms[fields][2][address2]": "address2",
      "wpforms[fields][2][city]": "city",
      "wpforms[fields][2][state]": "state",
      "wpforms[fields][2][postal]": "zip",
      "wpforms[fields][3]": "phone",   // Maps to priority field
      "wpforms[fields][4]": "email",   // Maps to priority field
      "wpforms[fields][5]": "message"  // Maps to priority field
    };

    Object.keys(postData).forEach(key => {
      if (fieldMap[key]) {
        postData[fieldMap[key]] = postData[key];
        if (fieldMap[key] !== key) { // Avoid deleting if key equals mapped key
            delete postData[key];
        }
      }
    });
    // --------------------------------

    // 1. Prepare Attachments
    const emailAttachments = [];
    if (postData.attachments && Array.isArray(postData.attachments)) {
      postData.attachments.forEach(file => {
        if (file.content && file.name && file.type) {
          const checkBlob = Utilities.newBlob(Utilities.base64Decode(file.content), file.type, file.name);
          emailAttachments.push(checkBlob);
        }
      });
    }

    // 2. Construct Email Body (HTML)
    let subject = EMAIL_SUBJECT_PREFIX + formType.charAt(0).toUpperCase() + formType.slice(1);
    
    // HTML Header with Logo/Title style
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #D32F2F;">
          <img src="https://qualitytirelube.com/assets/img/logo-01.png" alt="${site}" style="max-width: 250px; height: auto;">
        </div>
        <div style="background-color: #D32F2F; padding: 15px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Form Submission</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">${site}</p>
        </div>
        
        <div style="padding: 20px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
    `;
    
    // Text version fallback
    let textBody = "New submission from " + site + "\\n";
    textBody += "Form: " + formType + "\\n";
    textBody += "Date: " + new Date().toLocaleString() + "\\n\\n";
    
    // Fields to Ignore in Table
    const ignoreKeys = ['site', 'site_domain', 'form_type', 'timestamp', 'page_url', 'attachments', 'raw_data'];
    
    // Add specific fields first for order
    const priorityFields = ['name', 'email', 'phone', 'message'];
    
    let isAlternate = false;
    
    // Helper to add row
    function addRow(key, value) {
      if (!value) return;
      let displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      let rowBg = isAlternate ? "#f9f9f9" : "#ffffff";
      
      htmlBody += `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #eeeeee;">
          <td style="padding: 12px; font-weight: bold; color: #333333; width: 30%;">${displayKey}</td>
          <td style="padding: 12px; color: #555555; white-space: pre-wrap;">${value}</td>
        </tr>
      `;
      
      textBody += `${displayKey}: ${value}\n`;
      isAlternate = !isAlternate;
    }
    
    // 1. Add Priority Fields
    priorityFields.forEach(key => {
        if (postData[key]) {
            addRow(key, postData[key]);
        }
    });
    
    // 2. Add Remaining Fields
    for (const key in postData) {
        if (!ignoreKeys.includes(key) && !priorityFields.includes(key)) {
            addRow(key, postData[key]);
        }
    }

    // Close HTML
    htmlBody += `
          </table>
          <div style="margin-top: 25px; font-size: 12px; color: #999999; text-align: center; border-top: 1px solid #eeeeee; padding-top: 15px;">
            Submitted on ${new Date().toLocaleString()}<br>
            Page: <a href="${postData.page_url}" style="color: #D32F2F;">${postData.page_url}</a>
          </div>
        </div>
      </div>
    `;
    
    textBody += "\n----------------------------------------\n";
    textBody += "Page: " + (postData.page_url || "Unknown");

    // 4. Send Email
    MailApp.sendEmail({
      to: EMAIL_RECIPIENT,
      subject: subject,
      htmlBody: htmlBody,
      body: textBody, // Fallback
      attachments: emailAttachments
    });

    // 5. Return JSON Success
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "success", 
      "message": "Email sent successfully" 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
