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

          if(groups["FULL SYNTHETIC"].length > 0) {
              html += `<table style="width:100%; margin-bottom: 25px;"><tbody>
                <tr><td style="text-transform:uppercase; padding: 5px 0;">FULL SYNTHETIC</td><td style="text-align:right;">5QTs</td></tr>
                <tr><td colspan="2"><hr style="margin: 5px 0; border-color: #eee;"></td></tr>
                ${groups["FULL SYNTHETIC"].map(s => `<tr><td style="padding:5px 0;">${s.name}</td><td style="text-align:right; font-weight:bold;">${s.price}</td></tr>`).join('')}
              </tbody></table>`;
          }

          if(groups["DIESEL OIL CHANGE"].length > 0) {
              html += `<table style="width:100%; margin-bottom: 25px;"><tbody>
                <tr><td style="text-transform:uppercase; padding: 5px 0;">DIESEL OIL CHANGE</td><td style="text-align:right;">10/QT</td></tr>
                <tr><td colspan="2"><hr style="margin: 5px 0; border-color: #eee;"></td></tr>
                ${groups["DIESEL OIL CHANGE"].map(s => `<tr><td style="padding:5px 0;">${s.name}</td><td style="text-align:right; font-weight:bold;">${s.price}</td></tr>`).join('')}
              </tbody></table>`;
          }

           if(groups["WIPER BLADES"].length > 0) {
              html += `<table style="width:100%; margin-bottom: 10px;"><tbody>
                ${groups["WIPER BLADES"].map(s => `<tr><td style="text-transform:uppercase; padding:5px 0;">${s.name}</td><td style="text-align:right; font-weight:bold;">${s.price}</td></tr>`).join('')}
              </tbody></table>`;
          }
          
          return html;
      };

      let newHtml = `
      <div class="dynamic-pricing-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 1200px; margin: 0 auto; padding: 20px;">
        
        <!-- Left Card (Oil) -->
        <div class="pricing-card" style="background: white; border-radius: 15px; padding: 25px 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); flex: 1; min-width: 300px;">
           ${renderOilCol(cats['Oil'])}
        </div>

        <!-- Center Card (Brakes - Dark) -->
        <div class="pricing-card-dark" style="background: url('../assets/img/pricing-technet-bg-cl-01.jpg') #1a1a1a; background-size: cover; border-radius: 4px; padding: 0; flex: 1; min-width: 300px; position: relative; display: flex; flex-direction: column;">
            <div style="background: rgba(0,0,0,0.6); padding: 25px 30px; height: 100%; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 100%; text-align: center; border-bottom: 1px solid white; margin-bottom: 20px;">
                    <h3 style="color: white; margin: 0 auto; padding-bottom: 5px; display: inline-block; border-bottom: 3px solid white; margin-bottom: -2px;">Brakes</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: auto;">
                    <tbody>
                        ${genRowsDark(cats['Brakes'])}
                    </tbody>
                </table>
                <div style="margin-top: 20px; text-align: center; color: white; font-size: 0.85em; font-weight: bold; font-style: italic; letter-spacing: 1px;">*PRICES FOR MOST CARS/TRUCKS</div>
                <div style="margin-top: 30px; text-align: center;">
                     <img src="../assets/img/technet-warranty-logo.png" style="max-width: 180px;"> 
                </div>
            </div>
        </div>

        <!-- Right Card (Tires) -->
        <div class="pricing-card" style="background: white; border-radius: 15px; padding: 25px 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); flex: 1; min-width: 300px;">
           <table style="width: 100%; border-collapse: collapse;">
             <tbody>
                ${genRows(cats['Tires'])}
             </tbody>
           </table>
        </div>

      </div>`;

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
