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

      // Helper to generate rows
      const genRows = (list) => list.map(s => `<tr><td style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">${s.name}</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-weight: bold;">${s.price}</td></tr>`).join('');
      const genRowsDark = (list) => list.map(s => `<tr><td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2); color: #fff;">${s.name}</td><td style="text-align: right; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold; color: #fff;">${s.price}</td></tr>`).join('');

      let newHtml = `
      <div class="dynamic-pricing-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 1200px; margin: 0 auto; padding: 20px;">
        
        <!-- Left Card (Oil) -->
        <div class="pricing-card" style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); flex: 1; min-width: 300px;">
           <table style="width: 100%; border-collapse: collapse;">
             <tbody>
                ${genRows(cats['Oil'])}
                ${genRows(cats['General'])}
             </tbody>
           </table>
        </div>

        <!-- Center Card (Brakes - Dark) -->
        <div class="pricing-card-dark" style="background: url('../assets/img/stats.aspx') #1a1a1a; background-size: cover; border-radius: 4px; padding: 0; flex: 1; min-width: 300px; position: relative; display: flex; flex-direction: column;">
            <div style="background: rgba(0,0,0,0.8); padding: 25px; height: 100%; display: flex; flex-direction: column; align-items: center;">
                <h3 style="color: white; border-bottom: 2px solid white; padding-bottom: 10px; margin-bottom: 20px;">Brakes</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: auto;">
                    <tbody>
                        ${genRowsDark(cats['Brakes'])}
                    </tbody>
                </table>
                <div style="margin-top: 20px; text-align: center; color: white; font-size: 0.9em; font-style: italic;">*PRICES FOR MOST CARS/TRUCKS</div>
                <div style="margin-top: 20px; text-align: center;">
                    <img src="../assets/img/logo-01.png" style="max-width: 150px; filter: brightness(0) invert(1);"> 
                </div>
            </div>
        </div>

        <!-- Right Card (Tires) -->
        <div class="pricing-card" style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); flex: 1; min-width: 300px;">
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
