// Wait for Firebase to be fully initialized before loading pricing
function initPricingLoader() {
  // Check if Firebase is ready
  if (typeof firebase === "undefined" || !firebase.apps || firebase.apps.length === 0) {
    console.log("Waiting for Firebase to initialize...");
    setTimeout(initPricingLoader, 100);
    return;
  }

  const db = firebase.firestore();

  // First try to load the page structure (new format with ordering)
  db.collection("pricing_page").doc("structure").get()
    .then((structureDoc) => {
      if (structureDoc.exists) {
        console.log("Found page structure, using new format...");
        renderFromStructure(structureDoc.data());
      } else {
        console.log("No page structure found, falling back to legacy format...");
        loadLegacyPricing(db);
      }
    })
    .catch((err) => {
      console.error("Error loading page structure, falling back:", err);
      loadLegacyPricing(db);
    });
}

// Render from new page structure format (preserves ordering)
function renderFromStructure(pageData) {
  if (!pageData.columns || pageData.columns.length === 0) {
    console.log("No columns in structure, keeping static HTML");
    return;
  }

  console.log("Rendering", pageData.columns.length, "columns from structure");

  // Generate HTML for each column
  let columnsHtml = pageData.columns.map(col => {
    const isDark = col.theme === 'dark';
    
    if (isDark) {
      return renderDarkColumn(col);
    } else {
      return renderLightColumn(col);
    }
  }).join('');

  // Build the wrapper
  let newHtml = `
  <div class="dynamic-pricing-wrapper" style="display: flex; flex-direction: row; justify-content: center; align-items: stretch; gap: 20px; flex-wrap: wrap; padding: 20px 0;">
    ${columnsHtml}
  </div>`;

  injectPricing(newHtml);
}

// Render a light-themed column
function renderLightColumn(col) {
  let sectionsHtml = col.sections.map(sec => {
    if (sec.items.length === 0) return '';
    
    const hasHeader = sec.name || sec.subtitle;
    
    let sectionHtml = '';
    if (hasHeader) {
      sectionHtml += `
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">
          <span style="font-weight: bold; text-transform: uppercase; font-size: 0.95em;">${sec.name || ''}</span>
          ${sec.subtitle ? `<span style="font-size: 0.85em; color: #666;">${sec.subtitle}</span>` : ''}
        </div>`;
    }
    
    sectionHtml += `
      <table style="width:100%; margin-bottom: 20px;"><tbody>
        ${sec.items.map(item => `
          <tr>
            <td style="text-align: left; padding:5px 0; font-size: 0.95em;">${item.name}</td>
            <td style="text-align:right; font-weight:bold; font-size: 0.95em;">${item.price}</td>
          </tr>`).join('')}
      </tbody></table>`;
    
    return `<div style="margin-bottom: 15px;">${sectionHtml}</div>`;
  }).join('');

  return `
    <div class="pricing-col" style="flex: 1; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); padding: 25px;">
      <h3 style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${col.title}</h3>
      ${sectionsHtml}
    </div>`;
}

