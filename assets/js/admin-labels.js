/**
 * Label System for Quality Tire Admin Dashboard
 * Ported from Inspectionapp (React/TypeScript) to vanilla JS
 * 
 * Features:
 * - Label Template Manager (CRUD, Active/Archived tabs)
 * - Label Editor (drag-and-drop visual template editor)
 * - Label Creator (template selection, form fill, real-time preview)
 * - PDF Generator (pdf-lib based, accurate label PDFs)
 * - Print Client Integration (autoflopro.com print queue)
 * - Label Settings (defaults, stats, printer management)
 */

// ============================================================
// CONSTANTS & DATA
// ============================================================

const PAPER_SIZES = {
  '29mmx90mm':       { name: 'Brother DK1201 (90×29mm)', width: 90, height: 29, unit: 'mm' },
  'Brother-QL800':   { name: 'Brother QL-800 (62×29mm)', width: 62, height: 29, unit: 'mm' },
  'Dymo-TwinTurbo':  { name: 'Dymo Twin Turbo (89×36mm)', width: 89, height: 36, unit: 'mm' },
  'Dymo-30252':      { name: 'Dymo 30252 (89×28mm)', width: 89, height: 28, unit: 'mm' },
  'Brother-DK2205':  { name: 'Brother DK-2205 (62mm cont.)', width: 62, height: 100, unit: 'mm' },
  'Zebra-2x1':       { name: 'Zebra 2×1" (51×25mm)', width: 51, height: 25, unit: 'mm' }
};

const DEFAULT_PAPER_SIZE = '29mmx90mm';

// Map physical CUPS printer names to their default paper size key
const PRINTER_DEFAULTS = {
  'Brother_QL_800':                  { paperSize: '29mmx90mm',      label: 'Brother QL-800 (#1)' },
  'Brother_QL_800_2':                { paperSize: '29mmx90mm',      label: 'Brother QL-800 (#2)' },
  'GODEX':                           { paperSize: 'GODEX',          label: 'GODEX' },
  'Canon_TS3500_series':             { paperSize: null,             label: 'Canon TS3500 (full page)' },
  'HP_LaserJet_400_M401n__B429A7_':  { paperSize: null,             label: 'HP LaserJet 400 M401n' },
  'HP_LaserJet_Pro_M118_M119':       { paperSize: null,             label: 'HP LaserJet Pro M118/M119' }
};

const AVAILABLE_FIELDS = [
  'Label Name',
  'Created By',
  'Created Date',
  'Invoice #',
  'Tire Size',
  'Part Number',
  'Vendor Part Number',
  'Vendor',
  'Vendor Invoice Number',
  'Bin/Location',
  'Copies to be Printed'
];

function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function inchesToPixels(inches) {
  return Math.round(inches * 96);
}

function createField(name, yPosition) {
  return {
    id: generateId(),
    name: name,
    position: { x: 10, y: yPosition },
    fontSize: 10,
    fontFamily: 'Arial',
    textAlign: 'left',
    color: '#000000',
    value: name,
    rotation: 0,
    showInForm: true
  };
}

const CUSTOM_PAPER_SIZE = {
  width: inchesToPixels(3.5),  // 336
  height: inchesToPixels(1.1)  // 106
};

