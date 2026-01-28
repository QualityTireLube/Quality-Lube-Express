document.addEventListener("DOMContentLoaded", function () {
  if (typeof firebase === "undefined") return;

  // Ensure Firestore is initialized
  // Note: firebase-init.js initializes 'app', but we need to ensure firestore is accessed from that app
  const db = firebase.firestore();

  db.collection("pricing_services")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) return; // Keep default static HTML if no DB data

      console.log("Dynamic pricing data found. Rendering...");

      const services = [];
      querySnapshot.forEach((doc) => {
        services.push(doc.data());
      });

      // Sort By Name
      services.sort((a, b) => a.name.localeCompare(b.name));

      // Build new HTML structure - Flat List
      let newHtml =
        '<div class="dynamic-pricing-section" style="max-width: 1200px; margin: 0 auto;">';

      // Mimic the wpb_text_column tables
      newHtml += `<div class="wpb_text_column wpb_content_element" style="margin-bottom: 25px;">
         <div class="wpb_wrapper">
         <table style="width: 100%;">
         <tbody>`;

      services.forEach((s) => {
        newHtml += `
         <tr>
             <td>${s.name}</td>
             <td>${s.price}</td>
         </tr>`;
      });

      newHtml += `</tbody></table></div></div></div>`;

      // Injection Logic
      const main = document.getElementById("page-content");
      if (main) {
        // Try to find the container of the tables to replace precisely
        // In pricing/index.html, tables are inside .wpb_text_column, inside .vc_col-sm-12
        // We'll target the main specific section
        const priceSection =
          main.querySelector(".us_custom_0490361b") ||
          main.querySelector("table")?.closest(".wpb_wrapper");

        if (priceSection) {
          priceSection.innerHTML = newHtml; // Replace content strictly
        } else {
          // Fallback
          const existingTables = main.querySelectorAll("table");
          if (existingTables.length > 0) {
            const container = existingTables[0].closest(".wpb_wrapper");
            if (container) container.innerHTML = newHtml;
          }
        }
      }
    })
    .catch((err) => {
      console.error("Error loading pricing:", err);
    });
});