// Render a dark-themed column (like Brakes)
function renderDarkColumn(col) {
  let sectionsHtml = col.sections.map(sec => {
    if (sec.items.length === 0) return '';
    
    const hasHeader = sec.name || sec.subtitle;
    
    let sectionHtml = '';
    if (hasHeader) {
      sectionHtml += `
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px; margin-bottom: 10px;">
          <span style="font-weight: bold; text-transform: uppercase; font-size: 0.95em; color: #fff;">${sec.name || ''}</span>
          ${sec.subtitle ? `<span style="font-size: 0.85em; color: #ccc;">${sec.subtitle}</span>` : ''}
        </div>`;
    }
    
    sectionHtml += `
      <table style="width:100%; border-collapse: collapse; margin-bottom: 15px;"><tbody>
        ${sec.items.map(item => {
          if (!item.price || item.price.trim() === '') {
            return `<tr><td colspan="2" style="text-align: left; padding: 2px 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ddd; font-size: 0.9em;">${item.name}</td></tr>`;
          }
          return `
            <tr>
              <td style="text-align: left; padding: 12px 0 2px 0; color: #fff; font-size: 1.1em;">${item.name}</td>
              <td style="text-align: right; padding: 12px 0 2px 0; font-weight: bold; color: #fff; font-size: 1.1em;">${item.price}*</td>
            </tr>`;
        }).join('')}
      </tbody></table>`;
    
    return sectionHtml;
  }).join('');

  let footerHtml = '';
  if (col.footer) {
    footerHtml += `<div style="margin-top: 25px; text-align: center; color: white; font-size: 0.8em; font-style: italic; opacity: 0.8;">${col.footer}</div>`;
  }
  if (col.showLogo) {
    footerHtml += `<div style="margin-top: 20px; text-align: center;">
      <img src="../assets/img/technet-warranty-logo.png" style="max-width: 150px; opacity: 0.9;" alt="TechNet Warranty">
    </div>`;
  }

  return `
    <div class="pricing-col" style="flex: 1; min-width: 300px; background: url('../assets/img/pricing-technet-bg-cl-01.jpg') #1a1a1a; background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
      <div style="background: rgba(0,0,0,0.7); flex: 1; padding: 25px; display: flex; flex-direction: column; align-items: center;">
        <h3 style="color: white; border-bottom: 2px solid white; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">${col.title}</h3>
        ${sectionsHtml}
        ${footerHtml}
      </div>
    </div>`;
}

// Inject the generated HTML into the page
function injectPricing(newHtml) {
  const main = document.getElementById("page-content");
  if (main) {
    const pricingWrapper = main.querySelector(".w-hwrapper.pr-wrap");
    
    if (pricingWrapper) {
      console.log("Found pricing wrapper, replacing content...");
      pricingWrapper.innerHTML = newHtml;
      console.log("Dynamic pricing rendered successfully!");
    } else {
      const oilCol = main.querySelector(".us_custom_0490361b");
      if (oilCol && oilCol.parentElement) {
        const wrapper = oilCol.parentElement;
        wrapper.style.display = "block";
        wrapper.style.maxWidth = "100%";
        wrapper.innerHTML = newHtml;
        console.log("Dynamic pricing rendered (fallback)!");
      } else {
        console.warn("Could not find injection target for pricing");
      }
    }
  } else {
    console.warn("Could not find page-content element");
  }
}