// Predefined templates
function getPredefinedTemplates() {
  return [
    // TIRE TEMPLATES
    {
      id: generateId(), labelName: 'Tire Check-In',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Invoice #', 55), createField('Tire Size', 75), createField('Copies to be Printed', 95)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Tires Restock',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Tire Size', 55), createField('Bin/Location', 75), createField('Copies to be Printed', 95)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Tire Completed',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Invoice #', 55), createField('Tire Size', 75), createField('Copies to be Printed', 95)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Tire Warranty',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Invoice #', 55), createField('Tire Size', 75), createField('Copies to be Printed', 95)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Tire Return',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Tire Size', 55), createField('Copies to be Printed', 75)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    // PARTS TEMPLATES
    {
      id: generateId(), labelName: 'Parts Check-In',
      fields: [createField('Created By', 10), createField('Created Date', 25), createField('Invoice #', 40), createField('Part Number', 55), createField('Vendor Part Number', 70), createField('Copies to be Printed', 85)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Parts Restock',
      fields: [createField('Created By', 10), createField('Created Date', 25), createField('Part Number', 40), createField('Vendor Part Number', 55), createField('Bin/Location', 70), createField('Copies to be Printed', 85)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Parts Warranty',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Invoice #', 55), createField('Part Number', 75), createField('Vendor', 95), createField('Copies to be Printed', 115)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Parts Return',
      fields: [createField('Created By', 15), createField('Created Date', 35), createField('Invoice #', 55), createField('Part Number', 75), createField('Vendor', 95)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    },
    {
      id: generateId(), labelName: 'Parts Core Return',
      fields: [createField('Created By', 10), createField('Created Date', 25), createField('Part Number', 40), createField('Vendor Invoice Number', 55), createField('Vendor', 70), createField('Copies to be Printed', 85)],
      paperSize: DEFAULT_PAPER_SIZE, width: CUSTOM_PAPER_SIZE.width, height: CUSTOM_PAPER_SIZE.height,
      copies: 1, archived: false, createdBy: 'System', createdDate: new Date().toISOString()
    }
  ];
}

// ============================================================
// PDF GENERATOR (using pdf-lib from CDN)
// ============================================================

const LabelPdfGenerator = {
  async generateLabelPdf(template, labelData, copies) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const paperConfig = PAPER_SIZES[template.paperSize];
    if (!paperConfig) throw new Error('Unknown paper size: ' + template.paperSize);

    const mmToPoints = (mm) => mm * 2.834645669;
    const pageWidth = mmToPoints(paperConfig.width);
    const pageHeight = mmToPoints(paperConfig.height);

    copies = copies || 1;

    for (let copy = 0; copy < copies; copy++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      for (const field of template.fields) {
        const value = this.getFieldValue(field, labelData);
        if (!value) continue;

        const canvasWidth = 400;
        const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);
        const scaleX = pageWidth / canvasWidth;
        const scaleY = pageHeight / canvasHeight;

        const selectedFont = (field.fontFamily && (field.fontFamily.includes('bold') || field.fontFamily.includes('Bold')))
          ? boldFont : font;

        const fontSize = field.fontSize || 10;
        const textWidth = selectedFont.widthOfTextAtSize(value, fontSize);

        let x = field.position.x * scaleX;
        switch (field.textAlign) {
          case 'center': x = x - (textWidth / 2); break;
          case 'right': x = x - textWidth; break;
        }

        const y = pageHeight - (field.position.y * scaleY) - fontSize;

        const rotation = field.rotation || 0;
        const rotateRadians = (rotation * Math.PI) / 180;

        page.drawText(value, {
          x, y,
          size: fontSize,
          font: selectedFont,
          color: this.parseColor(field.color || '#000000'),
          rotate: PDFLib.degrees(rotation)
        });
      }
    }

    return await pdfDoc.save();
  },

  async generatePreviewImage(template, labelData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const paperConfig = PAPER_SIZES[template.paperSize];
    const canvasWidth = 400;
    const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    for (const field of template.fields) {
      const value = this.getFieldValue(field, labelData);
      if (!value) continue;

      ctx.save();
      ctx.font = (field.fontSize || 10) + 'px ' + (field.fontFamily || 'Arial');
      ctx.fillStyle = field.color || '#000000';
      ctx.textAlign = field.textAlign || 'left';
      if (field.rotation) {
        ctx.translate(field.position.x, field.position.y + (field.fontSize || 10));
        ctx.rotate((field.rotation * Math.PI) / 180);
        ctx.fillText(value, 0, 0);
      } else {
        ctx.fillText(value, field.position.x, field.position.y + (field.fontSize || 10));
      }
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  },

  getFieldValue(field, labelData) {
    if (labelData[field.name]) return labelData[field.name];
    if (field.value) return field.value;
    return this.getSampleValue(field.name);
  },

  getSampleValue(fieldName) {
    const samples = {
      'Label Name': 'Sample Label',
      'Created By': 'John Doe',
      'Created Date': new Date().toLocaleDateString(),
      'Invoice #': 'INV-2024-001',
      'Tire Size': '225/65R17',
      'Part Number': 'PN-123456',
      'Vendor Part Number': 'VPN-789',
      'Vendor': 'ABC Supply Co.',
      'Vendor Invoice Number': 'VI-2024-001',
      'Bin/Location': 'A1-B2',
      'Copies to be Printed': '1'
    };
    return samples[fieldName] || fieldName;
  },

  parseColor(colorString) {
    const hex = colorString.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return PDFLib.rgb(r, g, b);
  },

  downloadPdf(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'label.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  openPdfInNewTab(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};

// ============================================================
// MAIN LABEL SYSTEM
// ============================================================

const LabelSystem = {
  // State
  templates: [],
  currentView: 'manager',
  currentLsTab: 'stickers', // new tab system
  editorTemplate: null,       // template being edited (null = new)
  editorFields: [],
  editorSelectedField: null,
  creatorSelectedTemplate: null,
  creatorLabelData: {},
  creatorTireSizeFormat: 'metric',
  printClientConnected: false,
  printClientPrinters: [],
  dragState: null,            // for canvas field dragging
  testMode: false,            // test mode — intercepts prints, shows PDF preview instead
  testLog: [],                // test mode log entries

  // ============================================================
  // INITIALIZATION
  // ============================================================
  init() {
    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined') {
      setTimeout(() => this.init(), 200);
      return;
    }
    this.loadSettings();
    this.loadTemplates();
    this.loadTestMode();

    // Auto-connect to print server on init
    this.testPrintClientConnection();

    // Listen for labels tab showing
    document.querySelectorAll('#dashboardTabs a[data-bs-toggle="tab"]').forEach(tab => {
      tab.addEventListener('shown.bs.tab', (e) => {
        if (e.target.getAttribute('href') === '#labels-tab') {
          this.loadTemplates();
          this.testPrintClientConnection();
        }
      });
    });

    // Close any open dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.label-card-menu')) {
        document.querySelectorAll('.label-card-dropdown.show').forEach(d => d.classList.remove('show'));
      }
    });
  },

  // ============================================================
  // TEST MODE
  // ============================================================
  loadTestMode() {
    const saved = localStorage.getItem('labelTestMode');
    this.testMode = saved === 'true';
    this.syncTestModeUI();
  },

  toggleTestMode() {
    this.testMode = !this.testMode;
    localStorage.setItem('labelTestMode', this.testMode.toString());
    this.syncTestModeUI();
    if (this.testMode) {
      this.addTestLog('info', 'Test mode ENABLED. Print requests will be intercepted — printers will NOT receive jobs.');
    } else {
      this.addTestLog('info', 'Test mode DISABLED. Print requests will be sent to actual printers.');
    }
  },

  syncTestModeUI() {
    const toggle = document.getElementById('testModeToggle');
    const logPanel = document.getElementById('testLogPanel');
    const bar = document.getElementById('printClientBar');
    const printLabel = document.getElementById('creator-print-label');
    const sendLabel = document.getElementById('creator-send-label');
    const modalBanner = document.getElementById('print-modal-test-banner');

    if (this.testMode) {
      toggle.classList.add('active');
      logPanel.classList.add('active');
      bar.classList.add('test-mode');
      if (printLabel) printLabel.textContent = '🧪 Test Print';
      if (sendLabel) sendLabel.textContent = '🧪 Test Send';
      if (modalBanner) modalBanner.style.display = 'block';
    } else {
      toggle.classList.remove('active');
      logPanel.classList.remove('active');
      bar.classList.remove('test-mode');
      if (printLabel) printLabel.textContent = 'Print Label';
      if (sendLabel) sendLabel.textContent = 'Send to Print Client';
      if (modalBanner) modalBanner.style.display = 'none';
    }
  },

  addTestLog(level, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const icons = { success: '✅', warn: '⚠️', error: '❌', info: 'ℹ️' };
    const entry = { time, level, message, icon: icons[level] || 'ℹ️' };
    this.testLog.push(entry);

    const container = document.getElementById('testLogEntries');
    const div = document.createElement('div');
    div.className = 'test-log-entry ' + level;
    div.innerHTML = '<span class="log-time">[' + time + ']</span><span class="log-icon">' + entry.icon + '</span>' + this.escHtml(message);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  clearTestLog() {
    this.testLog = [];
    const container = document.getElementById('testLogEntries');
    container.innerHTML = '<div class="test-log-entry info"><span class="log-icon">ℹ️</span>Log cleared.</div>';
  },

  // ============================================================
  // FIREBASE CRUD (using compat Firestore already initialized)
  // ============================================================
  getDb() {
    return firebase.firestore();
  },

  async loadTemplates() {
    try {
      const snapshot = await this.getDb().collection('label_templates').get();
      this.templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Auto-import predefined templates if collection is empty (first-time setup)
      if (this.templates.length === 0) {
        console.log('[Labels] No templates found — auto-importing all 9 predefined templates...');
        await this.importPredefined('all', true);
        return; // importPredefined calls loadTemplates again
      }

      this.renderManager();
      this.updateStats();
      this.renderRecentTemplates();
    } catch (err) {
      console.error('Failed to load label templates:', err);
    }
  },

  async createTemplate(data) {
    const docRef = await this.getDb().collection('label_templates').add({
      ...data,
      createdDate: new Date().toISOString(),
      archived: false
    });
    return docRef.id;
  },

  async updateTemplate(id, data) {
    await this.getDb().collection('label_templates').doc(id).update({
      ...data,
      updatedDate: new Date().toISOString()
    });
  },

  async archiveTemplate(id) {
    await this.updateTemplate(id, { archived: true });
    await this.loadTemplates();
  },

  async restoreTemplate(id) {
    await this.updateTemplate(id, { archived: false });
    await this.loadTemplates();
  },

  async deleteTemplate(id) {
    if (!confirm('Are you sure you want to permanently delete this template?')) return;
    await this.getDb().collection('label_templates').doc(id).delete();
    await this.loadTemplates();
  },

  async duplicateTemplate(id) {
    const template = this.templates.find(t => t.id === id);
    if (!template) return;
    const { id: _, ...data } = template;
    data.labelName = template.labelName + ' (Copy)';
    data.createdDate = new Date().toISOString();
    data.updatedDate = null;
    await this.createTemplate(data);
    await this.loadTemplates();
  },

  // ============================================================
  // VIEW MANAGEMENT
  // ============================================================
  showView(viewName) {
    this.currentView = viewName;
    // Hide all label-view panels
    document.querySelectorAll('#labels-tab .label-view').forEach(v => v.classList.remove('active'));

    // For old views (creator, settings) — show them directly
    if (viewName === 'creator') {
      const target = document.getElementById('label-view-creator');
      if (target) target.classList.add('active');
      // Deactivate ls-tabs
      document.querySelectorAll('.ls-tab').forEach(t => t.classList.remove('active'));
      this.initCreator();
      return;
    }
    if (viewName === 'settings') {
      const target = document.getElementById('label-view-settings');
      if (target) target.classList.add('active');
      document.querySelectorAll('.ls-tab').forEach(t => t.classList.remove('active'));
      this.renderSettings();
      return;
    }

    // For new tab views - delegate to showLsTab
    if (['stickers', 'restocking', 'archived', 'templates', 'create-labels'].includes(viewName)) {
      this.showLsTab(viewName);
      return;
    }
    // Default: show templates tab
    this.showLsTab('templates');
  },

  // ===== New Tab System =====
  showLsTab(tabName) {
    this.currentLsTab = tabName;
    // Hide all label-view panels
    document.querySelectorAll('#labels-tab .label-view').forEach(v => v.classList.remove('active'));
    // Show the target panel
    const target = document.getElementById('ls-view-' + tabName);
    if (target) target.classList.add('active');

    // Update tab buttons
    document.querySelectorAll('.ls-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lsView === tabName);
    });

    // Init StickerSystem when stickers tab is shown
    if (tabName === 'stickers') {
      StickerSystem.init();
    }
    // Render Create Labels view when that tab is shown
    if (tabName === 'create-labels') {
      this.renderCreateLabelsView();
    }
    // Re-render table data
    this.renderAllTables();
  },

  // ============================================================
  // TEMPLATE TABLE RENDERING (replaces card-based renderManager)
  // ============================================================
  renderManager() {
    this.renderAllTables();
  },

  renderAllTables() {
    const active = this.templates.filter(t => !t.archived);
    const archived = this.templates.filter(t => t.archived);

    // Categorize active templates
    const restocking = active.filter(t => {
      const name = (t.labelName || '').toLowerCase();
      return name.includes('restock') || name.includes('check-in') || name.includes('checkin');
    });

    // Update tab badge counts
    const restockingCount = document.getElementById('ls-restocking-count');
    const archivedCount = document.getElementById('ls-archived-count');
    const templatesCount = document.getElementById('ls-templates-count');
    if (restockingCount) restockingCount.textContent = restocking.length;
    if (archivedCount) archivedCount.textContent = archived.length > 99 ? '99+' : archived.length;
    if (templatesCount) templatesCount.textContent = active.length;

    // Render restocking table
    this._renderTemplateTable('restocking-table-body', restocking, 'restocking-empty', false);
    // Render archived table
    this._renderTemplateTable('archived-table-body', archived, 'archived-empty', true);
    // Render all active templates table
    this._renderTemplateTable('templates-table-body', active, 'templates-empty', false);

    // Show/hide tables vs empty states
    const restockingTable = document.getElementById('restocking-table');
    if (restockingTable) restockingTable.style.display = restocking.length ? 'table' : 'none';
    const archivedTable = document.getElementById('archived-table');
    if (archivedTable) archivedTable.style.display = archived.length ? 'table' : 'none';
    const templatesTable = document.getElementById('templates-table');
    if (templatesTable) templatesTable.style.display = active.length ? 'table' : 'none';
  },

  _renderTemplateTable(tbodyId, templates, emptyId, isArchived) {
    const tbody = document.getElementById(tbodyId);
    const empty = document.getElementById(emptyId);
    if (!tbody) return;

    if (templates.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = templates.map(t => this._renderTemplateRow(t, isArchived)).join('');
  },

  _renderTemplateRow(template, isArchived) {
    const created = template.createdDate ? new Date(template.createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '\u2014';
    const createdBy = template.createdBy || '\u2014';
    const name = this.escHtml(template.labelName || 'Untitled');

    // Determine category
    const lowerName = (template.labelName || '').toLowerCase();
    let category = 'General';
    let categoryClass = 'general';
    if (lowerName.includes('tire')) { category = 'Tire'; categoryClass = 'tire'; }
    else if (lowerName.includes('part')) { category = 'Parts'; categoryClass = 'parts'; }

    const status = isArchived ? '<span class="ls-status-badge inactive">Inactive</span>' : '<span class="ls-status-badge active">Active</span>';

    // Action buttons matching screenshot style
    const editBtn = '<button class="ls-action-btn" title="Edit" onclick="event.stopPropagation(); LabelSystem.openEditor(\'' + template.id + '\')"><i class="fas fa-sliders-h"></i></button>';
    const printBtn = !isArchived ? '<button class="ls-action-btn" title="Print" onclick="event.stopPropagation(); LabelSystem.useTemplate(\'' + template.id + '\')"><i class="fas fa-print"></i></button>' : '';
    const downloadBtn = '<button class="ls-action-btn" title="Download PDF" onclick="event.stopPropagation(); LabelSystem.downloadTemplatePdf(\'' + template.id + '\')"><i class="fas fa-download"></i></button>';
    const archiveBtn = !isArchived
      ? '<button class="ls-action-btn" title="Archive" onclick="event.stopPropagation(); LabelSystem.archiveTemplate(\'' + template.id + '\')"><i class="fas fa-archive"></i></button>'
      : '<button class="ls-action-btn" title="Restore" onclick="event.stopPropagation(); LabelSystem.restoreTemplate(\'' + template.id + '\')"><i class="fas fa-undo"></i></button>';
    const deleteBtn = isArchived
      ? '<button class="ls-action-btn danger" title="Delete" onclick="event.stopPropagation(); LabelSystem.deleteTemplate(\'' + template.id + '\')"><i class="fas fa-trash"></i></button>'
      : '';

    return '<tr onclick="LabelSystem.openEditor(\'' + template.id + '\')">' +
      '<td><strong>' + name + '</strong></td>' +
      '<td><span class="ls-category-badge ' + categoryClass + '">' + category + '</span></td>' +
      '<td>' + (template.version || '1.0') + '</td>' +
      '<td>' + this.escHtml(createdBy) + '</td>' +
      '<td>' + status + '</td>' +
      '<td>' + created + '</td>' +
      '<td>' + editBtn + printBtn + downloadBtn + archiveBtn + deleteBtn + '</td>' +
    '</tr>';
  },

  // ===== Search / Filter =====
  filterRestocking(query) {
    this._filterTable('restocking-table-body', query);
  },
  filterArchived(query) {
    this._filterTable('archived-table-body', query);
  },
  filterTemplates(query) {
    this._filterTable('templates-table-body', query);
  },
  filterStickers(query) {
    this._filterTable('stickers-table-body', query);
  },
  _filterTable(tbodyId, query) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const q = (query || '').toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = q === '' || text.includes(q) ? '' : 'none';
    });
  },

  async previewTemplatePdf(id) {
    document.querySelectorAll('.label-card-dropdown.show').forEach(d => d.classList.remove('show'));
    const template = this.templates.find(t => t.id === id);
    if (!template) return;
    try {
      const sampleData = {};
      (template.fields || []).forEach(f => { sampleData[f.name] = f.value || f.name; });
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      console.error('Preview failed:', err);
      alert('Failed to generate preview');
    }
  },

  async downloadTemplatePdf(id) {
    document.querySelectorAll('.label-card-dropdown.show').forEach(d => d.classList.remove('show'));
    const template = this.templates.find(t => t.id === id);
    if (!template) return;
    try {
      const sampleData = {};
      (template.fields || []).forEach(f => { sampleData[f.name] = f.value || f.name; });
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, template.copies || 1);
      const safeName = template.labelName.replace(/[^a-zA-Z0-9]/g, '_');
      LabelPdfGenerator.downloadPdf(pdfBytes, safeName + '.pdf');
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to generate PDF');
    }
  },

  // ============================================================
  // LABEL EDITOR
  // ============================================================
  openEditor(templateId) {
    document.querySelectorAll('.label-card-dropdown.show').forEach(d => d.classList.remove('show'));
    const overlay = document.getElementById('labelEditorOverlay');

    if (templateId) {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) return;
      this.editorTemplate = template;
      this.editorFields = JSON.parse(JSON.stringify(template.fields || []));
      document.getElementById('editor-label-name').value = template.labelName;
      document.getElementById('editor-paper-size').value = template.paperSize;
      document.getElementById('editor-copies').value = template.copies || 1;
    } else {
      this.editorTemplate = null;
      this.editorFields = [];
      document.getElementById('editor-label-name').value = '';
      document.getElementById('editor-paper-size').value = DEFAULT_PAPER_SIZE;
      document.getElementById('editor-copies').value = 1;
    }

    this.editorSelectedField = null;
    overlay.classList.add('active');

    // Initialize the CanvasEditor on the viewport
    const ps = document.getElementById('editor-paper-size').value;
    const pc = PAPER_SIZES[ps];
    const self = this;

    // Convert label fields to canvas-editor elements
    const canvasElements = this.editorFields.map(f => ({
      ...f,
      id: f.id,
      text: f.value || f.name,
      _type: 'label'
    }));

    setTimeout(() => {
      const viewport = document.getElementById('fe-canvas-viewport');
      CanvasEditor.init(viewport, {
        paperWidth: pc.width,
        paperHeight: pc.height,
        elements: canvasElements,
        showGrid: true,
        showRulers: true,
        onSelectionChange(el) {
          self.editorSelectedField = el;
          self._feUpdatePropsPanel();
          self._feUpdateLayersList();
        },
        onElementsChange(elements) {
          // Sync back to editorFields
          self.editorFields = elements.map(e => ({
            id: e.id,
            name: e.name,
            position: e.position || { x: 0, y: 0 },
            fontSize: e.fontSize || 12,
            fontFamily: e.fontFamily || 'Arial',
            textAlign: e.textAlign || 'left',
            color: e.color || '#000000',
            value: e.text || e.value || e.name,
            rotation: e.rotation || 0,
            showInForm: e.showInForm !== false,
            bold: e.bold || false
          }));
        }
      });
      self._feUpdateLayersList();
      self._feUpdateAvailableFields();
      self._feUpdateStatusBar();
    }, 50);

    // Listen for paper size changes
    document.getElementById('editor-paper-size').onchange = () => {
      const ps2 = document.getElementById('editor-paper-size').value;
      const pc2 = PAPER_SIZES[ps2];
      CanvasEditor.setPaper(pc2.width, pc2.height);
      this._feUpdateStatusBar();
    };
  },

  closeEditor() {
    document.getElementById('labelEditorOverlay').classList.remove('active');
    CanvasEditor.destroy();
    this.editorTemplate = null;
    this.editorFields = [];
    this.editorSelectedField = null;
    this.loadTemplates();
  },

  // ---- Freeform Editor Toolbar Actions ----
  feZoom(dir) {
    const newZoom = CanvasEditor.zoom * (dir > 0 ? 1.2 : 0.8);
    CanvasEditor.setZoom(newZoom);
    document.getElementById('fe-zoom-label').textContent = Math.round(CanvasEditor.zoom * 100) + '%';
  },

  feZoomFit() {
    CanvasEditor.fitToView();
    document.getElementById('fe-zoom-label').textContent = Math.round(CanvasEditor.zoom * 100) + '%';
  },

  feToggleGrid() {
    CanvasEditor.showGrid = !CanvasEditor.showGrid;
    document.getElementById('fe-toggle-grid').classList.toggle('active', CanvasEditor.showGrid);
    CanvasEditor.render();
  },

  feToggleSnap() {
    CanvasEditor.snapToGrid = !CanvasEditor.snapToGrid;
    document.getElementById('fe-toggle-snap').classList.toggle('active', CanvasEditor.snapToGrid);
  },

  feToggleRulers() {
    CanvasEditor.showRulers = !CanvasEditor.showRulers;
    document.getElementById('fe-toggle-rulers').classList.toggle('active', CanvasEditor.showRulers);
    CanvasEditor.render();
  },

  feUndo() { CanvasEditor.undo(); },
  feRedo() { CanvasEditor.redo(); },

  // ---- Freeform Editor State Sync ----
  _feUpdateStatusBar() {
    const ps = document.getElementById('editor-paper-size').value;
    const pc = PAPER_SIZES[ps];
    const paperEl = document.getElementById('fe-status-paper');
    if (paperEl) paperEl.textContent = pc.width + ' × ' + pc.height + ' mm';
    const fieldsEl = document.getElementById('fe-status-fields');
    if (fieldsEl) fieldsEl.textContent = this.editorFields.length + ' fields';
    document.getElementById('editor-field-count').textContent = this.editorFields.length;
  },

  _feUpdateAvailableFields() {
    const usedNames = this.editorFields.map(f => f.name);
    const available = AVAILABLE_FIELDS.filter(n => !usedNames.includes(n));
    const container = document.getElementById('editor-available-fields');
    container.innerHTML = available.map(name =>
      '<span class="fe-field-chip" onclick="LabelSystem.editorAddField(\'' + this.escHtml(name) + '\')">' +
        '<i class="fas fa-plus"></i>' + this.escHtml(name) +
      '</span>'
    ).join('');
  },

  _feUpdateLayersList() {
    const list = document.getElementById('editor-fields-list');
    document.getElementById('editor-field-count').textContent = CanvasEditor.elements.length;
    if (!list) return;

    list.innerHTML = CanvasEditor.elements.map(el => {
      const isSelected = CanvasEditor.selected.includes(el.id);
      return '<div class="fe-layer-item' + (isSelected ? ' selected' : '') + '" onclick="LabelSystem.feSelectLayer(\'' + el.id + '\')">' +
        '<span class="layer-icon"><i class="fas fa-font"></i></span>' +
        '<span class="layer-name">' + this.escHtml(el.name || el.text || 'Untitled') + '</span>' +
        '<span class="layer-meta">' + (el.fontSize || 12) + 'px</span>' +
        '<button class="layer-del" onclick="event.stopPropagation();LabelSystem.editorDeleteField(\'' + el.id + '\')"><i class="fas fa-times"></i></button>' +
      '</div>';
    }).join('');
    this._feUpdateStatusBar();
  },

  _feUpdatePropsPanel() {
    const empty = document.getElementById('fe-props-empty');
    const content = document.getElementById('fe-props-content');
    const el = this.editorSelectedField;

    if (!el) {
      empty.style.display = 'flex';
      content.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    content.style.display = 'block';

    document.getElementById('editor-prop-field-name').textContent = el.name || el.text || 'Field';
    document.getElementById('prop-value').value = el.text || el.value || '';
    document.getElementById('prop-x').value = el.position ? el.position.x : 0;
    document.getElementById('prop-y').value = el.position ? el.position.y : 0;
    document.getElementById('prop-font-family').value = el.fontFamily || 'Arial';
    document.getElementById('prop-font-size').value = el.fontSize || 12;
    document.getElementById('prop-font-size-val').textContent = el.fontSize || 12;
    document.getElementById('prop-color').value = el.color || '#000000';
    document.getElementById('prop-color-hex').textContent = el.color || '#000000';
    document.getElementById('prop-rotation').value = el.rotation || 0;
    document.getElementById('prop-rotation-val').textContent = (el.rotation || 0) + '°';
    document.getElementById('prop-show-in-form').checked = el.showInForm !== false;

    // Bold button
    document.getElementById('prop-bold').classList.toggle('active', !!el.bold);

    // Alignment buttons
    ['left', 'center', 'right'].forEach(a => {
      document.getElementById('prop-align-' + a).classList.toggle('active', (el.textAlign || 'left') === a);
    });
  },

  feSelectLayer(id) {
    CanvasEditor.selectElement(id);
  },

  editorToggleBold() {
    if (!this.editorSelectedField) return;
    const el = CanvasEditor.elements.find(e => e.id === this.editorSelectedField.id);
    if (!el) return;
    CanvasEditor.updateElement(el.id, { bold: !el.bold });
  },

  editorGetCanvasDims() {
    const ps = document.getElementById('editor-paper-size').value;
    const pc = PAPER_SIZES[ps];
    const canvasWidth = 400;
    const canvasHeight = Math.round((pc.height / pc.width) * canvasWidth);
    return { canvasWidth, canvasHeight, paperConfig: pc };
  },

  _syncFieldsFromCanvas() {
    if (!CanvasEditor.elements) return;
    this.editorFields = CanvasEditor.elements.map(e => ({
      id: e.id,
      name: e.name || e.text || 'Field',
      position: e.position || { x: 0, y: 0 },
      fontSize: e.fontSize || 12,
      fontFamily: e.fontFamily || 'Arial',
      textAlign: e.textAlign || 'left',
      color: e.color || '#000000',
      value: e.text || e.value || e.name || '',
      rotation: e.rotation || 0,
      showInForm: e.showInForm !== false,
      bold: e.bold || false
    }));
  },

  editorRender() {
    // For backward compatibility — now handled by CanvasEditor
    if (CanvasEditor.canvas) CanvasEditor.render();
    this._feUpdateLayersList();
    this._feUpdateAvailableFields();
  },

  editorSelectField(fieldId) {
    CanvasEditor.selectElement(fieldId);
  },

  editorAddField(name) {
    const newField = {
      id: generateId(),
      name: name,
      text: name,
      _type: 'label',
      position: { x: 10, y: 30 },
      fontSize: 12,
      fontFamily: 'Arial',
      textAlign: 'left',
      color: '#000000',
      value: name,
      rotation: 0,
      showInForm: true,
      bold: false
    };
    CanvasEditor.addElement(newField);
    this.editorFields.push(newField);
    this._feUpdateAvailableFields();
  },

  editorAddCustomField() {
    const input = document.getElementById('editor-custom-field-name');
    const name = input.value.trim();
    if (!name) return;
    this.editorAddField(name);
    input.value = '';
  },

  editorDeleteField(fieldId) {
    CanvasEditor.deleteElement(fieldId);
    this.editorFields = this.editorFields.filter(f => f.id !== fieldId);
    if (this.editorSelectedField && this.editorSelectedField.id === fieldId) {
      this.editorSelectedField = null;
    }
    this._feUpdateAvailableFields();
    this._feUpdateLayersList();
    this._feUpdatePropsPanel();
  },

  editorDeleteSelectedField() {
    if (this.editorSelectedField) {
      this.editorDeleteField(this.editorSelectedField.id);
    }
  },

  // Old props panels replaced by _feUpdatePropsPanel above

  editorUpdateFieldProp(prop, value) {
    if (!this.editorSelectedField) return;
    const id = this.editorSelectedField.id;
    const update = {};

    if (prop === 'x') {
      // Update element position.x
      const el = CanvasEditor.elements.find(e => e.id === id);
      if (el) {
        update.position = { ...(el.position || {}), x: Math.max(0, parseFloat(value)) };
      }
    } else if (prop === 'y') {
      const el = CanvasEditor.elements.find(e => e.id === id);
      if (el) {
        update.position = { ...(el.position || {}), y: Math.max(0, parseFloat(value)) };
      }
    } else if (prop === 'rotation') {
      update.rotation = parseInt(value) || 0;
    } else if (prop === 'textAlign') {
      update.textAlign = value;
    } else if (prop === 'fontSize') {
      update.fontSize = parseInt(value);
    } else if (prop === 'value') {
      update.text = value;
      update.value = value;
    } else {
      update[prop] = value;
    }

    CanvasEditor.updateElement(id, update);
    
    // Keep editorFields in sync
    const field = this.editorFields.find(f => f.id === id);
    if (field) {
      if (update.position) field.position = update.position;
      if (update.rotation !== undefined) field.rotation = update.rotation;
      if (update.textAlign) field.textAlign = update.textAlign;
      if (update.fontSize) field.fontSize = update.fontSize;
      if (update.text) { field.value = update.text; field.text = update.text; }
      if (update.color) field.color = update.color;
      if (update.fontFamily) field.fontFamily = update.fontFamily;
      if (update.showInForm !== undefined) field.showInForm = update.showInForm;
      if (update.bold !== undefined) field.bold = update.bold;
    }
  },

  editorSetRotation(deg) {
    if (!this.editorSelectedField) return;
    document.getElementById('prop-rotation').value = deg;
    document.getElementById('prop-rotation-val').textContent = deg + '°';
    this.editorUpdateFieldProp('rotation', deg);
  },

  async editorPreview() {
    // Sync fields from CanvasEditor before preview
    if (CanvasEditor.elements) {
      this._syncFieldsFromCanvas();
    }
    if (this.editorFields.length === 0) return;
    try {
      const ps = document.getElementById('editor-paper-size').value;
      const { canvasWidth, canvasHeight } = this.editorGetCanvasDims();
      const tempTemplate = {
        id: 'preview',
        labelName: document.getElementById('editor-label-name').value || 'Preview',
        fields: this.editorFields,
        paperSize: ps,
        width: canvasWidth,
        height: canvasHeight,
        copies: 1,
        archived: false,
        createdBy: 'Preview',
        createdDate: new Date().toISOString()
      };
      const sampleData = {};
      this.editorFields.forEach(f => { sampleData[f.name] = f.value || f.name; });
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(tempTemplate, sampleData, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      console.error('Preview failed:', err);
      alert('Failed to generate preview');
    }
  },

  async editorSave() {
    // Sync fields from CanvasEditor before saving
    if (CanvasEditor.elements) {
      this._syncFieldsFromCanvas();
    }
    const labelName = document.getElementById('editor-label-name').value.trim();
    const paperSize = document.getElementById('editor-paper-size').value;
    const copies = parseInt(document.getElementById('editor-copies').value) || 1;
    const { canvasWidth, canvasHeight } = this.editorGetCanvasDims();
    const alertEl = document.getElementById('editor-alert');

    if (!labelName) {
      alertEl.textContent = 'Label name is required';
      alertEl.style.display = 'block';
      return;
    }
    if (this.editorFields.length === 0) {
      alertEl.textContent = 'At least one field is required';
      alertEl.style.display = 'block';
      return;
    }

    alertEl.style.display = 'none';

    try {
      const userEmail = localStorage.getItem('userEmail') || (firebase.auth().currentUser ? firebase.auth().currentUser.email : 'Unknown User');
      const data = {
        labelName,
        fields: this.editorFields,
        paperSize,
        width: canvasWidth,
        height: canvasHeight,
        copies
      };

      if (this.editorTemplate) {
        await this.updateTemplate(this.editorTemplate.id, data);
      } else {
        data.createdBy = userEmail;
        await this.createTemplate(data);
      }

      this.closeEditor();
    } catch (err) {
      alertEl.textContent = 'Save failed: ' + (err.message || err);
      alertEl.style.display = 'block';
    }
  },

  // ============================================================
  // LABEL CREATOR
  // ============================================================
  initCreator() {
    const selectStep = document.getElementById('label-creator-step-select');
    const fillStep = document.getElementById('label-creator-step-fill');
    selectStep.style.display = 'block';
    fillStep.style.display = 'none';
    this.creatorSelectedTemplate = null;
    this.creatorLabelData = {};
    this.creatorTireSizeFormat = 'metric';

    this.renderCreatorTemplates();
  },

  renderCreatorTemplates() {
    const active = this.templates.filter(t => !t.archived);
    const tire = active.filter(t => t.labelName.toLowerCase().includes('tire'));
    const parts = active.filter(t => t.labelName.toLowerCase().includes('part'));
    const other = active.filter(t => !tire.includes(t) && !parts.includes(t));

    const container = document.getElementById('label-creator-templates');
    let html = '';

    if (active.length === 0) {
      html = '<div class="label-empty-state"><i class="fas fa-tags d-block"></i><h6>No templates found</h6><p>Create or import templates first</p>' +
        '<button class="btn btn-primary" onclick="LabelSystem.showView(\'manager\')"><i class="fas fa-th-list me-1"></i>Go to Template Manager</button></div>';
    } else {
      if (tire.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F6DE; Tire Templates (' + tire.length + ')</h6><div class="label-creator-chips">';
        tire.forEach(t => { html += '<span class="label-template-chip" onclick="LabelSystem.creatorSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
      if (parts.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F527; Parts Templates (' + parts.length + ')</h6><div class="label-creator-chips">';
        parts.forEach(t => { html += '<span class="label-template-chip secondary" onclick="LabelSystem.creatorSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
      if (other.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F4CB; Other Templates (' + other.length + ')</h6><div class="label-creator-chips">';
        other.forEach(t => { html += '<span class="label-template-chip default" onclick="LabelSystem.creatorSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
    }

    container.innerHTML = html;
  },

  useTemplate(templateId) {
    this.showView('creator');
    this.creatorSelectTemplate(templateId);
    // Auto-connect to print server if not already connected
    if (!this.printClientConnected) {
      this.testPrintClientConnection().then(() => {
        this.creatorPopulatePrinters();
      });
    }
  },

  creatorSelectTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    this.creatorSelectedTemplate = template;

    document.getElementById('label-creator-step-select').style.display = 'none';
    document.getElementById('label-creator-step-fill').style.display = 'block';
    document.getElementById('creator-template-name').textContent = template.labelName;
    document.getElementById('creator-alert').style.display = 'none';

    // Auto-populate fields
    const userName = localStorage.getItem('userName') || (firebase.auth().currentUser ? firebase.auth().currentUser.displayName || firebase.auth().currentUser.email : 'Unknown User');
    const now = new Date();
    const data = {};
    template.fields.forEach(field => {
      switch (field.name.toLowerCase()) {
        case 'created by': data[field.name] = userName; break;
        case 'created date': data[field.name] = now.toLocaleDateString(); break;
        case 'copies to be printed': data[field.name] = '1'; break;
        default: data[field.name] = '';
      }
    });
    this.creatorLabelData = data;

    // Show auto-filled chips
    const chipsHtml = template.fields
      .filter(f => f.name === 'Created By' || f.name === 'Created Date')
      .map(f => '<span class="auto-chip">' + this.escHtml(data[f.name] || '') + '</span>')
      .join('');
    document.getElementById('creator-auto-chips').innerHTML = chipsHtml;

    // Populate paper size dropdown
    const paperSelect = document.getElementById('creator-paper-size');
    if (paperSelect) {
      paperSelect.innerHTML = '';
      Object.entries(PAPER_SIZES).forEach(([key, ps]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = ps.name + ' (' + ps.width + '\u00d7' + ps.height + 'mm)';
        paperSelect.appendChild(opt);
      });
      paperSelect.value = template.paperSize || DEFAULT_PAPER_SIZE;
    }

    // Populate printer dropdown
    this.creatorPopulatePrinters();

    // Set copies
    const copiesEl = document.getElementById('creator-copies');
    if (copiesEl) copiesEl.value = data['Copies to be Printed'] || '1';

    // Render form fields
    this.renderCreatorForm();

    // Render rotation controls
    this.renderCreatorRotationControls();

    // Render preview
    this.updateCreatorPreview();

    // Preview info
    this.updateCreatorPreviewInfo();
  },

  updateCreatorPreviewInfo() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;
    const paperKey = document.getElementById('creator-paper-size') ? document.getElementById('creator-paper-size').value : template.paperSize;
    const pc = PAPER_SIZES[paperKey];
    document.getElementById('creator-preview-info').textContent =
      'Size: ' + (pc ? pc.width + '\u00d7' + pc.height + pc.unit : template.width + 'x' + template.height + 'px') +
      ' \u2014 Updates in real-time';
  },

  creatorPopulatePrinters() {
    const select = document.getElementById('creator-printer-select');
    if (!select) return;
    select.innerHTML = '';
    const printers = this.printClientPrinters;
    if (printers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No printers detected';
      opt.disabled = true;
      select.appendChild(opt);
    }
    printers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + (p.status ? ' (' + p.status + ')' : '');
      opt.dataset.systemName = p.systemName || p.name;
      select.appendChild(opt);
    });
    // Auto-select paper size for first printer
    if (printers.length > 0) this.creatorPrinterChanged();
  },

  creatorPrinterChanged() {
    const printerSelect = document.getElementById('creator-printer-select');
    const paperSelect = document.getElementById('creator-paper-size');
    if (!printerSelect || !paperSelect) return;
    const selOpt = printerSelect.options[printerSelect.selectedIndex];
    const sysName = selOpt ? selOpt.dataset.systemName : '';
    const pd = PRINTER_DEFAULTS[sysName];
    if (pd && pd.paperSize) {
      paperSelect.value = pd.paperSize;
      this.creatorPaperSizeChanged(pd.paperSize);
    }
  },

  creatorPaperSizeChanged(paperKey) {
    // Update the template's paper size for preview
    if (this.creatorSelectedTemplate) {
      this.creatorSelectedTemplate.paperSize = paperKey;
    }
    this.updateCreatorPreview();
    this.updateCreatorPreviewInfo();
  },

  renderCreatorRotationControls() {
    const template = this.creatorSelectedTemplate;
    const container = document.getElementById('creator-rotation-controls');
    if (!template || !container) return;
    let html = '';
    template.fields.forEach((field, idx) => {
      const rot = field.rotation || 0;
      html += '<div class="d-flex align-items-center gap-2 mb-1">' +
        '<span class="small text-truncate" style="width:100px;" title="' + this.escHtml(field.name) + '">' + this.escHtml(field.name) + '</span>' +
        '<select class="form-select form-select-sm" style="width:80px;" onchange="LabelSystem.creatorSetFieldRotation(' + idx + ', parseInt(this.value))">' +
          '<option value="0"' + (rot === 0 ? ' selected' : '') + '>0\u00b0</option>' +
          '<option value="90"' + (rot === 90 ? ' selected' : '') + '>90\u00b0</option>' +
          '<option value="180"' + (rot === 180 ? ' selected' : '') + '>180\u00b0</option>' +
          '<option value="270"' + (rot === 270 ? ' selected' : '') + '>270\u00b0</option>' +
        '</select>' +
      '</div>';
    });
    container.innerHTML = html;
  },

  creatorSetFieldRotation(fieldIdx, degrees) {
    const template = this.creatorSelectedTemplate;
    if (!template || !template.fields[fieldIdx]) return;
    template.fields[fieldIdx].rotation = degrees;
    this.updateCreatorPreview();
  },

  renderCreatorForm() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;

    const formEl = document.getElementById('creator-fields-form');
    let html = '';

    template.fields.forEach(field => {
      const isAutoFilled = field.name === 'Created By' || field.name === 'Created Date';
      const isLabelName = field.name.toLowerCase().includes('label name');
      const isTireSize = field.name.toLowerCase().includes('tire size');
      const isCopies = field.name === 'Copies to be Printed';

      if (isAutoFilled || isLabelName) return;
      if (field.showInForm === false) return;

      html += '<div class="mb-3">';

      if (isTireSize) {
        html += '<label class="form-label small mb-1">Tire Size Format:</label>';
        html += '<div class="tire-format-chips">';
        html += '<span class="tire-format-chip' + (this.creatorTireSizeFormat === 'metric' ? ' active' : '') + '" onclick="LabelSystem.setTireSizeFormat(\'metric\')">Metric</span>';
        html += '<span class="tire-format-chip' + (this.creatorTireSizeFormat === 'standard' ? ' active' : '') + '" onclick="LabelSystem.setTireSizeFormat(\'standard\')">Standard</span>';
        html += '</div>';
      }

      const placeholder = isTireSize ? (this.creatorTireSizeFormat === 'metric' ? '225/65R17' : '35X12.50R20') :
        field.name === 'Invoice #' ? 'INV-2024-001' :
        field.name === 'Part Number' ? 'PN-123456' :
        field.name === 'Vendor Part Number' ? 'VPN-789' :
        field.name === 'Vendor' ? 'ABC Supply Co.' :
        field.name === 'Bin/Location' ? 'A1-B2' : '';

      const helperText = isCopies ? 'Number of label copies to print (1-10)' :
        isTireSize ? (this.creatorTireSizeFormat === 'metric' ? 'Width/Aspect Ratio + R + Wheel Diameter (e.g., 225/65R17)' : 'Diameter X Width R Rim (e.g., 35X12.50R20)') :
        field.name === 'Invoice #' ? 'Invoice or work order number' :
        field.name === 'Bin/Location' ? 'Storage location (e.g., A1-B2, Shelf-3)' : '';

      const inputType = isCopies ? 'number' : 'text';
      const extraAttrs = isCopies ? ' min="1" max="10"' : '';
      const extraStyle = isTireSize ? ' style="font-family:monospace; font-size:1.1rem; font-weight:600;"' : '';

      html += '<label class="form-label">' + this.escHtml(field.name) + '</label>';
      html += '<input type="' + inputType + '" class="form-control" data-field-name="' + this.escHtml(field.name) + '"' +
        ' value="' + this.escHtml(this.creatorLabelData[field.name] || '') + '"' +
        ' placeholder="' + this.escHtml(placeholder) + '"' + extraAttrs + extraStyle +
        ' oninput="LabelSystem.creatorFieldChanged(\'' + this.escHtml(field.name).replace(/'/g, "\\'") + '\', this.value)">';
      if (helperText) {
        html += '<small class="text-muted">' + helperText + '</small>';
      }
      html += '</div>';
    });

    formEl.innerHTML = html;
    this.updateCreatorButtons();
  },

  creatorFieldChanged(fieldName, value) {
    if (fieldName.toLowerCase().includes('tire size')) {
      value = this.formatTireSize(value, this.creatorTireSizeFormat);
      // Update the input value
      const input = document.querySelector('[data-field-name="' + fieldName + '"]');
      if (input) input.value = value;
    }
    this.creatorLabelData[fieldName] = value;
    this.updateCreatorPreview();
    this.updateCreatorButtons();
  },

  setTireSizeFormat(fmt) {
    this.creatorTireSizeFormat = fmt;
    this.renderCreatorForm();
  },

  formatTireSize(value, format) {
    if (format === 'metric') {
      const cleaned = value.replace(/[^0-9R]/g, '');
      let formatted = '';
      let pos = 0;
      // Width (3 digits)
      if (pos < cleaned.length) {
        const width = cleaned.substring(pos, Math.min(pos + 3, cleaned.length));
        formatted += width;
        pos += width.length;
        if (pos < cleaned.length && width.length === 3) formatted += '/';
      }
      // Aspect ratio (2 digits)
      if (pos < cleaned.length && formatted.includes('/')) {
        const ar = cleaned.substring(pos, Math.min(pos + 2, cleaned.length));
        formatted += ar;
        pos += ar.length;
        if (pos < cleaned.length && ar.length === 2) {
          formatted += 'R';
          if (cleaned.substring(pos).startsWith('R')) pos++;
        }
      }
      // Wheel diameter (2 digits)
      if (pos < cleaned.length && formatted.includes('R')) {
        formatted += cleaned.substring(pos, Math.min(pos + 2, cleaned.length));
      }
      return formatted;
    } else {
      const cleaned = value.replace(/[^0-9XR.]/g, '').toUpperCase();
      let formatted = '';
      let pos = 0;
      if (pos < cleaned.length) {
        const match = cleaned.substring(pos).match(/^\d{2,3}/);
        if (match) {
          formatted += match[0];
          pos += match[0].length;
          if (pos < cleaned.length) formatted += 'X';
        }
      }
      if (pos < cleaned.length && formatted.includes('X')) {
        if (cleaned[pos] === 'X') pos++;
        const rem = cleaned.substring(pos);
        const wm = rem.match(/^\d+\.?\d*/);
        if (wm) {
          let w = wm[0];
          if (!w.includes('.') && w.length >= 2) {
            w = w.substring(0, 2) + '.' + (w.substring(2, 4) || '50');
          }
          formatted += w;
          pos += wm[0].length;
          if (pos < cleaned.length) {
            formatted += 'R';
            if (cleaned[pos] === 'R') pos++;
          }
        }
      }
      if (pos < cleaned.length && formatted.includes('R')) {
        const rm = cleaned.substring(pos).match(/^\d{2,3}/);
        if (rm) formatted += rm[0];
      }
      return formatted;
    }
  },

  updateCreatorButtons() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;

    const valid = template.fields
      .filter(f =>
        f.name !== 'Copies to be Printed' &&
        f.name !== 'Created By' &&
        f.name !== 'Created Date' &&
        !f.name.toLowerCase().includes('label name') &&
        f.showInForm !== false
      )
      .every(f => (this.creatorLabelData[f.name] || '').trim());

    document.getElementById('creator-print-btn').disabled = !valid;
    document.getElementById('creator-send-btn').disabled = !valid;
  },

  async updateCreatorPreview() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;
    try {
      const imgUrl = await LabelPdfGenerator.generatePreviewImage(template, this.creatorLabelData);
      document.getElementById('creator-preview-box').innerHTML =
        '<img src="' + imgUrl + '" alt="Label Preview">';
    } catch (err) {
      console.error('Preview failed:', err);
    }
  },

  creatorBackToSelect() {
    document.getElementById('label-creator-step-select').style.display = 'block';
    document.getElementById('label-creator-step-fill').style.display = 'none';
    this.creatorSelectedTemplate = null;
    this.creatorLabelData = {};
    this.creatorTireSizeFormat = 'metric';
  },

  async creatorPreviewPdf() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;
    try {
      const copies = parseInt(this.creatorLabelData['Copies to be Printed'] || '1');
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, this.creatorLabelData, copies);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      document.getElementById('creator-alert').textContent = 'Failed to generate PDF';
      document.getElementById('creator-alert').style.display = 'block';
    }
  },

  async creatorPrint() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;
    try {
      const copies = parseInt(this.creatorLabelData['Copies to be Printed'] || '1');
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, this.creatorLabelData, copies);

      if (this.testMode) {
        this.addTestLog('success', 'PRINT REQUEST INTERCEPTED — Template: "' + template.labelName + '" | Copies: ' + copies + ' | Paper: ' + template.paperSize);
        this.addTestLog('info', 'Printer would have received: ' + (pdfBytes.length / 1024).toFixed(1) + ' KB PDF (' + copies + ' page(s))');
        const fieldSummary = Object.entries(this.creatorLabelData).filter(([k,v]) => v).map(([k,v]) => k + '=' + v).join(', ');
        this.addTestLog('info', 'Label data: ' + fieldSummary);
        this.addTestLog('info', 'Opening PDF preview instead of printing...');
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
      } else {
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
      }
    } catch (err) {
      if (this.testMode) {
        this.addTestLog('error', 'Print FAILED: ' + (err.message || err));
      }
      document.getElementById('creator-alert').textContent = 'Failed to generate label: ' + (err.message || err);
      document.getElementById('creator-alert').style.display = 'block';
    }
  },

  // ============================================================
  // PRINT CLIENT INTEGRATION
  // ============================================================

  getPrintClientUrl() {
    const saved = localStorage.getItem('labelSettings');
    if (saved) {
      try { return JSON.parse(saved).printServerUrl || 'https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi'; } catch (e) {}
    }
    return 'https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi';
  },

  getPrintClientToken() {
    const saved = localStorage.getItem('labelSettings');
    if (saved) {
      try { return JSON.parse(saved).printClientToken || 'ql-print-2024'; } catch (e) {}
    }
    return 'ql-print-2024';
  },

  getPrintClientHeaders(includeContentType) {
    const headers = {};
    const token = this.getPrintClientToken();
    if (token) {
      headers['X-API-Key'] = token;
      headers['Authorization'] = 'Bearer ' + token;
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  },

  async testPrintClientConnection() {
    const bar = document.getElementById('printClientBar');
    const statusEl = document.getElementById('printClientStatus');
    const jobsEl = document.getElementById('printClientJobs');
    const printersEl = document.getElementById('printClientPrinters');

    const printClientUrl = this.getPrintClientUrl();

    if (!this.getPrintClientToken()) {
      bar.classList.add('disconnected');
      statusEl.textContent = 'Print Server: No API key configured';
      jobsEl.textContent = '';
      printersEl.textContent = 'Set an API key in Label Settings to connect';
      this.printClientConnected = false;
      this.printClientPrinters = [];
      if (this.testMode) {
        this.addTestLog('warn', 'No API key set — cannot authenticate with print server');
        this.addTestLog('info', 'Go to Label Settings and enter your API key, then save.');
      }
      return;
    }

    if (this.testMode) {
      this.addTestLog('info', 'Testing connection to print server: ' + printClientUrl);
    }

    try {
      statusEl.textContent = 'Print Server: Connecting...';

      // Health check first via /api/print/stats/polling
      const healthResp = await fetch(printClientUrl + '/api/print/stats/polling', {
        method: 'GET',
        mode: 'cors',
        headers: this.getPrintClientHeaders(false)
      });

      if (!healthResp.ok) {
        const code = healthResp.status;
        throw new Error(code === 401 ? 'Authentication failed — check your API key' : 'Health check returned HTTP ' + code);
      }

      // Fetch registered printers from the print server
      const printersResp = await fetch(printClientUrl + '/api/print/printers', {
        method: 'GET',
        mode: 'cors',
        headers: this.getPrintClientHeaders(false)
      });

      if (printersResp.ok) {
        const data = await printersResp.json();
        // Server may return { printers: [...] } or a flat array
        const printerList = Array.isArray(data) ? data : (data.printers || []);
        // Deduplicate by systemName — keep the most recently seen entry
        const mapped = printerList.map(p => ({
          id: p.printerId || p.id || p.name,
          name: p.name || p.systemPrinterName || 'Unknown',
          systemName: p.systemPrinterName || p.systemName || p.name,
          status: p.status || p.online ? 'Online' : 'Unknown',
          clientId: p.clientId || null,
          locationId: p.locationId || null,
          lastSeen: p.lastSeen || null
        }));
        const seen = {};
        for (const p of mapped) {
          const key = (p.systemName || p.name || '').toLowerCase();
          if (!key) continue;
          const prev = seen[key];
          if (!prev || (p.lastSeen && (!prev.lastSeen || p.lastSeen > prev.lastSeen))) {
            seen[key] = p;
          }
        }
        this.printClientPrinters = Object.values(seen);

        bar.classList.remove('disconnected');
        if (!this.testMode) bar.classList.remove('test-mode');
        statusEl.textContent = 'Print Server: Connected';
        this.printClientConnected = true;
        jobsEl.textContent = '';
        printersEl.textContent = 'Printers: ' + this.printClientPrinters.length + ' registered';

        // Sync printers to sticker system
        if (typeof StickerSystem !== 'undefined' && StickerSystem.populatePrinters) {
          StickerSystem.populatePrinters();
        }

        if (this.testMode) {
          this.addTestLog('success', 'Print server REACHABLE at ' + printClientUrl);
          this.addTestLog('success', 'Discovered ' + this.printClientPrinters.length + ' printer(s): ' +
            this.printClientPrinters.map(p => p.name + ' (' + p.status + ')').join(', '));
        }

        if (this.testMode) bar.classList.add('test-mode');
      } else {
        throw new Error('Printers endpoint returned ' + printersResp.status);
      }
    } catch (err) {
      bar.classList.add('disconnected');
      this.printClientConnected = false;
      jobsEl.textContent = '';
      this.printClientPrinters = [];

      // Detect CORS / network failures (fetch throws TypeError on CORS block or network error)
      const isCors = err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));
      if (isCors) {
        statusEl.textContent = 'Print Server: CORS Blocked';
        printersEl.textContent = 'Server must allow this origin — update server CORS config';
        if (this.testMode) {
          this.addTestLog('error', 'CORS error — the server at ' + printClientUrl + ' is rejecting requests from ' + window.location.origin);
          this.addTestLog('info', 'The server needs to add "' + window.location.origin + '" to its allowed CORS origins.');
          this.addTestLog('info', 'Pull the latest Inspectionapp code on the shop server and restart.');
        }
      } else {
        statusEl.textContent = 'Print Server: Disconnected';
        printersEl.textContent = err.message || '';
        if (this.testMode) {
          this.addTestLog('error', 'Cannot reach print server at ' + printClientUrl + ' — ' + (err.message || err));
          this.addTestLog('info', 'Check that the server is running and your API key is valid.');
        }
      }
    }
  },

  creatorSendToPrintClient() {
    if (!this.creatorSelectedTemplate) return;

    // Sync inline creator values to the print modal
    const modalBanner = document.getElementById('print-modal-test-banner');
    if (modalBanner) modalBanner.style.display = this.testMode ? 'block' : 'none';

    // Copy printer list from inline to modal
    const inlinePrinter = document.getElementById('creator-printer-select');
    const modalPrinter = document.getElementById('print-printer-select');
    modalPrinter.innerHTML = inlinePrinter.innerHTML;
    modalPrinter.value = inlinePrinter.value;

    // Sync copies from inline
    const inlineCopies = document.getElementById('creator-copies');
    document.getElementById('print-copies').value = inlineCopies ? inlineCopies.value : (this.creatorLabelData['Copies to be Printed'] || '1');

    // Sync paper size from inline
    const inlinePaper = document.getElementById('creator-paper-size');
    const modalPaper = document.getElementById('print-paper-size');
    if (modalPaper && inlinePaper) {
      modalPaper.innerHTML = '';
      Object.entries(PAPER_SIZES).forEach(([key, ps]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = ps.name + ' (' + ps.width + '\u00d7' + ps.height + 'mm)';
        modalPaper.appendChild(opt);
      });
      modalPaper.value = inlinePaper.value;
    }

    // Copy systemName data attributes
    for (let i = 0; i < modalPrinter.options.length; i++) {
      const srcOpt = inlinePrinter.options[i];
      if (srcOpt && srcOpt.dataset.systemName) {
        modalPrinter.options[i].dataset.systemName = srcOpt.dataset.systemName;
      }
    }

    // Auto-select paper size when printer changes in modal
    modalPrinter.onchange = () => {
      const selOpt = modalPrinter.options[modalPrinter.selectedIndex];
      const sysName = selOpt ? selOpt.dataset.systemName : '';
      const pd = PRINTER_DEFAULTS[sysName];
      if (pd && pd.paperSize && modalPaper) {
        modalPaper.value = pd.paperSize;
      }
    };

    new bootstrap.Modal(document.getElementById('labelPrintModal')).show();
  },

  async confirmSendToPrintClient() {
    const template = this.creatorSelectedTemplate;
    if (!template) return;

    const selectEl = document.getElementById('print-printer-select');
    const printerId = selectEl.value;
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const printerName = selectedOption ? selectedOption.textContent.split(' (')[0] : printerId;
    const systemName = selectedOption ? (selectedOption.dataset.systemName || printerName) : printerName;
    const copies = parseInt(document.getElementById('print-copies').value) || 1;
    const paperSizeEl = document.getElementById('print-paper-size');
    const selectedPaperSize = paperSizeEl ? paperSizeEl.value : (template.paperSize || DEFAULT_PAPER_SIZE);
    const printClientUrl = this.getPrintClientUrl();

    try {
      // Generate PDF bytes
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, this.creatorLabelData, copies);

      // ---- TEST MODE: Intercept and log, do NOT send to printer ----
      if (this.testMode) {
        this.addTestLog('success', 'PRINT CLIENT REQUEST INTERCEPTED — Would send to printer: "' + printerName + '"');
        this.addTestLog('info', 'Template: "' + template.labelName + '" | Copies: ' + copies + ' | Paper: ' + template.paperSize);
        this.addTestLog('info', 'PDF size: ' + (pdfBytes.length / 1024).toFixed(1) + ' KB (' + copies + ' page(s))');
        this.addTestLog('info', 'Target: ' + printClientUrl + '/api/print/jobs  (server queues → print client polls & prints)');
        const fieldSummary = Object.entries(this.creatorLabelData).filter(([k,v]) => v).map(([k,v]) => k + '="' + v + '"').join(', ');
        this.addTestLog('info', 'Payload: { printerId: "' + printerId + '", printerName: "' + printerName + '", copies: ' + copies + ', data: {' + fieldSummary + '} }');
        this.addTestLog('warn', 'Printer "' + printerName + '" did NOT receive this job (test mode). Opening PDF preview...');
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
        bootstrap.Modal.getInstance(document.getElementById('labelPrintModal')).hide();
        return;
      }

      // ---- REAL MODE: Submit print job to server queue ----
      // Server queues the job; Print Client polls /api/print/jobs/pending,
      // claims the job, downloads the PDF, and prints to the target printer.
      const base64Pdf = this.uint8ArrayToBase64(pdfBytes);
      const response = await fetch(printClientUrl + '/api/print/jobs', {
        method: 'POST',
        headers: this.getPrintClientHeaders(true),
        mode: 'cors',
        body: JSON.stringify({
          printerId: printerId,
          printerName: systemName,
          copies: copies,
          pdfData: base64Pdf,
          templateName: template.labelName,
          paperSize: selectedPaperSize,
          labelData: this.creatorLabelData
        })
      });

      if (response.ok) {
        const result = await response.json();
        bootstrap.Modal.getInstance(document.getElementById('labelPrintModal')).hide();
        const jobId = result.jobId || result.id || '';
        alert('Print job queued' + (jobId ? ' (ID: ' + jobId + ')' : '') + '\nPrinter: ' + printerName + '\nThe Print Client will pick it up automatically.');
      } else {
        const errData = await response.json().catch(() => null);
        const errMsg = errData && errData.error ? errData.error : 'HTTP ' + response.status;
        console.warn('Print job submission failed:', errMsg);
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
        bootstrap.Modal.getInstance(document.getElementById('labelPrintModal')).hide();
        alert('Print job failed: ' + errMsg + '\nPDF opened in new tab for manual printing.');
      }
    } catch (err) {
      console.error('Send to print client failed:', err);
      try {
        const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, this.creatorLabelData, copies);
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
        bootstrap.Modal.getInstance(document.getElementById('labelPrintModal')).hide();
        alert('Print client unreachable. PDF opened in new tab for printing.');
      } catch (e) {
        alert('Failed to generate PDF: ' + (e.message || e));
      }
    }
  },

  uint8ArrayToBase64(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  },

  refreshPrinters() {
    this.testPrintClientConnection();
    // Also update printers list in settings
    const listEl = document.getElementById('label-printers-list');
    if (this.printClientPrinters.length > 0) {
      listEl.innerHTML = this.printClientPrinters.map(p =>
        '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
          '<div>' +
            '<strong>' + this.escHtml(p.name) + '</strong>' +
            (p.systemName && p.systemName !== p.name ? '<br><small class="text-muted">CUPS: ' + this.escHtml(p.systemName) + '</small>' : '') +
          '</div>' +
          '<span class="badge ' + (p.status === 'Online' ? 'bg-success' : 'bg-secondary') + '">' + (p.status || 'Unknown') + '</span>' +
        '</div>'
      ).join('');
    } else {
      listEl.innerHTML = '<p class="text-muted">No printers detected. Ensure the Print Client is running and registered.</p>';
    }
  },

  // ============================================================
  // LIVE DATA — Connected Clients, Live Logs, Auto-refresh
  // ============================================================

  _liveLogTimer: null,

  async refreshClients() {
    const listEl = document.getElementById('label-clients-list');
    if (!listEl) return;
    const printClientUrl = this.getPrintClientUrl();
    try {
      const resp = await fetch(printClientUrl + '/api/print/clients', {
        method: 'GET',
        mode: 'cors',
        headers: this.getPrintClientHeaders(false)
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const clients = await resp.json();
      const clientList = Array.isArray(clients) ? clients : (clients.clients || []);
      if (clientList.length === 0) {
        listEl.innerHTML = '<p class="text-muted">No print clients registered.</p>';
        return;
      }
      listEl.innerHTML = clientList.map(c => {
        const lastSeen = c.lastSeen ? new Date(c.lastSeen) : null;
        const now = new Date();
        const ageSec = lastSeen ? Math.floor((now - lastSeen) / 1000) : 9999;
        const isOnline = ageSec < 120; // Consider online if seen within 2 min
        const ageStr = lastSeen ? (ageSec < 60 ? ageSec + 's ago' : Math.floor(ageSec / 60) + 'm ago') : 'Unknown';
        return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
          '<div>' +
            '<strong>' + this.escHtml(c.name || c.clientId || 'Unknown') + '</strong>' +
            '<br><small class="text-muted">ID: ' + this.escHtml(c.clientId || '') + '</small>' +
            (c.printerCount ? '<br><small class="text-muted">' + c.printerCount + ' printer(s)</small>' : '') +
          '</div>' +
          '<div class="text-end">' +
            '<span class="badge ' + (isOnline ? 'bg-success' : 'bg-danger') + '">' + (isOnline ? 'Online' : 'Offline') + '</span>' +
            '<br><small class="text-muted">Last seen: ' + ageStr + '</small>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      listEl.innerHTML = '<p class="text-muted">Failed to load clients: ' + (err.message || err) + '</p>';
    }
  },

  async refreshLiveLogs() {
    const logsEl = document.getElementById('label-live-logs');
    if (!logsEl) return;
    const printClientUrl = this.getPrintClientUrl();
    try {
      const resp = await fetch(printClientUrl + '/api/print/logs?limit=100', {
        method: 'GET',
        mode: 'cors',
        headers: this.getPrintClientHeaders(false)
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const logs = data.logs || [];
      if (logs.length === 0) {
        logsEl.innerHTML = '<p class="text-muted">No logs yet. Start the Print Client and print a label.</p>';
        return;
      }
      // Logs come newest-first, reverse for chronological display
      const sorted = logs.slice().reverse();
      logsEl.innerHTML = sorted.map(l => {
        const ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '';
        const levelColor = l.level === 'error' ? '#f87171' : (l.level === 'warn' ? '#fbbf24' : '#94a3b8');
        const levelIcon = l.level === 'error' ? '&#x274C;' : (l.level === 'warn' ? '&#x26A0;&#xFE0F;' : '&#x2139;&#xFE0F;');
        return '<div style="padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
          '<span style="color: #475569; margin-right: 8px;">' + ts + '</span>' +
          '<span style="margin-right: 6px;">' + levelIcon + '</span>' +
          '<span style="color: ' + levelColor + ';">' + this.escHtml(l.message || '') + '</span>' +
          (l.clientId ? '<span style="color: #60a5fa; margin-left: 8px; font-size: 0.65rem;">(' + this.escHtml(l.clientId) + ')</span>' : '') +
        '</div>';
      }).join('');
      logsEl.scrollTop = logsEl.scrollHeight;
    } catch (err) {
      logsEl.innerHTML = '<p class="text-muted">Failed to load logs: ' + (err.message || err) + '</p>';
    }
  },

  async clearLiveLogs() {
    const printClientUrl = this.getPrintClientUrl();
    try {
      await fetch(printClientUrl + '/api/print/logs', {
        method: 'DELETE',
        mode: 'cors',
        headers: this.getPrintClientHeaders(false)
      });
      this.refreshLiveLogs();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  },

  startLiveLogAutoRefresh() {
    if (this._liveLogTimer) return;
    this._liveLogTimer = setInterval(() => {
      const toggle = document.getElementById('live-log-auto-refresh');
      if (toggle && toggle.checked) {
        this.refreshLiveLogs();
        this.refreshClients();
      }
    }, 10000); // Refresh every 10 seconds
  },

  stopLiveLogAutoRefresh() {
    if (this._liveLogTimer) {
      clearInterval(this._liveLogTimer);
      this._liveLogTimer = null;
    }
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  loadSettings() {
    const saved = localStorage.getItem('labelSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        const copiesEl = document.getElementById('label-default-copies');
        const paperEl = document.getElementById('label-default-paper');
        const serverEl = document.getElementById('label-print-server');
        const tokenEl = document.getElementById('label-print-token');
        const autoSaveEl = document.getElementById('label-auto-save');
        if (copiesEl) copiesEl.value = settings.defaultCopies || 1;
        if (paperEl) paperEl.value = settings.defaultPaperSize || 'Brother-QL800';
        if (serverEl) serverEl.value = settings.printServerUrl || 'https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi';
        if (tokenEl) tokenEl.value = settings.printClientToken || 'ql-print-2024';
        if (autoSaveEl) autoSaveEl.checked = settings.autoSaveEnabled !== false;
      } catch (e) {
        console.error('Error loading label settings:', e);
      }
    } else {
      // First load — pre-fill default API key
      const tokenEl = document.getElementById('label-print-token');
      if (tokenEl) tokenEl.value = 'ql-print-2024';
    }
  },

  saveSettings() {
    const settings = {
      defaultCopies: parseInt(document.getElementById('label-default-copies').value) || 1,
      defaultPaperSize: document.getElementById('label-default-paper').value,
      printServerUrl: document.getElementById('label-print-server').value || 'https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi',
      printClientToken: document.getElementById('label-print-token').value || 'ql-print-2024',
      autoSaveEnabled: document.getElementById('label-auto-save').checked
    };
    localStorage.setItem('labelSettings', JSON.stringify(settings));
    alert('Label settings saved!');
  },

  renderSettings() {
    this.updateStats();
    this.renderRecentTemplates();
    this.refreshPrinters();
    this.refreshClients();
    this.refreshLiveLogs();
    this.startLiveLogAutoRefresh();
    StickerSystem.renderStickerSettings();
  },

  updateStats() {
    const active = this.templates.filter(t => !t.archived);
    const totalFields = this.templates.reduce((sum, t) => sum + (t.fields || []).length, 0);
    const avgFields = this.templates.length > 0 ? Math.round(totalFields / this.templates.length) : 0;

    const el = (id) => document.getElementById(id);
    if (el('stat-total-templates')) el('stat-total-templates').textContent = this.templates.length;
    if (el('stat-total-fields')) el('stat-total-fields').textContent = totalFields;
    if (el('stat-avg-fields')) el('stat-avg-fields').textContent = avgFields;

    // Paper size distribution
    const dist = {};
    this.templates.forEach(t => {
      const key = t.paperSize || 'Unknown';
      dist[key] = (dist[key] || 0) + 1;
    });
    const distEl = el('stat-paper-distribution');
    if (distEl) {
      distEl.innerHTML = '<strong class="small">Paper Size Distribution:</strong>' +
        Object.entries(dist).map(([ps, count]) => {
          const name = PAPER_SIZES[ps] ? PAPER_SIZES[ps].name : ps;
          return '<div class="label-stat-row"><span>' + this.escHtml(name) + '</span><span class="badge bg-outline-secondary">' + count + '</span></div>';
        }).join('');
    }
  },

  renderRecentTemplates() {
    const listEl = document.getElementById('label-recent-list');
    if (!listEl) return;
    const recent = this.templates.filter(t => !t.archived).slice(0, 5);
    if (recent.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No templates yet</p>';
      return;
    }
    listEl.innerHTML = recent.map(t => {
      const pc = PAPER_SIZES[t.paperSize];
      const created = t.createdDate ? new Date(t.createdDate).toLocaleDateString() : '—';
      return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
        '<div>' +
          '<strong class="d-block">' + this.escHtml(t.labelName) + '</strong>' +
          '<small class="text-muted">' + (t.fields || []).length + ' fields &bull; ' + (pc ? pc.name : t.paperSize) + '</small><br>' +
          '<small class="text-muted">Created ' + created + ' by ' + this.escHtml(t.createdBy || '—') + '</small>' +
        '</div>' +
        '<div>' +
          '<button class="btn btn-sm btn-outline-primary me-1" title="Preview" onclick="LabelSystem.previewTemplatePdf(\'' + t.id + '\')"><i class="fas fa-eye"></i></button>' +
          '<button class="btn btn-sm btn-outline-secondary" title="Edit" onclick="LabelSystem.openEditor(\'' + t.id + '\')"><i class="fas fa-edit"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  // ============================================================
  // IMPORT PREDEFINED TEMPLATES
  // ============================================================
  async importPredefined(category, silent) {
    try {
      const userEmail = localStorage.getItem('userEmail') || (firebase.auth().currentUser ? firebase.auth().currentUser.email : 'System');
      let predefined = getPredefinedTemplates();

      if (category === 'tire') {
        predefined = predefined.filter(t => t.labelName.toLowerCase().includes('tire'));
      } else if (category === 'parts') {
        predefined = predefined.filter(t => t.labelName.toLowerCase().includes('parts'));
      }

      let imported = 0;
      for (const template of predefined) {
        try {
          const data = { ...template };
          delete data.id;
          data.createdBy = userEmail;
          data.createdDate = new Date().toISOString();
          await this.createTemplate(data);
          imported++;
        } catch (e) {
          console.warn('Failed to import:', template.labelName, e);
        }
      }

      await this.loadTemplates();
      if (!silent) {
        alert('Successfully imported ' + imported + ' ' + (category === 'all' ? '' : category + ' ') + 'templates!');
      } else {
        console.log('[Labels] Auto-imported ' + imported + ' templates.');
      }
    } catch (err) {
      console.error('Import failed:', err);
      if (!silent) alert('Failed to import templates');
    }
  },

  // ============================================================
  // UTILITIES
  // ============================================================
  escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // ============================================================
  // CREATE LABELS TAB — MODAL & VIEW LOGIC
  // ============================================================

  openPrintQueue() {
    window.open('https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi/api/print/printers', '_blank');
  },

  openStickerPrintSettings() {
    StickerSystem.showCreateForm && StickerSystem.showCreateForm();
    this.showLsTab('stickers');
  },

  openLabelPrintSettings() {
    this.showView('settings');
  },

  // ---- Create Label Modal ----

  openCreateLabelModal() {
    const modal = document.getElementById('createLabelModal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.clmSelectedTemplate = null;
    this.clmLabelData = {};
    this.clmTireSizeFormat = 'metric';
    document.getElementById('clm-step-select').style.display = 'block';
    document.getElementById('clm-step-fill').style.display = 'none';
    this._renderClmTemplates();
  },

  closeCreateLabelModal() {
    const modal = document.getElementById('createLabelModal');
    if (modal) modal.style.display = 'none';
  },

  _renderClmTemplates() {
    const active = this.templates.filter(t => !t.archived);
    const tire = active.filter(t => t.labelName.toLowerCase().includes('tire'));
    const parts = active.filter(t => t.labelName.toLowerCase().includes('part'));
    const other = active.filter(t => !tire.includes(t) && !parts.includes(t));
    const container = document.getElementById('clm-templates-container');
    if (!container) return;
    let html = '';
    if (active.length === 0) {
      html = '<div class="label-empty-state"><i class="fas fa-tags d-block"></i><h6>No templates found</h6><p>Import or create templates first</p></div>';
    } else {
      if (tire.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F6DE; Tire Templates (' + tire.length + ')</h6><div class="label-creator-chips">';
        tire.forEach(t => { html += '<span class="label-template-chip" onclick="LabelSystem.clmSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
      if (parts.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F527; Parts Templates (' + parts.length + ')</h6><div class="label-creator-chips">';
        parts.forEach(t => { html += '<span class="label-template-chip secondary" onclick="LabelSystem.clmSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
      if (other.length > 0) {
        html += '<div class="label-creator-category"><h6>&#x1F4CB; Other Templates (' + other.length + ')</h6><div class="label-creator-chips">';
        other.forEach(t => { html += '<span class="label-template-chip default" onclick="LabelSystem.clmSelectTemplate(\'' + t.id + '\')">' + this.escHtml(t.labelName) + '</span>'; });
        html += '</div></div>';
      }
    }
    container.innerHTML = html;
  },

  clmSelectTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    this.clmSelectedTemplate = template;

    document.getElementById('clm-step-select').style.display = 'none';
    document.getElementById('clm-step-fill').style.display = 'block';
    document.getElementById('clm-template-name').textContent = template.labelName;
    document.getElementById('clm-alert').style.display = 'none';

    const userName = localStorage.getItem('userName') || (firebase.auth().currentUser ? firebase.auth().currentUser.displayName || firebase.auth().currentUser.email : 'Unknown User');
    const now = new Date();
    const data = {};
    template.fields.forEach(field => {
      switch (field.name.toLowerCase()) {
        case 'created by': data[field.name] = userName; break;
        case 'created date': data[field.name] = now.toLocaleDateString(); break;
        case 'copies to be printed': data[field.name] = '1'; break;
        default: data[field.name] = '';
      }
    });
    this.clmLabelData = data;

    const chipsHtml = template.fields
      .filter(f => f.name === 'Created By' || f.name === 'Created Date')
      .map(f => '<span class="auto-chip">' + this.escHtml(data[f.name] || '') + '</span>')
      .join('');
    document.getElementById('clm-auto-chips').innerHTML = chipsHtml;

    this._renderClmForm();
    this._updateClmPreview();
  },

  clmBackToSelect() {
    document.getElementById('clm-step-select').style.display = 'block';
    document.getElementById('clm-step-fill').style.display = 'none';
    this.clmSelectedTemplate = null;
  },

  _clmPopulatePrinters() {
    const sel = document.getElementById('clm-printer-select');
    if (!sel) return;
    sel.innerHTML = '';
    if (this.printClientPrinters && this.printClientPrinters.length > 0) {
      this.printClientPrinters.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.systemName || p.name;
        opt.textContent = p.name;
        sel.appendChild(opt);
      });
    } else {
      sel.innerHTML = '<option value="" disabled selected>Connect to print server first</option>';
    }
  },

  _renderClmForm() {
    const template = this.clmSelectedTemplate;
    if (!template) return;
    const container = document.getElementById('clm-fields-form');
    if (!container) return;
    const autoFields = new Set(['Created By', 'Created Date', 'Copies to be Printed']);
    const manualFields = template.fields.filter(f => f.showInForm !== false && !autoFields.has(f.name));
    if (manualFields.length === 0) {
      container.innerHTML = '<p class="text-muted small">All fields are auto-filled.</p>';
      return;
    }
    const isTire = template.labelName.toLowerCase().includes('tire');
    let html = '';
    if (isTire) {
      html += '<div class="mb-2"><label class="form-label small fw-semibold">Tire Size Format:</label>' +
        '<div class="d-flex gap-2">' +
        '<button type="button" class="btn btn-sm ' + (this.clmTireSizeFormat === 'metric' ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="LabelSystem.clmSetTireFormat(\'metric\')">Metric</button>' +
        '<button type="button" class="btn btn-sm ' + (this.clmTireSizeFormat === 'standard' ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="LabelSystem.clmSetTireFormat(\'standard\')">Standard</button>' +
        '</div></div>';
    }
    manualFields.forEach(field => {
      const val = this.clmLabelData[field.name] || '';
      const isTireField = field.name.toLowerCase().includes('tire size') || field.name.toLowerCase() === 'tire size';
      let hint = '';
      if (isTireField) {
        hint = this.clmTireSizeFormat === 'metric'
          ? '<small class="text-muted">Width / Aspect Ratio + R + Wheel Diameter &nbsp;<span class="badge bg-light text-secondary border">e.g. 225/65R17</span></small>'
          : '<small class="text-muted">Diameter x Width.Frac + R + Rim &nbsp;<span class="badge bg-light text-secondary border">e.g. 31x10.5R15</span></small>';
      }
      const safeFieldName = this.escHtml(field.name);
      const safeFieldId   = this.escHtml(field.name.replace(/\s+/g, '_'));
      const handler = isTireField
        ? 'oninput="LabelSystem.clmTireSizeInput(\'' + safeFieldName + '\', this)"'
        : 'oninput="LabelSystem.clmFieldChanged(\'' + safeFieldName + '\', this.value)"';
      html += '<div class="mb-2">' +
        '<div class="form-floating">' +
        '<input type="text" class="form-control form-control-sm" id="clm-field-' + safeFieldId + '" ' +
        'value="' + this.escHtml(val) + '" placeholder="' + safeFieldName + '" ' + handler + '>' +
        '<label>' + safeFieldName + '</label>' +
        '</div>' + hint + '</div>';
    });
    container.innerHTML = html;
  },

  _renderClmRotationControls() {
    const template = this.clmSelectedTemplate;
    const container = document.getElementById('clm-rotation-controls');
    if (!container || !template) return;
    container.innerHTML = template.fields.map(f => {
      const rot = (f.rotation !== undefined ? f.rotation : 0);
      return '<div class="d-flex align-items-center gap-2 mb-1">' +
        '<small class="text-muted" style="width:90px;overflow:hidden;white-space:nowrap;">' + this.escHtml(f.name) + '</small>' +
        '<select class="form-select form-select-sm" style="width:80px;" onchange="LabelSystem.clmSetFieldRotation(\'' + this.escHtml(f.name) + '\', parseInt(this.value))">' +
        [0, 90, 180, 270].map(r => '<option value="' + r + '"' + (rot === r ? ' selected' : '') + '>' + r + '°</option>').join('') +
        '</select></div>';
    }).join('');
  },

  clmSetTireFormat(fmt) {
    this.clmTireSizeFormat = fmt;
    this._renderClmForm();
  },

  // Auto-formatter for tire size fields
  _clmFormatTireSize(raw, format) {
    if (!raw) return '';

    if (format === 'metric') {
      // Metric: 225/65R17  (3 digits / 2 digits R 2 digits)
      const d = raw.replace(/\D/g, '').slice(0, 7);
      const width  = d.slice(0, 3);
      const aspect = d.slice(3, 5);
      const rim    = d.slice(5, 7);
      if (!aspect.length) return width;
      if (!rim.length)    return width + '/' + aspect;
      return width + '/' + aspect + 'R' + rim;

    } else {
      // Standard: 31x10.5R15  (2-digit diameter, x, width[.decimal], R, 2-digit rim)
      const upper   = raw.toUpperCase();
      const cleaned = upper.replace(/[^0-9.XR]/g, '');
      const xIdx    = cleaned.indexOf('X');

      if (xIdx === -1) {
        // No x yet — accumulate diameter, then auto-insert x when digits exceed 2
        const digits = cleaned.replace(/[^0-9]/g, '');
        const dia    = digits.slice(0, 2);
        const extra  = digits.slice(2); // these belong after the x
        if (!extra) return dia;
        return dia + 'x' + extra.slice(0, 6); // keep typing
      }

      // x present
      const dia  = cleaned.slice(0, Math.min(xIdx, 2));
      const rest = cleaned.slice(xIdx + 1);
      const rIdx = rest.indexOf('R');

      if (rIdx === -1) {
        // No R yet — width still being typed (may include decimal)
        return dia + 'x' + rest.replace(/[^0-9.]/g, '');
      }

      const width = rest.slice(0, rIdx).replace(/[^0-9.]/g, '');
      const rim   = rest.slice(rIdx + 1).replace(/\D/g, '').slice(0, 2);
      return dia + 'x' + width + 'R' + rim;
    }
  },

  clmTireSizeInput(fieldName, inputEl) {
    const raw       = inputEl.value;
    const formatted = this._clmFormatTireSize(raw, this.clmTireSizeFormat);
    // Only update if different to avoid cursor-jump on non-tire keystrokes
    if (formatted !== raw) {
      const cursorWasAtEnd = inputEl.selectionStart === raw.length;
      inputEl.value = formatted;
      if (cursorWasAtEnd) {
        inputEl.selectionStart = inputEl.selectionEnd = formatted.length;
      }
    }
    this.clmLabelData[fieldName] = formatted;
    this._updateClmPreview();
  },

  clmSetFieldRotation(fieldName, degrees) {
    const template = this.clmSelectedTemplate;
    if (!template) return;
    const field = template.fields.find(f => f.name === fieldName);
    if (field) field.rotation = degrees;
    this._updateClmPreview();
  },

  clmFieldChanged(fieldName, value) {
    this.clmLabelData[fieldName] = value;
    this._updateClmPreview();
  },

  clmPaperSizeChanged(value) {
    this._updateClmPreview();
    this._updateClmPreviewInfo();
  },

  _clmGetPaper() {
    const template = this.clmSelectedTemplate;
    const paperKey = template ? template.paperSize : '';
    return PAPER_SIZES[paperKey] || Object.values(PAPER_SIZES)[0];
  },

  _updateClmPreview() {
    const template = this.clmSelectedTemplate;
    if (!template) return;
    const paper = this._clmGetPaper();
    const box = document.getElementById('clm-preview-box');
    if (!box) return;
    LabelPdfGenerator.generatePreviewImage(template, this.clmLabelData, paper).then(dataUrl => {
      box.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:280px;border:1px solid #ddd;">';
    }).catch(() => {
      box.innerHTML = '<p class="text-muted small">Preview unavailable</p>';
    });
    this._updateClmPreviewInfo();
  },

  _updateClmPreviewInfo() {
    const paper = this._clmGetPaper();
    const infoEl = document.getElementById('clm-preview-info');
    if (infoEl && paper) {
      const pxW = Math.round((paper.width / 25.4) * 96);
      const pxH = Math.round((paper.height / 25.4) * 96);
      infoEl.textContent = 'Size: ' + pxW + ' x ' + pxH + ' pixels\nThis preview updates in real-time as you fill the form';
    }
  },

  clmPrint() {
    const template = this.clmSelectedTemplate;
    if (!template) return;
    const paper = this._clmGetPaper();
    LabelPdfGenerator.generateLabelPdf(template, this.clmLabelData, 1).then(pdfBytes => {
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    }).catch(err => {
      const alertEl = document.getElementById('clm-alert');
      if (alertEl) { alertEl.textContent = 'Print failed: ' + err.message; alertEl.style.display = 'block'; }
    });
  },

  // ---- Save Created Label ----
  async clmSave() {
    const template = this.clmSelectedTemplate;
    if (!template) return;
    const saveBtn = document.getElementById('clm-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...'; }
    try {
      await this.saveCreatedLabel(template, this.clmLabelData);
      this.closeCreateLabelModal();
      if (this.currentLsTab === 'create-labels') this.renderCreateLabelsView();
    } catch (err) {
      const alertEl = document.getElementById('clm-alert');
      if (alertEl) { alertEl.textContent = 'Save failed: ' + err.message; alertEl.style.display = 'block'; }
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>SAVE'; }
    }
  },

  async saveCreatedLabel(template, labelData) {
    const user = firebase.auth().currentUser;
    const createdBy = (user ? (user.displayName || user.email) : localStorage.getItem('userName')) || 'Unknown';
    const doc = {
      templateId: template.id,
      templateName: template.labelName,
      labelName: template.labelName,
      category: template.labelName.toLowerCase().includes('tire') ? 'tire'
               : template.labelName.toLowerCase().includes('part') ? 'parts' : 'other',
      fields: labelData,
      archived: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy
    };
    await this.getDb().collection('saved_labels').add(doc);
  },

  async loadSavedLabels() {
    try {
      const snap = await this.getDb().collection('saved_labels').orderBy('createdAt', 'desc').get();
      this.savedLabels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      this.savedLabels = [];
    }
  },

  _labelFieldTags(fields) {
    if (!fields || typeof fields !== 'object') return '';
    const skip = new Set(['created by', 'created date', 'copies to be printed']);
    return Object.entries(fields)
      .filter(([k, v]) => v && String(v).trim() && !skip.has(k.toLowerCase()))
      .map(([k, v]) => '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#f0f4ff;border:1px solid #d0daf5;font-size:0.73rem;color:#374ab5;margin:2px 2px 2px 0;">' +
        this.escHtml(k) + ': <strong>' + this.escHtml(String(v)) + '</strong></span>')
      .join('');
  },

  _labelCardHtml(label, isArchived) {
    const ts = label.createdAt && label.createdAt.toDate ? label.createdAt.toDate() : new Date(label.createdAt || 0);
    const dateStr = ts ? ts.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) + ' ' +
      ts.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    const fieldTags = this._labelFieldTags(label.fields);
    return '<div class="d-flex align-items-start justify-content-between py-2 border-bottom gap-2">' +
      '<div style="flex:1;min-width:0;">' +
        '<strong class="small">' + this.escHtml(label.templateName || label.labelName) + '</strong>' +
        (fieldTags ? '<div class="mt-1">' + fieldTags + '</div>' : '') +
        '<div class="mt-1"><small class="text-muted">By ' + this.escHtml(label.createdBy || '') + ' &bull; ' + this.escHtml(dateStr) + '</small></div>' +
      '</div>' +
      '<div class="d-flex gap-1 flex-shrink-0">' +
        (!isArchived ? '<button class="btn btn-sm btn-outline-primary" onclick="LabelSystem.reprintLabel(\'' + label.id + '\')" title="Reprint"><i class="fas fa-print"></i></button>' : '') +
        (!isArchived
          ? '<button class="btn btn-sm btn-outline-secondary" onclick="LabelSystem.archiveLabel(\'' + label.id + '\')" title="Archive"><i class="fas fa-archive"></i></button>'
          : '<button class="btn btn-sm btn-outline-success" onclick="LabelSystem.unarchiveLabel(\'' + label.id + '\')" title="Restore"><i class="fas fa-undo"></i></button>') +
        '<button class="btn btn-sm btn-outline-danger" onclick="LabelSystem.deleteSavedLabel(\'' + label.id + '\')" title="Delete"><i class="fas fa-trash"></i></button>' +
      '</div>' +
    '</div>';
  },

  renderSavedLabels(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const labels = (this.savedLabels || []).filter(l => !l.archived);
    if (labels.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted border rounded">' +
        '<p class="mb-1 fw-semibold">No labels found</p>' +
        '<p class="small mb-0">Click the "Create Label" button above to create your first label</p>' +
        '</div>';
      return;
    }
    const grouped = { tire: [], parts: [], other: [] };
    labels.forEach(l => {
      const cat = l.category || 'other';
      if (grouped[cat]) grouped[cat].push(l); else grouped.other.push(l);
    });
    const groupLabels = { tire: 'Tire Labels', parts: 'Parts Labels', other: 'Other Labels' };
    let html = '';
    Object.entries(grouped).forEach(([cat, items]) => {
      if (items.length === 0) return;
      html += '<div class="mb-3"><h6 class="text-muted small text-uppercase fw-bold mb-2">' + this.escHtml(groupLabels[cat] || cat) + '</h6>';
      items.forEach(label => { html += this._labelCardHtml(label, false); });
      html += '</div>';
    });
    container.innerHTML = html;
  },

  renderArchivedLabels(query) {
    const container = document.getElementById('cl-archived-list');
    if (!container) return;
    let labels = (this.savedLabels || []).filter(l => l.archived);
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      labels = labels.filter(l => {
        if ((l.templateName || l.labelName || '').toLowerCase().includes(q)) return true;
        if ((l.createdBy || '').toLowerCase().includes(q)) return true;
        if (l.fields) {
          return Object.values(l.fields).some(v => String(v || '').toLowerCase().includes(q));
        }
        return false;
      });
    }
    if (labels.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted border rounded">' +
        '<p class="mb-1 fw-semibold">' + (query ? 'No results for "' + this.escHtml(query) + '"' : 'No archived labels') + '</p>' +
        '</div>';
      return;
    }
    const grouped = { tire: [], parts: [], other: [] };
    labels.forEach(l => {
      const cat = l.category || 'other';
      if (grouped[cat]) grouped[cat].push(l); else grouped.other.push(l);
    });
    const groupLabels = { tire: 'Tire Labels', parts: 'Parts Labels', other: 'Other Labels' };
    let html = '';
    Object.entries(grouped).forEach(([cat, items]) => {
      if (items.length === 0) return;
      html += '<div class="mb-3"><h6 class="text-muted small text-uppercase fw-bold mb-2">' + this.escHtml(groupLabels[cat] || cat) + '</h6>';
      items.forEach(label => { html += this._labelCardHtml(label, true); });
      html += '</div>';
    });
    container.innerHTML = html;
  },

  async archiveLabel(labelId) {
    try {
      await this.getDb().collection('saved_labels').doc(labelId).update({ archived: true });
      const lbl = (this.savedLabels || []).find(l => l.id === labelId);
      if (lbl) lbl.archived = true;
      this.renderSavedLabels('cl-labels-list');
      this.renderArchivedLabels(document.getElementById('cl-archive-search') ? document.getElementById('cl-archive-search').value : '');
    } catch (err) { alert('Archive failed: ' + err.message); }
  },

  async unarchiveLabel(labelId) {
    try {
      await this.getDb().collection('saved_labels').doc(labelId).update({ archived: false });
      const lbl = (this.savedLabels || []).find(l => l.id === labelId);
      if (lbl) lbl.archived = false;
      this.renderSavedLabels('cl-labels-list');
      this.renderArchivedLabels(document.getElementById('cl-archive-search') ? document.getElementById('cl-archive-search').value : '');
    } catch (err) { alert('Restore failed: ' + err.message); }
  },

  async deleteSavedLabel(labelId) {
    if (!confirm('Delete this saved label?')) return;
    try {
      await this.getDb().collection('saved_labels').doc(labelId).delete();
      this.savedLabels = (this.savedLabels || []).filter(l => l.id !== labelId);
      this.renderSavedLabels('cl-labels-list');
      this.renderArchivedLabels(document.getElementById('cl-archive-search') ? document.getElementById('cl-archive-search').value : '');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  },

  async reprintLabel(labelId) {
    const label = (this.savedLabels || []).find(l => l.id === labelId);
    if (!label) return;
    const template = this.templates.find(t => t.id === label.templateId);
    if (!template) { alert('Template not found — it may have been deleted.'); return; }
    const paperKey = template.paperSize || (typeof DEFAULT_PAPER_SIZE !== 'undefined' ? DEFAULT_PAPER_SIZE : '');
    const paper = PAPER_SIZES[paperKey] || Object.values(PAPER_SIZES)[0];
    LabelPdfGenerator.generateLabelPdf(template, label.fields, paper, 1).then(pdfBytes => {
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    });
  },

  // ---- Create Labels View ----
  async renderCreateLabelsView() {
    StickerSystem.init && StickerSystem.init();
    await this.loadSavedLabels();
    this.renderSavedLabels('cl-labels-list');
    this.renderArchivedLabels('');
    this._renderClStickerList();
    // Default to active tab
    this._showClSubTab('active');
  },

  _showClSubTab(tab) {
    ['active', 'archived'].forEach(t => {
      const btn = document.getElementById('cl-subtab-' + t);
      const panel = document.getElementById('cl-subpanel-' + t);
      if (btn) btn.classList.toggle('active', t === tab);
      if (panel) panel.style.display = t === tab ? 'block' : 'none';
    });
  },

  _renderClStickerList() {
    const target = document.getElementById('cl-sticker-list');
    if (!target) return;
    const stickers = StickerSystem.stickers || [];
    if (stickers.length === 0) {
      target.innerHTML = '<div class="text-center py-4 text-muted border rounded">' +
        '<p class="mb-1 fw-semibold">No stickers found</p>' +
        '<p class="small mb-0">Click the "Oil Sticker" button above to create your first sticker</p>' +
        '</div>';
      return;
    }
    const oilNames = {
      conv: 'Conventional Oil', super: 'Super Synthetic', mobil1: 'Mobil 1', rotella: 'Rotella', delvac: 'Delvac 1', custom: 'Custom'
    };
    let html = '';
    stickers.forEach(s => {
      const oilLabel = oilNames[s.oilTypeKey] || s.oilTypeKey || 'Unknown';
      const ts = s.createdAt && s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      const dateStr = ts ? (ts.toLocaleDateString('en-US', {month:'short', day:'numeric'})) + ' ' + ts.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
      html += '<div class="d-flex align-items-center justify-content-between py-2 border-bottom">' +
        '<div>' +
          '<strong class="small"><i class="fas fa-gas-pump me-1 text-primary"></i>' + this.escHtml(oilLabel) + '</strong>' +
          '<br><small class="text-muted">' + this.escHtml(s.vehicleInfo || s.vin || '') + '</small>' +
          (s.vin ? '<br><small class="text-muted font-monospace">' + this.escHtml(s.vin) + '</small>' : '') +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
          (s.mileage ? '<span class="badge bg-info text-dark">' + Number(s.mileage).toLocaleString() + 'Mi</span>' : '') +
          '<small class="text-muted">' + this.escHtml(dateStr) + '</small>' +
          '<button class="btn btn-sm btn-outline-primary" onclick="StickerSystem.reprintSticker(\'' + s.id + '\')" title="Print"><i class="fas fa-print"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" onclick="StickerSystem.deleteSticker(\'' + s.id + '\');LabelSystem._renderClStickerList();" title="Delete"><i class="fas fa-times text-danger"></i></button>' +
        '</div>' +
      '</div>';
    });
    target.innerHTML = html;
  },

  // ---- Create Sticker Modal ----
  openCreateStickerModal() {
    const modal = document.getElementById('createStickerModal');
    if (!modal) return;
    document.getElementById('csm-vin').value = '';
    document.getElementById('csm-mileage').value = '';
    const statusEl = document.getElementById('csm-vin-status');
    if (statusEl) { statusEl.textContent = '0/17 characters'; statusEl.className = 'text-muted small'; }
    const vehicleInfo = document.getElementById('csm-vehicle-info');
    if (vehicleInfo) vehicleInfo.style.display = 'none';
    document.getElementById('csm-alert').style.display = 'none';
    document.querySelectorAll('.csm-oil-btn').forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-outline-secondary'); });
    this._csmSelectedOil = null;
    this._csmDecodedVin = null;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    // Init canvas after modal animation completes
    modal.addEventListener('shown.bs.modal', () => { this._csmRenderPreview(); }, { once: true });
  },

  closeCreateStickerModal() {
    const modal = document.getElementById('createStickerModal');
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  },

  csmOnVinInput(value) {
    const clean = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').substring(0, 17);
    const el = document.getElementById('csm-vin');
    if (el) el.value = clean;
    const statusEl = document.getElementById('csm-vin-status');
    const vehicleInfo = document.getElementById('csm-vehicle-info');
    if (clean.length === 17) {
      if (statusEl) { statusEl.textContent = 'Auto-decoding VIN...'; statusEl.className = 'text-info small'; }
      if (vehicleInfo) vehicleInfo.style.display = 'none';
      this._csmDecodedVin = null;
      this.csmDecodeVin(clean);
    } else {
      if (statusEl) { statusEl.textContent = clean.length + '/17 characters'; statusEl.className = 'text-muted small'; }
      if (vehicleInfo) vehicleInfo.style.display = 'none';
      this._csmDecodedVin = null;
    }
  },

  async csmDecodeVin(vin) {
    try {
      const resp = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' + vin + '?format=json');
      const json = await resp.json();
      const r = json.Results && json.Results[0] ? json.Results[0] : {};
      this._csmDecodedVin = {
        year: r.ModelYear || '',
        make: r.Make || '',
        model: r.Model || '',
        engineL: r.DisplacementL || '',
        engineCylinders: r.EngineCylinders || ''
      };
      const parts = [this._csmDecodedVin.year, this._csmDecodedVin.make, this._csmDecodedVin.model].filter(Boolean);
      if (this._csmDecodedVin.engineL) parts.push(this._csmDecodedVin.engineL + 'L');
      if (this._csmDecodedVin.engineCylinders) parts.push(this._csmDecodedVin.engineCylinders + ' cyl');
      const vehicleText = parts.join(' ') || 'No data found';
      const textEl = document.getElementById('csm-vehicle-text');
      const vehicleInfo = document.getElementById('csm-vehicle-info');
      const statusEl = document.getElementById('csm-vin-status');
      if (textEl) textEl.textContent = vehicleText;
      if (vehicleInfo) vehicleInfo.style.display = 'block';
      if (statusEl) { statusEl.textContent = 'VIN decoded successfully'; statusEl.className = 'text-success small'; }
      this._csmUpdateCanvas();
    } catch (err) {
      const statusEl = document.getElementById('csm-vin-status');
      if (statusEl) { statusEl.textContent = 'Decode failed — check your connection'; statusEl.className = 'text-danger small'; }
    }
  },

  // ---- Modal Sticker Preview (static canvas, no CanvasEditor) ----

  _csmRenderPreview() {
    const viewport = document.getElementById('csm-canvas-viewport');
    if (!viewport) return;

    const paper = STICKER_PAPER_SIZES['GODEX'];
    const data = this._csmBuildData();
    const paperAspect = paper.height / paper.width; // portrait ~1.378 for GODEX

    // Fixed canvas width to match the right column (196px border box → 192px inner)
    // Height derived from paper aspect ratio so the full sticker is always visible
    const canvasW = 192;
    const canvasH = Math.round(canvasW * paperAspect);

    // Reuse or create the canvas element
    let canvas = viewport.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'display:block;border-radius:4px;';
      viewport.innerHTML = '';
      viewport.appendChild(canvas);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = canvasH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Font size formula: fontSize(pt) * 0.35(pt→mm) * scale(mm→canvasPx)
    // DPI factors cancel, so: basePt * elScale * 0.35 * (canvasW / paper.width)
    const mmToCanvasPx = canvasW / paper.width;

    // Draw each sticker element
    for (const el of STICKER_LAYOUT.elements) {
      let text = el.content;
      text = text
        .replace('{serviceDate}',    data.nextServiceDate   || '')
        .replace('{serviceMileage}', data.nextServiceMileage ? data.nextServiceMileage + ' mi' : '')
        .replace('{oilType}',        data.oilTypeName       || '')
        .replace('{decodedDetails}', data.vehicleDetails    || '');
      if (!text) continue;

      const x = (el.x / 100) * canvasW;
      const y = (el.y / 100) * canvasH;
      const fontSizePx = Math.max(STICKER_LAYOUT.fontSize * el.fontSize * 0.35 * mmToCanvasPx, 5);

      ctx.font = (el.bold ? 'bold ' : '') + fontSizePx + 'px ' + (STICKER_LAYOUT.fontFamily || 'Helvetica');
      ctx.fillStyle = '#000000';
      ctx.textAlign = el.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    }
  },

  _csmBuildData() {
    const vin = (document.getElementById('csm-vin') || {}).value || '';
    const oilKey = this._csmSelectedOil || '';
    const mileageStr = (document.getElementById('csm-mileage') || {}).value || '';
    const oilType = OIL_TYPES[oilKey];
    const mileage = parseInt(mileageStr) || 0;
    const today = new Date();
    let nextServiceDate = '';
    let nextServiceMileage = '';
    if (oilType) {
      const d = new Date(today);
      d.setDate(d.getDate() + oilType.durationDays);
      nextServiceDate = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      nextServiceMileage = mileage ? (mileage + oilType.mileageInterval).toLocaleString() : '';
    }
    const decoded = this._csmDecodedVin;
    const vehicleDetails = decoded
      ? [decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ')
      : (vin || '');
    return {
      nextServiceDate,
      nextServiceMileage,
      oilTypeName: oilType ? oilType.name : '',
      vehicleDetails
    };
  },

  _csmUpdateCanvas() {
    this._csmRenderPreview();
  },

  csmSelectOil(btn) {
    document.querySelectorAll('.csm-oil-btn').forEach(b => {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-outline-secondary');
    });
    btn.classList.remove('btn-outline-secondary');
    btn.classList.add('btn-primary', 'active');
    this._csmSelectedOil = btn.dataset.oil;
    this._csmUpdateCanvas();
  },

  async createStickerSimple() {
    const vin = (document.getElementById('csm-vin') || {}).value || '';
    const mileage = (document.getElementById('csm-mileage') || {}).value || '';
    const oilKey = this._csmSelectedOil;
    const alertEl = document.getElementById('csm-alert');

    if (!vin || vin.length < 3) {
      if (alertEl) { alertEl.textContent = 'Please enter a VIN number.'; alertEl.style.display = 'block'; }
      return;
    }
    if (!oilKey) {
      if (alertEl) { alertEl.textContent = 'Please select an oil type.'; alertEl.style.display = 'block'; }
      return;
    }
    if (!mileage) {
      if (alertEl) { alertEl.textContent = 'Please enter the current mileage.'; alertEl.style.display = 'block'; }
      return;
    }

    if (alertEl) alertEl.style.display = 'none';
    const oilType = OIL_TYPES[oilKey];
    const serviceDate = new Date().toISOString().split('T')[0];
    const decoded = this._csmDecodedVin;
    const vehicleInfoText = decoded
      ? [decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ')
      : vin.toUpperCase();
    const stickerData = {
      vin: vin.toUpperCase(),
      mileage: parseInt(mileage),
      oilTypeKey: oilKey,
      oilTypeName: oilType ? oilType.name : oilKey,
      serviceDate: serviceDate,
      vehicleInfo: vehicleInfoText,
      decodedDetails: decoded ? [decoded.year, decoded.make, decoded.model, decoded.engineL ? decoded.engineL + 'L' : '', decoded.engineCylinders ? decoded.engineCylinders + ' cyl' : ''].filter(Boolean).join(' ') : '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      printed: false
    };

    try {
      await StickerSystem.getDb().collection('static_stickers').add(stickerData);
      this.closeCreateStickerModal();
      await StickerSystem.loadStickers();
      if (this.currentLsTab === 'create-labels') this._renderClStickerList();
    } catch (err) {
      if (alertEl) { alertEl.textContent = 'Failed to save sticker: ' + err.message; alertEl.style.display = 'block'; }
    }
  }
};

// ============================================================
// STATIC STICKER SYSTEM (Oil Change Stickers)
// Ported from Inspectionapp sticker system — all sticker types with QR codes
// ============================================================

const STICKER_PAPER_SIZES = {
  'GODEX':         { name: 'GODEX (1.8125×2.5 in)',   width: 46.04, height: 63.5 },
  'Dymo200i':      { name: 'Dymo 200i Label',         width: 46.1, height: 63.5 },
  'DymoStd':       { name: 'Dymo Standard Label',     width: 25.4, height: 76.2 },
  'BrotherSmall':  { name: 'Brother Small Label',      width: 36,   height: 89 },
  '29mmx90mm':     { name: 'Brother DK1201',           width: 90,   height: 29 },
  'Letter':        { name: 'Letter (8.5×11)',           width: 216,  height: 279 },
  'A4':            { name: 'A4',                        width: 210,  height: 297 },
  'Legal':         { name: 'Legal (8.5×14)',            width: 216,  height: 356 },
  '4x6':           { name: '4×6 in',                    width: 102,  height: 152 },
  '5x7':           { name: '5×7 in',                    width: 127,  height: 178 }
};

const OIL_TYPES = {
  'conv':    { name: 'Conventional Oil', durationDays: 90,  mileageInterval: 3000 },
  'super':   { name: 'Super Synthetic',  durationDays: 180, mileageInterval: 7000 },
  'mobil1':  { name: 'Mobil 1',          durationDays: 365, mileageInterval: 10000 },
  'rotella': { name: 'Rotella',          durationDays: 90,  mileageInterval: 3000 },
  'delvac':  { name: 'Delvac 1',         durationDays: 365, mileageInterval: 10000 }
};

// Premade sticker templates — one per oil type + custom
const STICKER_TEMPLATES = {
  'oil_conv':   { name: 'Conventional Oil Sticker', oilTypeKey: 'conv',   description: 'Standard oil change reminder sticker', color: '#4a90d9' },
  'oil_super':  { name: 'Super Synthetic Sticker',  oilTypeKey: 'super',  description: 'Extended synthetic oil change sticker', color: '#e67e22' },
  'oil_mobil1': { name: 'Mobil 1 Sticker',          oilTypeKey: 'mobil1', description: 'Premium full synthetic oil change sticker', color: '#e74c3c' },
  'oil_rotella':{ name: 'Rotella Sticker',           oilTypeKey: 'rotella', description: 'Diesel engine Rotella oil sticker', color: '#27ae60' },
  'oil_delvac': { name: 'Delvac 1 Sticker',         oilTypeKey: 'delvac', description: 'Heavy-duty diesel Delvac 1 sticker', color: '#8e44ad' },
  'oil_custom': { name: 'Custom Sticker',            oilTypeKey: '',      description: 'Blank — choose oil type manually', color: '#95a5a6' }
};

const STICKER_LAYOUT = {
  fontSize: 8,
  fontFamily: 'Helvetica',
  margins: { top: 2, bottom: 2, left: 2, right: 2 },
  qrCodeSize: 14, // mm
  qrCodePosition: { x: 50, y: 80 }, // percentage of available area
  elements: [
    { id: 'header',         label: 'Header',          content: 'Next Service Due',  x: 50, y: 25, fontSize: 1.50, bold: true,  align: 'center' },
    { id: 'serviceDate',    label: 'Service Date',    content: '{serviceDate}',     x: 10, y: 34, fontSize: 1.25,  bold: false, align: 'left' },
    { id: 'serviceMileage', label: 'Service Mileage', content: '{serviceMileage}',  x: 90, y: 34, fontSize: 1.25,  bold: false, align: 'right' },
    { id: 'oilType',        label: 'Oil Type',        content: '{oilType}',         x: 50, y: 41, fontSize: 1.25,  bold: false, align: 'center' },
    { id: 'companyName',    label: 'Company Name',    content: 'Quality Lube Express', x: 50, y: 48, fontSize: 1.50, bold: true,  align: 'center' },
    { id: 'address',        label: 'Address',         content: '3617 HWY 19 Zachary LA 70791', x: 50, y: 54, fontSize: 1.00, bold: false, align: 'center' },
    { id: 'message',        label: 'Thank You',       content: 'THANK YOU',          x: 50, y: 60, fontSize: 1.25, bold: true,  align: 'center' },
    { id: 'decodedDetails', label: 'Vehicle Details',  content: '{decodedDetails}',  x: 50, y: 65, fontSize: 0.7,  bold: false, align: 'center' }
  ]
};

const StickerSystem = {
  stickers: [],
  decodedVin: null,
  initialized: false,
  activeTemplate: null,
  qrDataUrlCache: {},

  init() {
    if (!this.initialized) {
      this.initialized = true;
      this.loadStickerSettings();
      const dateEl = document.getElementById('sticker-date');
      if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
    }
    // Always refresh printers — they may have loaded after initial init
    this.populatePrinters();
    // If no printers yet, trigger a print server connect
    if ((LabelSystem.printClientPrinters || []).length === 0) {
      LabelSystem.testPrintClientConnection();
    }
    this.loadStickers();
  },

  // ---- Templates ----
  useTemplate(templateId) {
    const tpl = STICKER_TEMPLATES[templateId];
    if (!tpl) return;
    this.activeTemplate = templateId;
    this.showCreateForm();
    // Pre-select oil type
    if (tpl.oilTypeKey) {
      document.getElementById('sticker-oil-type').value = tpl.oilTypeKey;
    }
    // Show template badge
    const badge = document.getElementById('sticker-template-badge');
    const badgeName = document.getElementById('sticker-template-name-badge');
    if (badge && badgeName) {
      badgeName.innerHTML = '<i class="fas fa-oil-can me-1"></i>' + this.esc(tpl.name);
      badgeName.style.background = tpl.color;
      badge.style.display = 'block';
    }
    this.updatePreview();
  },

  // ---- Firebase CRUD ----
  getDb() { return firebase.firestore(); },

  async loadStickers() {
    try {
      const snapshot = await this.getDb().collection('static_stickers')
        .orderBy('createdDate', 'desc').limit(50).get();
      this.stickers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.renderStickerList();
    } catch (err) {
      console.error('Failed to load stickers:', err);
      this.stickers = [];
      this.renderStickerList();
    }
  },

  async saveSticker(data) {
    const docRef = await this.getDb().collection('static_stickers').add({
      ...data,
      createdDate: new Date().toISOString(),
      printed: false,
      archived: false
    });
    return docRef.id;
  },

  async markPrinted(id) {
    await this.getDb().collection('static_stickers').doc(id).update({
      printed: true, lastUpdated: new Date().toISOString()
    });
  },

  async deleteSticker(id) {
    if (!confirm('Delete this sticker permanently?')) return;
    await this.getDb().collection('static_stickers').doc(id).delete();
    await this.loadStickers();
  },

  // ---- UI ----
  showCreateForm() {
    document.getElementById('sticker-create-form').style.display = 'block';
    document.getElementById('sticker-alert').style.display = 'none';
    const dateEl = document.getElementById('sticker-date');
    if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
    this.populatePrinters();
    this._initStickerCanvas();
  },

  _initStickerCanvas() {
    const paperEl = document.getElementById('sticker-paper-size');
    const paperKey = paperEl ? paperEl.value : 'GODEX';
    const paper = STICKER_PAPER_SIZES[paperKey] || STICKER_PAPER_SIZES['GODEX'];
    const self = this;

    // Convert sticker layout elements to canvas elements
    const canvasElements = STICKER_LAYOUT.elements.map(el => ({
      id: el.id,
      name: el.label || el.id,
      text: el.content,
      _type: 'sticker',
      x: el.x,    // percentage coords stored directly for stickers
      y: el.y,
      position: { x: el.x, y: el.y },
      fontSize: Math.round(STICKER_LAYOUT.fontSize * el.fontSize),
      fontFamily: STICKER_LAYOUT.fontFamily || 'Helvetica',
      textAlign: el.align || 'center',
      color: '#000000',
      bold: !!el.bold,
      rotation: 0,
      showInForm: true
    }));

    setTimeout(() => {
      const viewport = document.getElementById('se-canvas-viewport');
      if (!viewport) return;

      // Use a separate CanvasEditor instance for stickers (stored on StickerSystem)
      if (!this._stickerEditor) {
        this._stickerEditor = Object.create(CanvasEditor);
      }
      this._stickerEditor.init(viewport, {
        paperWidth: paper.width,
        paperHeight: paper.height,
        elements: canvasElements,
        showGrid: false,
        showRulers: false,
        onSelectionChange(sel) {
          self._seUpdatePropsPanel(sel);
        },
        onElementsChange(elements) {
          // Sticker elements updated
        }
      });
      this._seUpdateDataOnCanvas();
    }, 80);
  },

  _seUpdateDataOnCanvas() {
    // Update element text based on form data
    if (!this._stickerEditor || !this._stickerEditor.elements) return;
    const data = this.getStickerData();
    this._stickerEditor.elements.forEach(el => {
      let text = el.text || '';
      if (data) {
        text = (STICKER_LAYOUT.elements.find(e => e.id === el.id) || {}).content || text;
        text = text
          .replace('{serviceDate}', data.nextServiceDate || '')
          .replace('{serviceMileage}', (data.nextServiceMileage || '') + ' mi')
          .replace('{oilType}', data.oilTypeName || '')
          .replace('{decodedDetails}', data.vehicleDetails || '');
      }
      el.text = text;
    });
    this._stickerEditor.render();
  },

  _seUpdatePropsPanel(el) {
    const empty = document.getElementById('se-props-empty');
    const content = document.getElementById('se-props-content');
    if (!el) {
      if (empty) empty.style.display = 'flex';
      if (content) content.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (content) content.style.display = 'block';

    const nameEl = document.getElementById('se-prop-name');
    if (nameEl) nameEl.textContent = el.name || el.id;
    const textEl = document.getElementById('se-prop-text');
    if (textEl) textEl.value = el.text || '';
    const xEl = document.getElementById('se-prop-x');
    if (xEl) xEl.value = el.position ? el.position.x : 0;
    const yEl = document.getElementById('se-prop-y');
    if (yEl) yEl.value = el.position ? el.position.y : 0;
    const fsEl = document.getElementById('se-prop-fontsize');
    if (fsEl) fsEl.value = el.fontSize || 8;
    const fsVal = document.getElementById('se-prop-fontsize-val');
    if (fsVal) fsVal.textContent = (el.fontSize || 8) + 'px';
    const boldEl = document.getElementById('se-prop-bold');
    if (boldEl) boldEl.classList.toggle('active', !!el.bold);
    ['left', 'center', 'right'].forEach(a => {
      const btn = document.getElementById('se-align-' + a);
      if (btn) btn.classList.toggle('active', (el.textAlign || 'center') === a);
    });
  },

  seUpdateProp(prop, value) {
    if (!this._stickerEditor) return;
    const sel = this._stickerEditor.getSelectedElement();
    if (!sel) return;
    const update = {};
    if (prop === 'x') {
      update.x = parseFloat(value);
      update.position = { ...sel.position, x: parseFloat(value) };
    } else if (prop === 'y') {
      update.y = parseFloat(value);
      update.position = { ...sel.position, y: parseFloat(value) };
    } else if (prop === 'fontSize') {
      update.fontSize = parseInt(value);
    } else if (prop === 'text') {
      update.text = value;
    } else if (prop === 'textAlign') {
      update.textAlign = value;
      update.align = value;
    } else {
      update[prop] = value;
    }
    this._stickerEditor.updateElement(sel.id, update);
  },

  seToggleBold() {
    if (!this._stickerEditor) return;
    const sel = this._stickerEditor.getSelectedElement();
    if (!sel) return;
    this._stickerEditor.updateElement(sel.id, { bold: !sel.bold });
  },

  seToggleGrid() {
    if (!this._stickerEditor) return;
    this._stickerEditor.showGrid = !this._stickerEditor.showGrid;
    const btn = document.getElementById('se-toggle-grid');
    if (btn) btn.classList.toggle('active', this._stickerEditor.showGrid);
    this._stickerEditor.render();
  },

  seZoomFit() {
    if (this._stickerEditor) {
      this._stickerEditor.fitToView();
      const lbl = document.getElementById('se-zoom-label');
      if (lbl) lbl.textContent = Math.round(this._stickerEditor.zoom * 100) + '%';
    }
  },

  seUndo() { if (this._stickerEditor) this._stickerEditor.undo(); },
  seRedo() { if (this._stickerEditor) this._stickerEditor.redo(); },

  onDataChange() {
    this._seUpdateDataOnCanvas();
    this.updateButtons();
  },

  onPaperChange() {
    const paperEl = document.getElementById('sticker-paper-size');
    const paperKey = paperEl ? paperEl.value : 'GODEX';
    const paper = STICKER_PAPER_SIZES[paperKey] || STICKER_PAPER_SIZES['GODEX'];
    if (this._stickerEditor) {
      this._stickerEditor.setPaper(paper.width, paper.height);
    }
  },

  hideCreateForm() {
    document.getElementById('sticker-create-form').style.display = 'none';
    if (this._stickerEditor) {
      this._stickerEditor.destroy();
      this._stickerEditor = null;
    }
    this.resetForm();
  },

  resetForm() {
    document.getElementById('sticker-vin').value = '';
    document.getElementById('sticker-mileage').value = '';
    document.getElementById('sticker-oil-type').value = '';
    document.getElementById('sticker-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sticker-copies').value = '1';
    document.getElementById('sticker-qr-enabled').checked = true;
    document.getElementById('sticker-vehicle-info').style.display = 'none';
    document.getElementById('sticker-vin-status').textContent = 'Enter full 17-character VIN';
    const badge = document.getElementById('sticker-template-badge');
    if (badge) badge.style.display = 'none';
    this.decodedVin = null;
    this.activeTemplate = null;
    this.updateButtons();
  },

  populatePrinters() {
    const select = document.getElementById('sticker-printer-select');
    if (!select) return;
    select.innerHTML = '';
    const printers = LabelSystem.printClientPrinters || [];
    // Only show GODEX printers for static stickers
    const godexPrinters = printers.filter(p => (p.name || '').toUpperCase().includes('GODEX') || (p.systemName || '').toUpperCase().includes('GODEX'));
    if (godexPrinters.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = printers.length > 0 ? '\u26a0 No GODEX printer found' : 'No printers detected';
      opt.disabled = true;
      select.appendChild(opt);
    }
    godexPrinters.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + (p.status ? ' (' + p.status + ')' : '');
      opt.dataset.systemName = p.systemName || p.name;
      select.appendChild(opt);
    });
  },

  onVinInput(value) {
    const clean = value.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase().substring(0, 17);
    document.getElementById('sticker-vin').value = clean;
    const btn = document.getElementById('sticker-decode-btn');
    if (clean.length === 17) {
      document.getElementById('sticker-vin-status').textContent = 'Auto-decoding...';
      document.getElementById('sticker-vin-status').className = 'text-info small';
      btn.disabled = false;
      // Auto-decode as soon as 17 characters are entered
      this.decodeVin();
    } else {
      document.getElementById('sticker-vin-status').textContent = clean.length + '/17 characters';
      document.getElementById('sticker-vin-status').className = 'text-muted small';
      btn.disabled = true;
      document.getElementById('sticker-vehicle-info').style.display = 'none';
      this.decodedVin = null;
    }
    this.updateButtons();
    this.updatePreview();
  },

  async decodeVin() {
    const vin = document.getElementById('sticker-vin').value;
    if (vin.length !== 17) return;
    document.getElementById('sticker-decode-btn').disabled = true;
    document.getElementById('sticker-vin-status').textContent = 'Decoding...';
    document.getElementById('sticker-vin-status').className = 'text-info small';
    try {
      const resp = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' + vin + '?format=json');
      const json = await resp.json();
      const r = json.Results && json.Results[0] ? json.Results[0] : {};
      this.decodedVin = {
        year: r.ModelYear || '',
        make: r.Make || '',
        model: r.Model || '',
        engineL: r.DisplacementL || '',
        engineCylinders: r.EngineCylinders || '',
        trim: r.Trim || '',
        bodyType: r.BodyClass || '',
        driveType: r.DriveType || '',
        transmission: r.TransmissionStyle || '',
        fuelType: r.FuelTypePrimary || '',
        manufacturer: r.Manufacturer || ''
      };
      const parts = [this.decodedVin.year, this.decodedVin.make, this.decodedVin.model].filter(Boolean);
      if (this.decodedVin.engineL) parts.push(this.decodedVin.engineL + 'L');
      if (this.decodedVin.engineCylinders) parts.push(this.decodedVin.engineCylinders + ' cyl');
      const vehicleText = parts.join(' ') || 'No data found';
      document.getElementById('sticker-vehicle-text').textContent = vehicleText;
      document.getElementById('sticker-vehicle-info').style.display = 'block';
      document.getElementById('sticker-vin-status').textContent = 'VIN decoded successfully';
      document.getElementById('sticker-vin-status').className = 'text-success small';
    } catch (err) {
      document.getElementById('sticker-vin-status').textContent = 'Decode failed \u2014 ' + (err.message || err);
      document.getElementById('sticker-vin-status').className = 'text-danger small';
    }
    document.getElementById('sticker-decode-btn').disabled = false;
    this.updateButtons();
    this.updatePreview();
  },

  getStickerData() {
    const vin = document.getElementById('sticker-vin').value.trim();
    const oilTypeKey = document.getElementById('sticker-oil-type').value;
    const mileageStr = document.getElementById('sticker-mileage').value;
    const dateStr = document.getElementById('sticker-date').value || new Date().toISOString().split('T')[0];
    const qrEnabled = document.getElementById('sticker-qr-enabled').checked;

    if (!vin || vin.length !== 17 || !oilTypeKey || !mileageStr) return null;

    const oilType = OIL_TYPES[oilTypeKey];
    const mileage = parseInt(mileageStr) || 0;
    const serviceDate = new Date(dateStr);
    const nextServiceDate = new Date(serviceDate.getTime() + oilType.durationDays * 86400000);
    const nextServiceMileage = mileage + oilType.mileageInterval;

    let vehicleDetails = '';
    if (this.decodedVin) {
      const p = [this.decodedVin.year, this.decodedVin.make, this.decodedVin.model].filter(Boolean);
      if (this.decodedVin.engineL) p.push(this.decodedVin.engineL + 'L');
      if (this.decodedVin.engineCylinders) p.push(this.decodedVin.engineCylinders + ' cyl');
      vehicleDetails = p.join(' ');
    }

    return {
      vin, oilTypeKey, oilTypeName: oilType.name,
      mileage, serviceDate: dateStr,
      nextServiceDate: nextServiceDate.toLocaleDateString(),
      nextServiceMileage: nextServiceMileage.toLocaleString(),
      vehicleDetails,
      decodedVin: this.decodedVin || {},
      companyName: 'Quality Lube Express',
      address: '3617 HWY 19 Zachary LA 70791',
      qrCode: vin,         // QR encodes VIN (matches Inspection App)
      qrEnabled: qrEnabled,
      templateId: this.activeTemplate || 'oil_custom'
    };
  },

  updateButtons() {
    const data = this.getStickerData();
    const valid = !!data;
    const sendBtn = document.getElementById('sticker-send-btn');
    const prevBtn = document.getElementById('sticker-preview-btn');
    const saveBtn = document.getElementById('sticker-save-btn');
    if (sendBtn) sendBtn.disabled = !valid;
    if (prevBtn) prevBtn.disabled = !valid;
    if (saveBtn) saveBtn.disabled = !valid;
  },

  // ---- QR Code Generation ----
  async generateQrDataUrl(text, size) {
    // Uses the qrcode CDN library (same as Inspection App)
    if (!text) return null;
    const cacheKey = text + '_' + size;
    if (this.qrDataUrlCache[cacheKey]) return this.qrDataUrlCache[cacheKey];
    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: size || 100,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
      this.qrDataUrlCache[cacheKey] = dataUrl;
      return dataUrl;
    } catch (err) {
      console.error('QR generation failed:', err);
      return null;
    }
  },

  async updatePreview() {
    this.updateButtons();
    this._seUpdateDataOnCanvas();
  },

  // ---- PDF Generation with QR ----
  async generateStickerPdf(data, copies) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const paperEl = document.getElementById('sticker-paper-size');
    const paperKey = paperEl ? paperEl.value : 'GODEX';
    const paper = STICKER_PAPER_SIZES[paperKey] || STICKER_PAPER_SIZES['GODEX'];
    const mmToPt = (mm) => mm * 2.834645669;
    const pw = mmToPt(paper.width);
    const ph = mmToPt(paper.height);
    const baseFontSize = STICKER_LAYOUT.fontSize;

    // Generate QR code PNG if enabled
    let qrImgEmbed = null;
    const qrEnabled = data.qrEnabled !== false;
    if (qrEnabled && data.vin) {
      try {
        const qrDataUrl = await this.generateQrDataUrl(data.vin, STICKER_LAYOUT.qrCodeSize * 10);
        if (qrDataUrl) {
          const qrPngBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0));
          qrImgEmbed = await pdfDoc.embedPng(qrPngBytes);
        }
      } catch (e) {
        console.warn('QR embed failed:', e);
      }
    }

    copies = copies || 1;

    for (let c = 0; c < copies; c++) {
      const page = pdfDoc.addPage([pw, ph]);
      const mL = mmToPt(STICKER_LAYOUT.margins.left);
      const mR = mmToPt(STICKER_LAYOUT.margins.right);
      const mT = mmToPt(STICKER_LAYOUT.margins.top);
      const mB = mmToPt(STICKER_LAYOUT.margins.bottom);
      const availW = pw - mL - mR;
      const availH = ph - mT - mB;

      // Draw text elements
      for (const el of STICKER_LAYOUT.elements) {
        let text = el.content
          .replace('{serviceDate}', data.nextServiceDate || '')
          .replace('{serviceMileage}', (data.nextServiceMileage || '') + ' mi')
          .replace('{oilType}', data.oilTypeName || '')
          .replace('{decodedDetails}', data.vehicleDetails || '');

        if (!text.trim()) continue;

        const fs = baseFontSize * el.fontSize;
        const usedFont = el.bold ? boldFont : font;
        let x = mL + (el.x / 100) * availW;
        const y = ph - mT - (el.y / 100) * availH;

        const tw = usedFont.widthOfTextAtSize(text, fs);
        if (el.align === 'center') x -= tw / 2;
        else if (el.align === 'right') x -= tw;

        page.drawText(text, { x, y, size: fs, font: usedFont, color: rgb(0, 0, 0) });
      }

      // Draw QR code
      if (qrImgEmbed) {
        const qrSizePt = mmToPt(STICKER_LAYOUT.qrCodeSize);
        const qrX = mL + (STICKER_LAYOUT.qrCodePosition.x / 100) * availW - qrSizePt / 2;
        const qrY = ph - mT - (STICKER_LAYOUT.qrCodePosition.y / 100) * availH - qrSizePt / 2;
        page.drawImage(qrImgEmbed, {
          x: qrX, y: qrY, width: qrSizePt, height: qrSizePt
        });
      }
    }

    return await pdfDoc.save();
  },

  async previewPdf() {
    const data = this.getStickerData();
    if (!data) return;
    try {
      const pdfBytes = await this.generateStickerPdf(data, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      alert('PDF generation failed: ' + (err.message || err));
    }
  },

  async createAndSave() {
    const data = this.getStickerData();
    if (!data) return;
    try {
      await this.saveSticker(data);
      this.hideCreateForm();
      await this.loadStickers();
      const alertEl = document.getElementById('sticker-alert');
      alertEl.className = 'alert alert-success';
      alertEl.textContent = 'Sticker saved!';
      alertEl.style.display = 'block';
      setTimeout(() => alertEl.style.display = 'none', 3000);
    } catch (err) {
      const alertEl = document.getElementById('sticker-alert');
      alertEl.className = 'alert alert-danger';
      alertEl.textContent = 'Save failed: ' + (err.message || err);
      alertEl.style.display = 'block';
    }
  },

  // ---- Print Client Integration ----
  async sendToPrintClient() {
    const data = this.getStickerData();
    if (!data) return;

    const printerSelect = document.getElementById('sticker-printer-select');
    const printerId = printerSelect.value;
    if (!printerId) {
      alert('Select a printer first');
      return;
    }
    const selectedOption = printerSelect.options[printerSelect.selectedIndex];
    const printerName = selectedOption ? selectedOption.textContent.split(' (')[0] : printerId;
    const systemName = selectedOption ? (selectedOption.dataset.systemName || printerName) : printerName;
    const copies = parseInt(document.getElementById('sticker-copies').value) || 1;
    const paperEl = document.getElementById('sticker-paper-size');
    const paperKey = paperEl ? paperEl.value : 'Dymo200i';

    try {
      const pdfBytes = await this.generateStickerPdf(data, copies);

      if (LabelSystem.testMode) {
        LabelSystem.addTestLog('success', 'STICKER PRINT INTERCEPTED \u2014 VIN: ' + data.vin + ' | Oil: ' + data.oilTypeName + ' | QR: ' + (data.qrEnabled ? 'YES' : 'NO') + ' | Copies: ' + copies);
        LabelSystem.addTestLog('info', 'PDF: ' + (pdfBytes.length / 1024).toFixed(1) + ' KB | Printer: ' + printerName + ' | Template: ' + (data.templateId || 'custom'));
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
        return;
      }

      const base64Pdf = LabelSystem.uint8ArrayToBase64(pdfBytes);
      const printClientUrl = LabelSystem.getPrintClientUrl();
      const response = await fetch(printClientUrl + '/api/print/jobs', {
        method: 'POST',
        headers: LabelSystem.getPrintClientHeaders(true),
        mode: 'cors',
        body: JSON.stringify({
          printerId, printerName: systemName, copies,
          pdfData: base64Pdf,
          templateName: 'Oil Change Sticker - ' + data.vin,
          paperSize: paperKey,
          labelData: {
            vin: data.vin, oilType: data.oilTypeName,
            mileage: data.mileage, qrCode: data.qrCode,
            templateId: data.templateId
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const jobId = result.jobId || result.id || '';
        alert('Sticker print job queued' + (jobId ? ' (ID: ' + jobId + ')' : '') + '\nPrinter: ' + printerName);
        await this.saveSticker({ ...data, printed: true });
        await this.loadStickers();
      } else {
        const errData = await response.json().catch(() => null);
        const errMsg = errData && errData.error ? errData.error : 'HTTP ' + response.status;
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
        alert('Print failed: ' + errMsg + '\nPDF opened for manual printing.');
      }
    } catch (err) {
      console.error('Sticker print failed:', err);
      alert('Print client unreachable: ' + (err.message || err));
    }
  },

  // ---- Render Sticker List ----
  renderStickerList() {
    const tbody = document.getElementById('stickers-table-body');
    const table = document.getElementById('stickers-table');
    const empty = document.getElementById('stickers-empty');
    if (!tbody) return;

    const activeStickers = this.stickers.filter(s => !s.archived);
    const archivedStickers = this.stickers.filter(s => s.archived);

    if (activeStickers.length === 0) {
      tbody.innerHTML = '';
      if (table) table.style.display = 'none';
      if (empty) empty.style.display = 'block';
    } else {
      if (table) table.style.display = 'table';
      if (empty) empty.style.display = 'none';
      tbody.innerHTML = activeStickers.map(s => this._renderStickerRow(s, false)).join('');
    }

    // Also render archived stickers in the archived tab
    const archivedTbody = document.getElementById('archived-stickers-table-body');
    const archivedTable = document.getElementById('archived-stickers-table');
    const archivedEmpty = document.getElementById('archived-stickers-empty');
    if (archivedTbody) {
      if (archivedStickers.length === 0) {
        archivedTbody.innerHTML = '';
        if (archivedTable) archivedTable.style.display = 'none';
        if (archivedEmpty) archivedEmpty.style.display = 'block';
      } else {
        if (archivedTable) archivedTable.style.display = 'table';
        if (archivedEmpty) archivedEmpty.style.display = 'none';
        archivedTbody.innerHTML = archivedStickers.map(s => this._renderStickerRow(s, true)).join('');
      }
    }

    // Update archived sticker count badge
    const countEl = document.getElementById('ls-archived-stickers-count');
    if (countEl) countEl.textContent = archivedStickers.length;
  },

  _renderStickerRow(s, isArchived) {
    const oilName = s.oilTypeName || (OIL_TYPES[s.oilTypeKey] ? OIL_TYPES[s.oilTypeKey].name : s.oilTypeKey);
    const created = s.createdDate ? new Date(s.createdDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '\u2014';
    const vehicleTxt = s.vehicleDetails || '';
    const statusBadge = s.printed
      ? '<span class="ls-status-badge printed">Printed</span>'
      : '<span class="ls-status-badge not-printed">Not Printed</span>';
    const archivedBadge = isArchived ? '<span class="ls-status-badge inactive ms-1">Archived</span>' : '';

    const qrBtn = '<button class="ls-action-btn" title="QR Code" onclick="StickerSystem.showQrCode(\'' + s.id + '\')"><i class="fas fa-qrcode"></i></button>';
    const vinBtn = '<button class="ls-action-btn" title="Vehicle Details" onclick="StickerSystem.showVinDetails(\'' + s.id + '\')"><i class="fas fa-car"></i></button>';
    const printBtn = '<button class="ls-action-btn" title="Print" onclick="StickerSystem.reprintSticker(\'' + s.id + '\')"><i class="fas fa-print"></i></button>';
    const archiveBtn = !isArchived
      ? '<button class="ls-action-btn" title="Archive" onclick="StickerSystem.archiveSticker(\'' + s.id + '\')"><i class="fas fa-archive"></i></button>'
      : '<button class="ls-action-btn" title="Restore" onclick="StickerSystem.restoreSticker(\'' + s.id + '\')"><i class="fas fa-undo"></i></button>';
    const deleteBtn = isArchived
      ? '<button class="ls-action-btn danger" title="Delete" onclick="StickerSystem.deleteSticker(\'' + s.id + '\')"><i class="fas fa-trash"></i></button>'
      : '';

    return '<tr>' +
      '<td><strong>' + this.esc(s.vin || '\u2014') + '</strong></td>' +
      '<td>' + this.esc(oilName) + '</td>' +
      '<td>' + this.esc(vehicleTxt || '\u2014') + '</td>' +
      '<td>' + (s.mileage || 0).toLocaleString() + '</td>' +
      '<td>' + statusBadge + archivedBadge + '</td>' +
      '<td>' + created + '</td>' +
      '<td>' + qrBtn + vinBtn + printBtn + archiveBtn + deleteBtn + '</td>' +
    '</tr>';
  },

  // ---- Archive / Restore ----
  async archiveSticker(id) {
    try {
      await this.getDb().collection('static_stickers').doc(id).update({
        archived: true, lastUpdated: new Date().toISOString()
      });
      await this.loadStickers();
    } catch (err) {
      console.error('Archive sticker failed:', err);
      alert('Failed to archive sticker');
    }
  },

  async restoreSticker(id) {
    try {
      await this.getDb().collection('static_stickers').doc(id).update({
        archived: false, lastUpdated: new Date().toISOString()
      });
      await this.loadStickers();
    } catch (err) {
      console.error('Restore sticker failed:', err);
      alert('Failed to restore sticker');
    }
  },

  // ---- QR Code Viewer ----
  async showQrCode(id) {
    const sticker = this.stickers.find(s => s.id === id);
    if (!sticker || !sticker.vin) return;
    const modal = document.getElementById('stickerQrModal');
    if (!modal) return;
    document.getElementById('qr-modal-vin').textContent = sticker.vin;
    const container = document.getElementById('qr-modal-canvas');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';
    try {
      const dataUrl = await this.generateQrDataUrl(sticker.vin, 200);
      container.innerHTML = '<img src="' + dataUrl + '" alt="QR Code" style="width:200px; height:200px; image-rendering:pixelated;">';
    } catch (e) {
      container.innerHTML = '<p class="text-danger">Failed to generate QR code</p>';
    }
    new bootstrap.Modal(modal).show();
  },

  // ---- VIN Details Viewer ----
  showVinDetails(id) {
    const sticker = this.stickers.find(s => s.id === id);
    if (!sticker) return;
    const modal = document.getElementById('stickerVinModal');
    if (!modal) return;

    const decoded = sticker.decodedVin || {};
    const oilName = sticker.oilTypeName || (OIL_TYPES[sticker.oilTypeKey] ? OIL_TYPES[sticker.oilTypeKey].name : sticker.oilTypeKey || '\u2014');
    const nextDate = sticker.nextServiceDate || '\u2014';
    const nextMileage = sticker.nextServiceMileage || '\u2014';
    const mileage = sticker.mileage ? sticker.mileage.toLocaleString() : '\u2014';

    const infoRow = (label, value) => value ? '<tr><td class="fw-bold pe-3 text-muted small text-nowrap">' + label + '</td><td>' + this.esc(String(value)) + '</td></tr>' : '';

    document.getElementById('vin-modal-content').innerHTML =
      '<div class="row g-3">' +
        '<div class="col-md-6">' +
          '<div class="card h-100"><div class="card-body">' +
            '<h6 class="card-title mb-3"><i class="fas fa-car me-2 text-primary"></i>Vehicle Information</h6>' +
            '<table class="table table-sm table-borderless mb-0">' +
              infoRow('VIN', sticker.vin) +
              infoRow('Year', decoded.year) +
              infoRow('Make', decoded.make) +
              infoRow('Model', decoded.model) +
              infoRow('Trim', decoded.trim) +
              infoRow('Body Type', decoded.bodyType) +
              infoRow('Drive Type', decoded.driveType) +
            '</table>' +
          '</div></div>' +
        '</div>' +
        '<div class="col-md-6">' +
          '<div class="card h-100"><div class="card-body">' +
            '<h6 class="card-title mb-3"><i class="fas fa-cogs me-2 text-primary"></i>Engine &amp; Service</h6>' +
            '<table class="table table-sm table-borderless mb-0">' +
              infoRow('Engine', decoded.engineL ? decoded.engineL + 'L' : '') +
              infoRow('Cylinders', decoded.engineCylinders) +
              infoRow('Fuel Type', decoded.fuelType) +
              infoRow('Transmission', decoded.transmission) +
              '<tr><td colspan="2"><hr class="my-2"></td></tr>' +
              infoRow('Oil Type', oilName) +
              infoRow('Current Mileage', mileage + ' mi') +
              infoRow('Next Service Date', nextDate) +
              infoRow('Next Service Mileage', nextMileage) +
            '</table>' +
          '</div></div>' +
        '</div>' +
      '</div>';

    new bootstrap.Modal(modal).show();
  },

  // ---- Sticker Settings ----
  loadStickerSettings() {
    try {
      const saved = localStorage.getItem('stickerSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layout) Object.assign(STICKER_LAYOUT, parsed.layout);
        if (parsed.oilTypes) {
          // Merge custom oil types
          Object.keys(parsed.oilTypes).forEach(k => { OIL_TYPES[k] = parsed.oilTypes[k]; });
        }
      }
    } catch (e) {
      console.warn('Failed to load sticker settings:', e);
    }
  },

  saveStickerSettings() {
    try {
      const settings = {
        layout: {
          fontSize: STICKER_LAYOUT.fontSize,
          fontFamily: STICKER_LAYOUT.fontFamily,
          margins: { ...STICKER_LAYOUT.margins },
          qrCodeSize: STICKER_LAYOUT.qrCodeSize,
          qrCodePosition: { ...STICKER_LAYOUT.qrCodePosition },
          elements: STICKER_LAYOUT.elements.map(el => ({ ...el }))
        },
        oilTypes: { ...OIL_TYPES }
      };
      localStorage.setItem('stickerSettings', JSON.stringify(settings));
      alert('Sticker settings saved!');
    } catch (e) {
      alert('Failed to save sticker settings');
    }
  },

  resetStickerSettings() {
    if (!confirm('Reset all sticker settings to defaults? This will remove any custom oil types.')) return;
    localStorage.removeItem('stickerSettings');
    location.reload();
  },

  renderStickerSettings() {
    // Oil Types Table
    const oilTbody = document.getElementById('sticker-oil-types-tbody');
    if (oilTbody) {
      oilTbody.innerHTML = Object.entries(OIL_TYPES).map(([key, ot]) =>
        '<tr>' +
          '<td>' + this.esc(ot.name) + '</td>' +
          '<td>' + ot.durationDays + ' days</td>' +
          '<td>' + ot.mileageInterval.toLocaleString() + ' mi</td>' +
          '<td>' +
            '<button class="ls-action-btn" title="Edit" onclick="StickerSystem.editOilType(\'' + key + '\')"><i class="fas fa-edit"></i></button>' +
            (Object.keys(OIL_TYPES).length > 1 ? '<button class="ls-action-btn danger" title="Delete" onclick="StickerSystem.deleteOilType(\'' + key + '\')"><i class="fas fa-trash"></i></button>' : '') +
          '</td>' +
        '</tr>'
      ).join('');
    }

    // Layout Settings
    const fsEl = document.getElementById('sticker-set-fontsize');
    if (fsEl) fsEl.value = STICKER_LAYOUT.fontSize;
    const ffEl = document.getElementById('sticker-set-fontfamily');
    if (ffEl) ffEl.value = STICKER_LAYOUT.fontFamily;
    const qrSizeEl = document.getElementById('sticker-set-qrsize');
    if (qrSizeEl) qrSizeEl.value = STICKER_LAYOUT.qrCodeSize;
    const qrXEl = document.getElementById('sticker-set-qrx');
    if (qrXEl) qrXEl.value = STICKER_LAYOUT.qrCodePosition.x;
    const qrYEl = document.getElementById('sticker-set-qry');
    if (qrYEl) qrYEl.value = STICKER_LAYOUT.qrCodePosition.y;
    ['top', 'bottom', 'left', 'right'].forEach(side => {
      const el = document.getElementById('sticker-set-margin-' + side);
      if (el) el.value = STICKER_LAYOUT.margins[side];
    });

    // Layout Elements
    this.renderLayoutElements();
  },

  renderLayoutElements() {
    const container = document.getElementById('sticker-layout-elements');
    if (!container) return;
    container.innerHTML = STICKER_LAYOUT.elements.map((el, idx) =>
      '<div class="sticker-element-row">' +
        '<div class="d-flex justify-content-between align-items-center">' +
          '<strong class="small">' + this.esc(el.label) + '</strong>' +
          '<div class="d-flex gap-1 align-items-center">' +
            '<span class="badge bg-light text-dark" style="font-size:0.65rem;">(' + el.x + '%, ' + el.y + '%)</span>' +
            '<button class="ls-action-btn" title="Edit Element" onclick="StickerSystem.editLayoutElement(' + idx + ')"><i class="fas fa-edit"></i></button>' +
            (el.id.startsWith('custom_') ? '<button class="ls-action-btn danger" title="Delete" onclick="StickerSystem.deleteLayoutElement(' + idx + ')"><i class="fas fa-trash"></i></button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="text-muted" style="font-size:0.7rem;">Content: ' + this.esc(el.content) + ' &bull; Size: ' + el.fontSize + 'x &bull; ' + (el.bold ? 'Bold' : 'Normal') + ' &bull; ' + el.align + '</div>' +
      '</div>'
    ).join('');
  },

  // Oil Type CRUD
  addOilType() {
    const name = prompt('Oil Type Name (e.g. "Euro Synthetic"):');
    if (!name || !name.trim()) return;
    const days = parseInt(prompt('Service interval in days (e.g. 180):'));
    if (isNaN(days) || days < 1) return;
    const miles = parseInt(prompt('Mileage interval (e.g. 7000):'));
    if (isNaN(miles) || miles < 1) return;
    const key = 'custom_' + name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    OIL_TYPES[key] = { name: name.trim(), durationDays: days, mileageInterval: miles };
    this.renderStickerSettings();
    this._rebuildOilTypeSelect();
  },

  editOilType(key) {
    const ot = OIL_TYPES[key];
    if (!ot) return;
    const name = prompt('Oil Type Name:', ot.name);
    if (!name || !name.trim()) return;
    const days = parseInt(prompt('Service interval in days:', ot.durationDays));
    if (isNaN(days) || days < 1) return;
    const miles = parseInt(prompt('Mileage interval:', ot.mileageInterval));
    if (isNaN(miles) || miles < 1) return;
    OIL_TYPES[key] = { name: name.trim(), durationDays: days, mileageInterval: miles };
    this.renderStickerSettings();
    this._rebuildOilTypeSelect();
  },

  deleteOilType(key) {
    if (Object.keys(OIL_TYPES).length <= 1) return alert('Must have at least one oil type.');
    if (!confirm('Delete oil type "' + OIL_TYPES[key].name + '"?')) return;
    delete OIL_TYPES[key];
    this.renderStickerSettings();
    this._rebuildOilTypeSelect();
  },

  _rebuildOilTypeSelect() {
    const select = document.getElementById('sticker-oil-type');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Select oil type...</option>' +
      Object.entries(OIL_TYPES).map(([key, ot]) =>
        '<option value="' + key + '" data-days="' + ot.durationDays + '" data-miles="' + ot.mileageInterval + '">' +
          ot.name + ' (' + ot.durationDays + 'd / ' + ot.mileageInterval.toLocaleString() + ' mi)' +
        '</option>'
      ).join('');
    if (current && OIL_TYPES[current]) select.value = current;
  },

  // Layout Element editing
  editLayoutElement(idx) {
    const el = STICKER_LAYOUT.elements[idx];
    if (!el) return;
    const content = prompt('Content (use {serviceDate}, {serviceMileage}, {oilType}, {decodedDetails} for dynamic):', el.content);
    if (content === null) return;
    const x = parseFloat(prompt('X Position (0-100%):', el.x));
    if (isNaN(x)) return;
    const y = parseFloat(prompt('Y Position (0-100%):', el.y));
    if (isNaN(y)) return;
    const fontSize = parseFloat(prompt('Font Size Multiplier (e.g. 1.25):', el.fontSize));
    if (isNaN(fontSize) || fontSize <= 0) return;
    const bold = confirm('Bold text?');
    const align = prompt('Text Alignment (left, center, right):', el.align) || 'center';
    if (!['left', 'center', 'right'].includes(align)) return alert('Invalid alignment');

    el.content = content;
    el.x = Math.max(0, Math.min(100, x));
    el.y = Math.max(0, Math.min(100, y));
    el.fontSize = fontSize;
    el.bold = bold;
    el.align = align;
    this.renderLayoutElements();
  },

  addLayoutElement() {
    const label = prompt('Element Label (e.g. "Phone Number"):');
    if (!label || !label.trim()) return;
    const content = prompt('Content text:', '');
    if (content === null) return;
    STICKER_LAYOUT.elements.push({
      id: 'custom_' + Date.now(),
      label: label.trim(),
      content: content,
      x: 50, y: 70,
      fontSize: 1.0, bold: false, align: 'center'
    });
    this.renderLayoutElements();
  },

  deleteLayoutElement(idx) {
    const el = STICKER_LAYOUT.elements[idx];
    if (!el || !el.id.startsWith('custom_')) return;
    if (!confirm('Delete "' + el.label + '" element?')) return;
    STICKER_LAYOUT.elements.splice(idx, 1);
    this.renderLayoutElements();
  },

  updateStickerLayoutSetting(prop, value) {
    if (prop === 'fontSize') STICKER_LAYOUT.fontSize = parseInt(value) || 8;
    else if (prop === 'fontFamily') STICKER_LAYOUT.fontFamily = value;
    else if (prop === 'qrCodeSize') STICKER_LAYOUT.qrCodeSize = parseInt(value) || 14;
    else if (prop === 'qrCodeX') STICKER_LAYOUT.qrCodePosition.x = parseFloat(value) || 50;
    else if (prop === 'qrCodeY') STICKER_LAYOUT.qrCodePosition.y = parseFloat(value) || 80;
    else if (prop.startsWith('margin-')) {
      const side = prop.replace('margin-', '');
      STICKER_LAYOUT.margins[side] = parseFloat(value) || 2;
    }
  },

  async reprintSticker(id) {
    const sticker = this.stickers.find(s => s.id === id);
    if (!sticker) return;
    try {
      const pdfBytes = await this.generateStickerPdf(sticker, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      alert('Failed to generate PDF: ' + (err.message || err));
    }
  },

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

// ============================================================
// INITIALIZE ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Delay init slightly to ensure Firebase is ready
  setTimeout(() => LabelSystem.init(), 500);
});
