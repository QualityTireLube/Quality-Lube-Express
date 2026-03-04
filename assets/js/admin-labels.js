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
  'GODEX':                           { paperSize: '29mmx90mm',      label: 'GODEX' },
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
    document.querySelectorAll('.label-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('label-view-' + viewName);
    if (target) target.classList.add('active');

    // Update nav buttons
    ['manager', 'creator', 'settings'].forEach(v => {
      const btn = document.getElementById('label-nav-' + v);
      if (btn) {
        btn.className = v === viewName ? 'btn btn-primary btn-sm' : 'btn btn-outline-secondary btn-sm';
      }
    });

    // Show/hide manager-specific actions
    const managerActions = document.getElementById('label-manager-actions');
    if (managerActions) managerActions.style.display = viewName === 'manager' ? 'flex' : 'none';

    if (viewName === 'creator') {
      this.initCreator();
    }
    if (viewName === 'settings') {
      this.renderSettings();
    }
  },

  // ============================================================
  // TEMPLATE MANAGER RENDERING
  // ============================================================
  renderManager() {
    const active = this.templates.filter(t => !t.archived);
    const archived = this.templates.filter(t => t.archived);

    document.getElementById('active-template-count').textContent = active.length;
    document.getElementById('archived-template-count').textContent = archived.length;

    // Active grid
    const activeGrid = document.getElementById('active-templates-grid');
    const activeEmpty = document.getElementById('active-empty');
    if (active.length === 0) {
      activeGrid.innerHTML = '';
      activeEmpty.style.display = 'block';
    } else {
      activeEmpty.style.display = 'none';
      activeGrid.innerHTML = active.map(t => this.renderTemplateCard(t, false)).join('');
    }

    // Archived grid
    const archivedGrid = document.getElementById('archived-templates-grid');
    const archivedEmpty = document.getElementById('archived-empty');
    if (archived.length === 0) {
      archivedGrid.innerHTML = '';
      archivedEmpty.style.display = 'block';
    } else {
      archivedEmpty.style.display = 'none';
      archivedGrid.innerHTML = archived.map(t => this.renderTemplateCard(t, true)).join('');
    }
  },

  renderTemplateCard(template, isArchived) {
    const pc = PAPER_SIZES[template.paperSize];
    const paperName = pc ? pc.name : template.paperSize;
    const fieldsHtml = (template.fields || []).slice(0, 6).map(f =>
      '<span class="label-field-chip">' + this.escHtml(f.name) + '</span>'
    ).join('');
    const moreFields = (template.fields || []).length > 6
      ? '<span class="label-field-chip">+' + ((template.fields || []).length - 6) + ' more</span>' : '';

    const created = template.createdDate ? new Date(template.createdDate).toLocaleDateString() : '—';
    const updated = template.updatedDate ? '<p><strong>Updated:</strong> ' + new Date(template.updatedDate).toLocaleDateString() + '</p>' : '';

    const archiveAction = !isArchived
      ? '<a href="#" onclick="LabelSystem.archiveTemplate(\'' + template.id + '\');return false;"><i class="fas fa-archive"></i>Archive</a>'
      : '<a href="#" onclick="LabelSystem.restoreTemplate(\'' + template.id + '\');return false;"><i class="fas fa-undo"></i>Restore</a>';

    const deleteAction = isArchived
      ? '<div class="dropdown-divider"></div><a href="#" class="text-danger" onclick="LabelSystem.deleteTemplate(\'' + template.id + '\');return false;"><i class="fas fa-trash"></i>Delete Permanently</a>'
      : '';

    return '<div class="label-template-card' + (isArchived ? ' archived' : '') + '">' +
      '<div class="label-card-header">' +
        '<h5>' + this.escHtml(template.labelName) + '</h5>' +
        '<div class="label-card-menu">' +
          '<button class="btn btn-sm btn-light" onclick="LabelSystem.toggleCardMenu(this)"><i class="fas fa-ellipsis-v"></i></button>' +
          '<div class="label-card-dropdown">' +
            '<a href="#" onclick="LabelSystem.previewTemplatePdf(\'' + template.id + '\');return false;"><i class="fas fa-eye"></i>Preview PDF</a>' +
            '<a href="#" onclick="LabelSystem.downloadTemplatePdf(\'' + template.id + '\');return false;"><i class="fas fa-download"></i>Download PDF</a>' +
            '<div class="dropdown-divider"></div>' +
            '<a href="#" onclick="LabelSystem.duplicateTemplate(\'' + template.id + '\');return false;"><i class="fas fa-copy"></i>Duplicate</a>' +
            '<a href="#" onclick="LabelSystem.openEditor(\'' + template.id + '\');return false;"><i class="fas fa-edit"></i>Edit</a>' +
            '<div class="dropdown-divider"></div>' +
            archiveAction +
            deleteAction +
          '</div>' +
        '</div>' +
      '</div>' +
      (isArchived ? '<span class="badge bg-secondary mb-2">Archived</span>' : '') +
      '<div class="label-card-info">' +
        '<p><strong>Paper Size:</strong> ' + this.escHtml(paperName) + '</p>' +
        '<p><strong>Fields:</strong> ' + (template.fields || []).length + '</p>' +
        '<p><strong>Copies:</strong> ' + (template.copies || 1) + '</p>' +
        '<p><strong>Created by:</strong> ' + this.escHtml(template.createdBy || '—') + '</p>' +
        '<p><strong>Created:</strong> ' + created + '</p>' +
        updated +
      '</div>' +
      '<div class="label-card-fields">' + fieldsHtml + moreFields + '</div>' +
      '<div class="label-card-actions">' +
        '<button class="btn btn-outline-primary btn-sm" onclick="LabelSystem.openEditor(\'' + template.id + '\')"><i class="fas fa-edit me-1"></i>Edit</button>' +
        '<div>' +
          (!isArchived ? '<button class="btn btn-outline-secondary btn-sm me-1" title="Archive" onclick="LabelSystem.archiveTemplate(\'' + template.id + '\')"><i class="fas fa-archive"></i></button>' : '') +
          (isArchived ? '<button class="btn btn-outline-success btn-sm me-1" title="Restore" onclick="LabelSystem.restoreTemplate(\'' + template.id + '\')"><i class="fas fa-undo"></i></button>' : '') +
          (isArchived ? '<button class="btn btn-outline-danger btn-sm" title="Delete" onclick="LabelSystem.deleteTemplate(\'' + template.id + '\')"><i class="fas fa-trash"></i></button>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  },

  toggleCardMenu(btn) {
    const dropdown = btn.nextElementSibling;
    // Close all others
    document.querySelectorAll('.label-card-dropdown.show').forEach(d => {
      if (d !== dropdown) d.classList.remove('show');
    });
    dropdown.classList.toggle('show');
    event.stopPropagation();
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
      document.getElementById('editor-title').textContent = 'Edit Label Template';
    } else {
      this.editorTemplate = null;
      this.editorFields = [];
      document.getElementById('editor-label-name').value = '';
      document.getElementById('editor-paper-size').value = DEFAULT_PAPER_SIZE;
      document.getElementById('editor-copies').value = 1;
      document.getElementById('editor-title').textContent = 'Create New Label Template';
    }

    this.editorSelectedField = null;
    overlay.classList.add('active');
    this.editorRender();

    // Listen for paper size changes
    document.getElementById('editor-paper-size').onchange = () => this.editorRender();
  },

  closeEditor() {
    document.getElementById('labelEditorOverlay').classList.remove('active');
    this.editorTemplate = null;
    this.editorFields = [];
    this.editorSelectedField = null;
    this.loadTemplates();
  },

  editorGetCanvasDims() {
    const ps = document.getElementById('editor-paper-size').value;
    const pc = PAPER_SIZES[ps];
    const canvasWidth = 400;
    const canvasHeight = Math.round((pc.height / pc.width) * canvasWidth);
    return { canvasWidth, canvasHeight, paperConfig: pc };
  },

  editorRender() {
    const { canvasWidth, canvasHeight, paperConfig } = this.editorGetCanvasDims();

    // Update canvas size
    const canvas = document.getElementById('editor-canvas');
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    document.getElementById('editor-canvas-title').textContent = 'Label Preview (' + paperConfig.name + ')';

    // Render fields on canvas
    const emptyMsg = document.getElementById('editor-canvas-empty');
    // Remove old field elements (but not the empty message)
    canvas.querySelectorAll('.label-canvas-field').forEach(el => el.remove());

    if (this.editorFields.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      this.editorFields.forEach(field => {
        const el = document.createElement('div');
        el.className = 'label-canvas-field' + (this.editorSelectedField && this.editorSelectedField.id === field.id ? ' selected' : '');
        el.style.left = field.position.x + 'px';
        el.style.top = field.position.y + 'px';
        el.style.fontSize = (field.fontSize || 10) + 'px';
        el.style.fontFamily = field.fontFamily || 'Arial';
        el.style.color = field.color || '#000000';
        el.style.textAlign = field.textAlign || 'left';
        if (field.rotation) {
          el.style.transform = 'rotate(' + field.rotation + 'deg)';
          el.style.transformOrigin = 'left top';
        }
        el.textContent = field.value || field.name;
        el.dataset.fieldId = field.id;
        el.onclick = (e) => { e.stopPropagation(); this.editorSelectField(field.id); };
        el.onmousedown = (e) => this.editorStartDrag(e, field.id);
        canvas.appendChild(el);
      });
    }

    // Canvas click to deselect
    canvas.onclick = () => {
      this.editorSelectedField = null;
      this.editorRender();
    };

    // Render available fields list
    const usedNames = this.editorFields.map(f => f.name);
    const available = AVAILABLE_FIELDS.filter(n => !usedNames.includes(n));
    const listEl = document.getElementById('editor-available-fields');
    listEl.innerHTML = available.map(name =>
      '<li onclick="LabelSystem.editorAddField(\'' + this.escHtml(name) + '\')">' +
        '<i class="fas fa-plus-circle"></i>' + this.escHtml(name) +
      '</li>'
    ).join('');

    // Render fields list
    const fieldsListEl = document.getElementById('editor-fields-list');
    document.getElementById('editor-field-count').textContent = this.editorFields.length;
    fieldsListEl.innerHTML = this.editorFields.map(field => {
      const isSelected = this.editorSelectedField && this.editorSelectedField.id === field.id;
      return '<div class="label-field-list-item' + (isSelected ? ' selected' : '') + '" onclick="LabelSystem.editorSelectField(\'' + field.id + '\')">' +
        '<i class="fas fa-grip-vertical text-muted me-2"></i>' +
        '<div class="field-info">' +
          '<div>' + this.escHtml(field.name) + '</div>' +
          '<small>' + field.fontSize + 'px &bull; ' + field.position.x + ', ' + field.position.y + ' &bull; ' + field.textAlign + '</small>' +
        '</div>' +
        '<button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation();LabelSystem.editorDeleteField(\'' + field.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div>';
    }).join('');

    // Preview button state
    document.getElementById('editor-preview-btn').disabled = this.editorFields.length === 0;

    // Update properties panel
    this.editorRenderProps();

    // Render quick position grid
    this.editorRenderQuickPos();
  },

  editorSelectField(fieldId) {
    this.editorSelectedField = this.editorFields.find(f => f.id === fieldId) || null;
    this.editorRender();
  },

  editorAddField(name) {
    const newField = {
      id: generateId(),
      name: name,
      position: { x: 10, y: 30 },
      fontSize: 12,
      fontFamily: 'Arial',
      textAlign: 'left',
      color: '#000000',
      value: name,
      rotation: 0,
      showInForm: true
    };
    this.editorFields.push(newField);
    this.editorSelectedField = newField;
    this.editorRender();
  },

  editorAddCustomField() {
    const input = document.getElementById('editor-custom-field-name');
    const name = input.value.trim();
    if (!name) return;
    this.editorAddField(name);
    input.value = '';
  },

  editorDeleteField(fieldId) {
    this.editorFields = this.editorFields.filter(f => f.id !== fieldId);
    if (this.editorSelectedField && this.editorSelectedField.id === fieldId) {
      this.editorSelectedField = null;
    }
    this.editorRender();
  },

  editorDeleteSelectedField() {
    if (this.editorSelectedField) {
      this.editorDeleteField(this.editorSelectedField.id);
    }
  },

  editorRenderProps() {
    const panel = document.getElementById('editor-props-panel');
    if (!this.editorSelectedField) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'flex';
    const f = this.editorSelectedField;
    document.getElementById('editor-prop-field-name').textContent = f.name;
    document.getElementById('prop-value').value = f.value || '';
    document.getElementById('prop-show-in-form').checked = f.showInForm !== false;
    document.getElementById('prop-x').value = f.position.x;
    document.getElementById('prop-y').value = f.position.y;
    document.getElementById('prop-font-family').value = f.fontFamily || 'Arial';
    document.getElementById('prop-font-size').value = f.fontSize || 12;
    document.getElementById('prop-font-size-val').textContent = f.fontSize || 12;
    document.getElementById('prop-color').value = f.color || '#000000';
    document.getElementById('prop-rotation').value = f.rotation || 0;
    document.getElementById('prop-rotation-val').textContent = (f.rotation || 0) + '°';

    // Update alignment buttons
    ['left', 'center', 'right'].forEach(a => {
      const btn = document.getElementById('prop-align-' + a);
      btn.className = 'btn btn-sm ' + (f.textAlign === a ? 'btn-primary' : 'btn-outline-secondary');
    });
  },

  editorUpdateFieldProp(prop, value) {
    if (!this.editorSelectedField) return;
    const field = this.editorFields.find(f => f.id === this.editorSelectedField.id);
    if (!field) return;

    if (prop === 'x') {
      field.position.x = Math.max(0, value);
    } else if (prop === 'y') {
      field.position.y = Math.max(0, value);
    } else if (prop === 'rotation') {
      field.rotation = parseInt(value) || 0;
    } else {
      field[prop] = value;
    }
    this.editorSelectedField = field;
    this.editorRender();
  },

  editorRenderQuickPos() {
    if (!this.editorSelectedField) return;
    const { canvasWidth, canvasHeight } = this.editorGetCanvasDims();
    const margin = 10;
    const usableWidth = canvasWidth - (2 * margin);
    const usableHeight = canvasHeight - (2 * margin);
    const positions = [
      { label: 'TL', x: margin, y: margin, align: 'left' },
      { label: 'TC', x: margin + usableWidth / 2, y: margin, align: 'center' },
      { label: 'TR', x: margin + usableWidth - 50, y: margin, align: 'right' },
      { label: 'UL', x: margin, y: margin + usableHeight * 0.25, align: 'left' },
      { label: 'UC', x: margin + usableWidth / 2, y: margin + usableHeight * 0.25, align: 'center' },
      { label: 'UR', x: margin + usableWidth - 50, y: margin + usableHeight * 0.25, align: 'right' },
      { label: 'ML', x: margin, y: margin + usableHeight * 0.5, align: 'left' },
      { label: 'MC', x: margin + usableWidth / 2, y: margin + usableHeight * 0.5, align: 'center' },
      { label: 'MR', x: margin + usableWidth - 50, y: margin + usableHeight * 0.5, align: 'right' },
      { label: 'LL', x: margin, y: margin + usableHeight * 0.75, align: 'left' },
      { label: 'LC', x: margin + usableWidth / 2, y: margin + usableHeight * 0.75, align: 'center' },
      { label: 'LR', x: margin + usableWidth - 50, y: margin + usableHeight * 0.75, align: 'right' },
      { label: 'BL', x: margin, y: margin + usableHeight - 20, align: 'left' },
      { label: 'BC', x: margin + usableWidth / 2, y: margin + usableHeight - 20, align: 'center' },
      { label: 'BR', x: margin + usableWidth - 50, y: margin + usableHeight - 20, align: 'right' },
    ];
    const labels = ['Top L', 'Top M', 'Top R', 'Up L', 'Up M', 'Up R', 'Mid L', 'Mid M', 'Mid R', 'Lo L', 'Lo M', 'Lo R', 'Bot L', 'Bot M', 'Bot R'];
    const grid = document.getElementById('quick-pos-grid');
    grid.innerHTML = positions.map((p, i) =>
      '<button onclick="LabelSystem.editorQuickPos(' + Math.round(p.x) + ',' + Math.round(p.y) + ',\'' + p.align + '\')">' + labels[i] + '</button>'
    ).join('');
  },

  editorQuickPos(x, y, align) {
    if (!this.editorSelectedField) return;
    const field = this.editorFields.find(f => f.id === this.editorSelectedField.id);
    if (!field) return;
    field.position = { x, y };
    field.textAlign = align;
    this.editorSelectedField = field;
    this.editorRender();
  },

  // Canvas field dragging
  editorStartDrag(e, fieldId) {
    if (e.button !== 0) return;
    e.preventDefault();
    const canvas = document.getElementById('editor-canvas');
    const rect = canvas.getBoundingClientRect();
    const field = this.editorFields.find(f => f.id === fieldId);
    if (!field) return;

    const offsetX = e.clientX - rect.left - field.position.x;
    const offsetY = e.clientY - rect.top - field.position.y;

    const onMove = (ev) => {
      const newX = Math.max(0, Math.min(ev.clientX - rect.left - offsetX, parseInt(canvas.style.width) - 50));
      const newY = Math.max(0, Math.min(ev.clientY - rect.top - offsetY, parseInt(canvas.style.height) - 20));
      field.position = { x: Math.round(newX), y: Math.round(newY) };
      this.editorSelectedField = field;
      this.editorRender();
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  },

  async editorPreview() {
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

    // Render form fields
    this.renderCreatorForm();

    // Render preview
    this.updateCreatorPreview();

    // Preview info
    const pc = PAPER_SIZES[template.paperSize];
    document.getElementById('creator-preview-info').textContent =
      'Size: ' + (pc ? pc.width + 'x' + pc.height + pc.unit : template.width + 'x' + template.height + 'px') +
      ' — Updates in real-time';
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
    // Update modal test banner visibility
    const modalBanner = document.getElementById('print-modal-test-banner');
    if (modalBanner) modalBanner.style.display = this.testMode ? 'block' : 'none';

    // Open modal to select printer
    const select = document.getElementById('print-printer-select');
    select.innerHTML = '';

    // Only list printers that were actually detected
    const printers = this.printClientPrinters;
    if (printers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No printers detected — connect to print server';
      opt.disabled = true;
      select.appendChild(opt);
    }
    printers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;  // printerId for job submission
      opt.textContent = p.name + (p.status ? ' (' + p.status + ')' : '');
      opt.dataset.systemName = p.systemName || p.name;
      select.appendChild(opt);
    });

    document.getElementById('print-copies').value = this.creatorLabelData['Copies to be Printed'] || '1';

    // Populate paper size dropdown
    const paperSelect = document.getElementById('print-paper-size');
    if (paperSelect) {
      paperSelect.innerHTML = '';
      Object.entries(PAPER_SIZES).forEach(([key, ps]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = ps.name + ' (' + ps.width + '×' + ps.height + 'mm)';
        paperSelect.appendChild(opt);
      });
      // Default to template paper size
      paperSelect.value = (this.creatorSelectedTemplate && this.creatorSelectedTemplate.paperSize) || DEFAULT_PAPER_SIZE;
    }

    // Auto-select paper size when printer changes
    const printerSelect = document.getElementById('print-printer-select');
    printerSelect.onchange = () => {
      const selOpt = printerSelect.options[printerSelect.selectedIndex];
      const sysName = selOpt ? selOpt.dataset.systemName : '';
      const pd = PRINTER_DEFAULTS[sysName];
      if (pd && pd.paperSize && paperSelect) {
        paperSelect.value = pd.paperSize;
      }
    };
    // Trigger once for initial selection
    if (printerSelect.options.length > 0) printerSelect.onchange();

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
  }
};

// ============================================================
// INITIALIZE ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Delay init slightly to ensure Firebase is ready
  setTimeout(() => LabelSystem.init(), 500);
});
