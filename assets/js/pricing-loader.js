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

      // Build new HTML structure - 3 Column Layout
      
      const cats = { "Oil": [], "Brakes": [], "Tires": [], "General": [] };
      
      services.forEach(s => {
          let c = s.category || "General";
          if(!cats[c]) cats[c] = [];
          cats[c].push(s);
      });

      // Helper to generate rows for Center/Right
      const genRows = (list) => list.map(s => `<tr><td style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">${s.name}</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-weight: bold;">${s.price}</td></tr>`).join('');
      const genRowsDark = (list) => list.map(s => {
          // If description row (empty price or trimmed empty)
          if (!s.price || s.price.trim() === '') {
              return `<tr><td colspan="2" style="padding: 2px 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ddd; font-size: 0.9em;">${s.name}</td></tr>`;
          }
          return `<tr><td style="padding: 12px 0 2px 0; color: #fff; font-size: 1.1em;">${s.name}</td><td style="text-align: right; padding: 12px 0 2px 0; font-weight: bold; color: #fff; font-size: 1.1em;">${s.price}</td></tr>`;
      }).join('');

      // Formatter for Left Col (Oil Layout with headers)
      const renderOilCol = (list) => {
          let html = '';
          // Group by manual logic based on known names
          const groups = {
            "FULL SYNTHETIC": list.filter(s => s.name.includes("Mobil") || s.name.includes("MOBILE")),
            "DIESEL OIL CHANGE": list.filter(s => s.name.toUpperCase().includes("DELVAC")),
            "WIPER BLADES": list.filter(s => s.name.toUpperCase().includes("WIPER"))
          };

          // Helper for sub-tables
          const renderGroup = (title, items, subtitle) => {
              if(!items || items.length === 0) return '';
              return `
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">
                        <span style="font-weight: bold; text-transform: uppercase; font-size: 0.95em;">${title}</span>
                        ${subtitle ? `<span style="font-size: 0.85em; color: #666;">${subtitle}</span>` : ''}
                    </div>
                    <table style="width:100%;"><tbody>
                        ${items.map(s => `<tr><td style="padding:5px 0; font-size: 0.95em;">${s.name}</td><td style="text-align:right; font-weight:bold; font-size: 0.95em;">${s.price}</td></tr>`).join('')}
                    </tbody></table>
                </div>`;
          };

          html += renderGroup("FULL SYNTHETIC", groups["FULL SYNTHETIC"], "5QTs");
          html += renderGroup("DIESEL OIL CHANGE", groups["DIESEL OIL CHANGE"], "10/QT");
          html += renderGroup("WIPER BLADES", groups["WIPER BLADES"], "");
          
          return html;
      };

      let newHtml = `
      <div class="dynamic-pricing-wrapper" style="display: flex; flex-direction: row; justify-content: center; align-items: stretch; gap: 20px; flex-wrap: wrap; padding: 20px 0;">
        
           <!-- Left Column: Oil & Wipers -->
           <div class="pricing-col" style="flex: 1; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); padding: 25px;">
                <h3 style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Oil & Lube</h3>
                ${renderOilCol(cats['Oil'])}
           </div>

           <!-- Middle Column: Brakes (Dark) -->
           <div class="pricing-col" style="flex: 1; min-width: 300px; background: url('../assets/img/pricing-technet-bg-cl-01.jpg') #1a1a1a; background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
                <div style="background: rgba(0,0,0,0.7); flex: 1; padding: 25px; display: flex; flex-direction: column; align-items: center;">
                    <h3 style="color: white; border-bottom: 2px solid white; padding-bottom: 10px; margin-bottom: 20px;">Brakes</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: auto;">
                        <tbody>
                            ${genRowsDark(cats['Brakes'])}
                        </tbody>
                    </table>

                    <div style="margin-top: 25px; text-align: center; color: white; font-size: 0.8em; font-style: italic; opacity: 0.8;">*PRICES FOR MOST CARS/TRUCKS</div>
                    <div style="margin-top: 20px; text-align: center;">
                        <img src="../assets/img/technet-warranty-logo.png" style="max-width: 150px; opacity: 0.9;"> 
                    </div>
                </div>
           </div>

           <!-- Right Column: Tires -->
           <div class="pricing-col" style="flex: 1; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); padding: 25px;">
               <h3 style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Tires & Services</h3>
               <table style="width: 100%; border-collapse: collapse;">
                 <tbody>
                    ${genRows(cats['Tires'])}
                 </tbody>
               </table>
           </div>

      </div>`;

      // Injection Logic - Clean Sweep of Old Tables
      const main = document.getElementById("page-content");
      if (main) {
        // Find ALL sections that might contain old pricing tables
        // Targeting specific class seen in HTML: .us_custom_0490361b
        // Also targeting generic wrappers if the specific class isn't unique enough
        
        const targets = main.querySelectorAll(".us_custom_0490361b, .wpb_text_column table");
        let injected = false;

        // Strategy: Empty ALL found targets. Inject content into the first valid container found.
        
        // 1. Identify the container we want to use (First match)
        let primaryContainer = main.querySelector(".us_custom_0490361b");
        
        // Fallback: search for any wpb content wrapper with a table
        if (!primaryContainer) {
             const tables = main.querySelectorAll("table");
             if(tables.length > 0) primaryContainer = tables[0].closest(".wpb_wrapper") || tables[0].closest(".wpb_text_column");
        }

        // 2. Clear known "Old Price" areas
        // We iterate specifically over the class matches to clear them out
        main.querySelectorAll(".us_custom_0490361b").forEach(el => el.innerHTML = "");

        // 3. Inject into Primary
        if (primaryContainer) {
            // If we just cleared it, it's empty, perfect.
            primaryContainer.innerHTML = newHtml;
            injected = true;
        } else {
            console.warn("Could not find specific container to replace. Appending to main.");
            // Last resort
            main.innerHTML = newHtml + main.innerHTML; // Prepend? Or append?
        }
      }
    })
    .catch((err) => {
      console.error("Error loading pricing:", err);
    });
});