// Legacy pricing loader (for backward compatibility)
function loadLegacyPricing(db) {
  db.collection("pricing_services")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        console.log("No pricing data in database, keeping static HTML");
        return;
      }

      console.log("Dynamic pricing data found. Rendering...", querySnapshot.size, "services");

      const services = [];
      querySnapshot.forEach((doc) => {
        services.push({ id: doc.id, ...doc.data() });
      });

      // Group by category
      const cats = { "Oil": [], "Brakes": [], "Tires": [], "General": [] };
      
      services.forEach(s => {
        let c = s.category || "General";
        if (!cats[c]) cats[c] = [];
        cats[c].push(s);
      });

      // Sort each category alphabetically
      Object.keys(cats).forEach(key => {
        cats[key].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Helper to render rows for light columns
      const genRows = (list) => list.map(s => `
        <tr>
          <td style="text-align: left; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">${s.name}</td>
          <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-weight: bold;">${s.price}</td>
        </tr>`).join('');

      // Helper to render dark rows
      const genRowsDark = (list) => list.map(s => {
        if (!s.price || s.price.trim() === '') {
          return `<tr><td colspan="2" style="text-align: left; padding: 2px 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #ddd; font-size: 0.9em;">${s.name}</td></tr>`;
        }
        return `
          <tr>
            <td style="text-align: left; padding: 12px 0 2px 0; color: #fff; font-size: 1.1em;">${s.name}</td>
            <td style="text-align: right; padding: 12px 0 2px 0; font-weight: bold; color: #fff; font-size: 1.1em;">${s.price}*</td>
          </tr>`;
      }).join('');

      // Oil Column - Group by keywords
      const renderOilCol = (list) => {
        const groups = {
          "FULL SYNTHETIC": [],
          "DIESEL OIL CHANGE": [],
          "WIPER BLADES": []
        };

        list.forEach(s => {
          const upperName = s.name.toUpperCase();
          
          if (upperName.includes("MOBIL") || upperName.includes("MOBILE") || 
              (upperName.includes("SYNTHETIC") && !upperName.includes("DIESEL"))) {
            groups["FULL SYNTHETIC"].push(s);
          }
          else if (upperName.includes("DIESEL") || upperName.includes("DELVAC") || 
                   upperName.includes("ROTELLA") || upperName.includes("DEL VAC")) {
            groups["DIESEL OIL CHANGE"].push(s);
          }
          else if (upperName.includes("WIPER") || upperName.includes("BLADE")) {
            groups["WIPER BLADES"].push(s);
          }
        });

        const renderGroup = (title, items, subtitle) => {
          if (!items || items.length === 0) return '';
          return `
            <div style="margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">
                <span style="font-weight: bold; text-transform: uppercase; font-size: 0.95em;">${title}</span>
                ${subtitle ? `<span style="font-size: 0.85em; color: #666;">${subtitle}</span>` : ''}
              </div>
              <table style="width:100%;"><tbody>
                ${items.map(s => `
                  <tr>
                    <td style="text-align: left; padding:5px 0; font-size: 0.95em;">${s.name}</td>
                    <td style="text-align:right; font-weight:bold; font-size: 0.95em;">${s.price}</td>
                  </tr>`).join('')}
              </tbody></table>
            </div>`;
        };

        let html = '';
        html += renderGroup("FULL SYNTHETIC", groups["FULL SYNTHETIC"], "5QTs");
        html += renderGroup("DIESEL OIL CHANGE", groups["DIESEL OIL CHANGE"], "10/QT");
        html += renderGroup("WIPER BLADES", groups["WIPER BLADES"], "");
        
        return html;
      };

      // Build 3-column layout
      let newHtml = `
      <div class="dynamic-pricing-wrapper" style="display: flex; flex-direction: row; justify-content: center; align-items: stretch; gap: 20px; flex-wrap: wrap; padding: 20px 0;">
        
        <div class="pricing-col" style="flex: 1; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); padding: 25px;">
          <h3 style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">OIL</h3>
          ${renderOilCol(cats['Oil'].concat(cats['General']))}
        </div>

        <div class="pricing-col" style="flex: 1; min-width: 300px; background: url('../assets/img/pricing-technet-bg-cl-01.jpg') #1a1a1a; background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: rgba(0,0,0,0.7); flex: 1; padding: 25px; display: flex; flex-direction: column; align-items: center;">
            <h3 style="color: white; border-bottom: 2px solid white; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">BRAKES</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: auto;">
              <tbody>${genRowsDark(cats['Brakes'])}</tbody>
            </table>
            <div style="margin-top: 25px; text-align: center; color: white; font-size: 0.8em; font-style: italic; opacity: 0.8;">*PRICES FOR MOST CARS/TRUCKS</div>
            <div style="margin-top: 20px; text-align: center;">
              <img src="../assets/img/technet-warranty-logo.png" style="max-width: 150px; opacity: 0.9;" alt="TechNet Warranty"> 
            </div>
          </div>
        </div>

        <div class="pricing-col" style="flex: 1; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); padding: 25px;">
          <h3 style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">TIRES</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>${genRows(cats['Tires'])}</tbody>
          </table>
        </div>

      </div>`;

      injectPricing(newHtml);
    })
    .catch((err) => {
      console.error("Error loading pricing:", err);
    });
}

// Start after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initPricingLoader);
} else {
  initPricingLoader();
}
