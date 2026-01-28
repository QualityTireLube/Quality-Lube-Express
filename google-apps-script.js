/**
 * Google Apps Script for Quality Lube Express Form Handling
 * 
 * Instructions:
 * 1. Go to https://script.google.com/
 * 2. Open your existing project (linked in assets/js/form-handler.js) OR Create a New Project
 * 3. Paste this code into Code.gs (replacing existing code)
 * 4. Save
 * 5. Deploy -> New Deployment -> Web App -> "Me" -> "Anyone" -> Deploy
 * 6. Update the URL in assets/js/form-handler.js if you created a NEW project.
 */

// CONFIGURATION
const EMAIL_RECIPIENT = "qualitylubezachary@gmail.com"; // Change to correct email
const EMAIL_SUBJECT_PREFIX = "[Quality Lube Web Form] ";

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    
    // Default Values
    const site = postData.site || "Quality Lube Express";
    const formName = postData.form_name || postData.form_id || "Unknown Form";
    const fields = postData.fields || {};
    
    // 3. Construct Email Body (HTML)
    let subject = EMAIL_SUBJECT_PREFIX + formName;
    
    // HTML Header with Logo/Title style
    // Using Red/Dark theme for Quality Lube
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
        <div style="background-color: #D32F2F; padding: 20px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0;">${site}</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">New Form Submission: ${formName}</p>
        </div>
        
        <div style="padding: 20px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
    `;
    
    // Text Body fallback
    let textBody = "";
    textBody += "New submission from " + site + "\n";
    textBody += "Form: " + formName + "\n";
    textBody += "Date: " + new Date().toLocaleString() + "\n";
    textBody += "----------------------------------------\n\n";
    
    // Add all dynamic fields
    // Filter out internal fields if flattened
    const internalFields = ['site', 'form_id', 'form_name', 'timestamp', 'page_url', 'fields', 'spam_check'];
    
    // Handle both nested 'fields' and flattened structure
    let displayFields = {};
    if (Object.keys(fields).length > 0) {
      displayFields = fields;
    } else {
       for (const key in postData) {
        if (internalFields.indexOf(key) === -1) {
          displayFields[key] = postData[key];
        }
      }
    }

    let isAlternate = false;
    for (const key in displayFields) {
      let value = displayFields[key];
      let rowBg = isAlternate ? "#f9f9f9" : "#ffffff";
      
      // HTML Row
      htmlBody += `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #eeeeee;">
          <td style="padding: 12px; font-weight: bold; color: #333333; width: 40%;">${key}</td>
          <td style="padding: 12px; color: #555555;">${value}</td>
        </tr>
      `;
      
      // Text Row
      textBody += key + ": " + value + "\n";
      
      isAlternate = !isAlternate;
    }
    
    htmlBody += `
          </table>
          
          <div style="margin-top: 25px; font-size: 12px; color: #999999; text-align: center; border-top: 1px solid #eeeeee; padding-top: 15px;">
            Submitted on ${new Date().toLocaleString()}<br>
            Page: <a href="${postData.page_url}" style="color: #D32F2F;">${postData.page_url || "Unknown"}</a>
          </div>
        </div>
      </div>
    `;

    textBody += "\n----------------------------------------\n";
    textBody += "Submitted from: " + (postData.page_url || "Unknown URL");
    
    // 4. Send Email
    // Prefer the 'Email' field for Reply-To if it exists
    const replyTo = displayFields['Email'] || displayFields['email'] || postData.email;
    const options = {
      htmlBody: htmlBody
    };
    if (replyTo && replyTo.includes('@')) {
      options.replyTo = replyTo;
    }
    
    MailApp.sendEmail({
      to: EMAIL_RECIPIENT,
      subject: subject,
      body: textBody, 
      htmlBody: htmlBody,
      replyTo: options.replyTo
    });
    
    // 5. Return Success JSON
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Quality Lube Form Handler is active.");
}
