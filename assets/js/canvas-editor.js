/**
 * FreeformCanvasEditor — Premium drag-and-drop label & sticker editor
 * Shared canvas engine used by both LabelSystem and StickerSystem
 *
 * Features:
 *  - Pixel-perfect canvas rendering with zoom & pan
 *  - Drag-and-drop element repositioning with snap guides
 *  - Resize handles on selected elements
 *  - Inline double-click text editing
 *  - Undo/Redo history (Ctrl+Z / Ctrl+Y)
 *  - Rulers with mm markings
 *  - Grid overlay toggle
 *  - Multi-select with Shift+Click
 *  - Right-click context menu
 *  - Real-time PDF-accurate preview
 */

// ============================================================
// CANVAS EDITOR ENGINE
// ============================================================
const CanvasEditor = {
  // ---- State ----
  canvas: null,
  ctx: null,
  wrapper: null,
  elements: [],
  selected: [],       // array of selected element ids
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  // Viewport
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showRulers: true,
  snapToGrid: true,
  gridSize: 10,       // pixels in canvas space (at zoom=1)

  // Paper (mm)
  paperWidth: 90,
  paperHeight: 29,
  dpi: 96,            // screen DPI for mm→px

  // Drag state
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOrigPositions: null,
  resizing: false,
  resizeHandle: null,
  resizeStartX: 0,
  resizeStartY: 0,
  resizeOrigFontSize: 0,

  // Panning
  panning: false,
  panStartX: 0,
  panStartY: 0,
  panOrigX: 0,
  panOrigY: 0,

  // Inline editing
  editing: false,
  editingElement: null,

  // Snap guides
  guides: [],

  // Callbacks
  onSelectionChange: null,
  onElementsChange: null,

  // ---- Conversion helpers ----
  mmToPx(mm) { return mm * (this.dpi / 25.4); },
  pxToMm(px) { return px / (this.dpi / 25.4); },

  get canvasWidthPx() { return this.mmToPx(this.paperWidth); },
  get canvasHeightPx() { return this.mmToPx(this.paperHeight); },

  // ---- Initialize ----
  init(wrapperEl, options = {}) {
    // Ensure own-properties for mutable state (important for Object.create instances)
    this.canvas = null;
    this.ctx = null;
    this.wrapper = null;
    this.elements = [];
    this.selected = [];
    this.history = [];
    this.historyIndex = -1;
    this.guides = [];
    this.dragging = false;
    this.resizing = false;
    this.panning = false;
    this.editing = false;
    this.editingElement = null;
    this.dragOrigPositions = null;
    this.resizeHandle = null;
    this.onSelectionChange = null;
    this.onElementsChange = null;

    this.wrapper = wrapperEl;
    this.wrapper.innerHTML = '';
    this.wrapper.style.position = 'relative';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.background = '#e8e8e8';
    this.wrapper.style.userSelect = 'none';
    this.wrapper.style.cursor = 'default';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.imageRendering = 'auto';
    this.ctx = this.canvas.getContext('2d');
    this.wrapper.appendChild(this.canvas);

    // Setup
    if (options.paperWidth) this.paperWidth = options.paperWidth;
    if (options.paperHeight) this.paperHeight = options.paperHeight;
    if (options.elements) this.elements = JSON.parse(JSON.stringify(options.elements));
    if (options.onSelectionChange) this.onSelectionChange = options.onSelectionChange;
    if (options.onElementsChange) this.onElementsChange = options.onElementsChange;
    if (options.showGrid !== undefined) this.showGrid = options.showGrid;
    if (options.showRulers !== undefined) this.showRulers = options.showRulers;

    this.selected = [];
    this.history = [];
    this.historyIndex = -1;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // Calculate initial zoom to fit
    this._fitToView();

    // Bind events
    this._bindEvents();

    // Push initial state
    this._pushHistory();

    // Initial render
    this.render();
  },

  destroy() {
    if (this.wrapper) {
      this.wrapper.removeEventListener('mousedown', this._onMouseDown);
      this.wrapper.removeEventListener('dblclick', this._onDblClick);
      this.wrapper.removeEventListener('wheel', this._onWheel);
      this.wrapper.removeEventListener('contextmenu', this._onContextMenu);
    }
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('keydown', this._onKeyDown);
    this.canvas = null;
    this.ctx = null;
  },

  // ---- Fit zoom to show full paper ----
  _fitToView() {
    const wrapperW = this.wrapper.clientWidth || 600;
    const wrapperH = this.wrapper.clientHeight || 400;
    const rulerOffset = this.showRulers ? 28 : 0;
    const availW = wrapperW - rulerOffset - 40;
    const availH = wrapperH - rulerOffset - 40;
    const zoomX = availW / this.canvasWidthPx;
    const zoomY = availH / this.canvasHeightPx;
    this.zoom = Math.min(zoomX, zoomY, 3);
    this.panX = rulerOffset + (availW - this.canvasWidthPx * this.zoom) / 2 + 20;
    this.panY = rulerOffset + (availH - this.canvasHeightPx * this.zoom) / 2 + 20;
  },

  // ---- Event binding ----
  _bindEvents() {
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onDblClick = this._handleDblClick.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onContextMenu = this._handleContextMenu.bind(this);

    this.wrapper.addEventListener('mousedown', this._onMouseDown);
    this.wrapper.addEventListener('dblclick', this._onDblClick);
    this.wrapper.addEventListener('wheel', this._onWheel, { passive: false });
    this.wrapper.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('keydown', this._onKeyDown);
  },

  // ---- Coordinate transforms ----
  screenToCanvas(sx, sy) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.panX) / this.zoom,
      y: (sy - rect.top - this.panY) / this.zoom
    };
  },

  canvasToScreen(cx, cy) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: cx * this.zoom + this.panX + rect.left,
      y: cy * this.zoom + this.panY + rect.top
    };
  },

  // ---- Hit testing ----
  _hitTest(cx, cy) {
    // Test in reverse order (top-most first)
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      const bounds = this._getElementBounds(el);
      if (cx >= bounds.x && cx <= bounds.x + bounds.w &&
          cy >= bounds.y && cy <= bounds.y + bounds.h) {
        return el;
      }
    }
    return null;
  },

  _hitTestHandle(cx, cy) {
    if (this.selected.length !== 1) return null;
    const el = this.elements.find(e => e.id === this.selected[0]);
    if (!el) return null;
    const bounds = this._getElementBounds(el);
    const handleSize = 7 / this.zoom;
    const handles = [
      { id: 'tl', x: bounds.x, y: bounds.y },
      { id: 'tr', x: bounds.x + bounds.w, y: bounds.y },
      { id: 'bl', x: bounds.x, y: bounds.y + bounds.h },
      { id: 'br', x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      { id: 'tm', x: bounds.x + bounds.w / 2, y: bounds.y },
      { id: 'bm', x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
      { id: 'ml', x: bounds.x, y: bounds.y + bounds.h / 2 },
      { id: 'mr', x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 }
    ];
    for (const h of handles) {
      if (Math.abs(cx - h.x) <= handleSize && Math.abs(cy - h.y) <= handleSize) {
        return h;
      }
    }
    return null;
  },

  _getElementBounds(el) {
    const fontSize = el.fontSize || 12;
    let pxSize;
    if (el._type === 'sticker') {
      pxSize = this.mmToPx(fontSize * 0.35);
    } else {
      // Label fontSize is in canvas pixels (400-wide system)
      pxSize = (fontSize / 400) * this.canvasWidthPx * 1.1;
      if (pxSize < 3) pxSize = 3;
    }
    const text = el.text || el.value || el.name || '';
    this.ctx.font = (el.bold ? 'bold ' : '') + pxSize + 'px ' + (el.fontFamily || 'Arial');
    const metrics = this.ctx.measureText(text);
    const w = Math.max(metrics.width, 20);
    const h = pxSize * 1.3;

    let x, y;
    if (el._type === 'sticker') {
      x = ((el.x != null ? el.x : (el.position ? el.position.x : 0)) / 100) * this.canvasWidthPx;
      y = ((el.y != null ? el.y : (el.position ? el.position.y : 0)) / 100) * this.canvasHeightPx;
    } else if (el.position) {
      // Label position is in 400-wide pixel reference
      const refW = 400;
      const refH = Math.round((this.paperHeight / this.paperWidth) * refW);
      x = (el.position.x / refW) * this.canvasWidthPx;
      y = (el.position.y / refH) * this.canvasHeightPx;
    } else {
      x = this.mmToPx(el.x || 0);
      y = this.mmToPx(el.y || 0);
    }

    // Adjust for alignment
    if (el.textAlign === 'center' || el.align === 'center') {
      x -= w / 2;
    } else if (el.textAlign === 'right' || el.align === 'right') {
      x -= w;
    }

    return { x, y: y - h * 0.15, w, h };
  },

  // ---- Mouse handlers ----
  _handleMouseDown(e) {
    if (this.editing) return;
    e.preventDefault();
    const { x: cx, y: cy } = this.screenToCanvas(e.clientX, e.clientY);

    // Check for resize handle first
    const handle = this._hitTestHandle(cx, cy);
    if (handle) {
      this.resizing = true;
      this.resizeHandle = handle;
      this.resizeStartX = cx;
      this.resizeStartY = cy;
      const el = this.elements.find(e => e.id === this.selected[0]);
      this.resizeOrigFontSize = el ? (el.fontSize || 12) : 12;
      return;
    }

    // Middle-click or space+click to pan
    if (e.button === 1) {
      this.panning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panOrigX = this.panX;
      this.panOrigY = this.panY;
      this.wrapper.style.cursor = 'grabbing';
      return;
    }

    // Left click
    if (e.button === 0) {
      const hit = this._hitTest(cx, cy);
      if (hit) {
        if (e.shiftKey) {
          // Toggle selection
          const idx = this.selected.indexOf(hit.id);
          if (idx >= 0) this.selected.splice(idx, 1);
          else this.selected.push(hit.id);
        } else if (!this.selected.includes(hit.id)) {
          this.selected = [hit.id];
        }
        // Start drag
        this.dragging = true;
        this.dragStartX = cx;
        this.dragStartY = cy;
        this.dragOrigPositions = {};
        for (const id of this.selected) {
          const el = this.elements.find(e => e.id === id);
          if (el) {
            if (el._type === 'sticker') {
              this.dragOrigPositions[id] = { x: el.x, y: el.y };
            } else {
              this.dragOrigPositions[id] = { x: el.position ? el.position.x : 0, y: el.position ? el.position.y : 0 };
            }
          }
        }
      } else {
        // Click on empty area → deselect
        if (!e.shiftKey) this.selected = [];
        // Start pan with left click on empty
        this.panning = true;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.panOrigX = this.panX;
        this.panOrigY = this.panY;
        this.wrapper.style.cursor = 'grabbing';
      }
      this._notifySelection();
      this.render();
    }
  },

  _handleMouseMove(e) {
    if (this.panning) {
      this.panX = this.panOrigX + (e.clientX - this.panStartX);
      this.panY = this.panOrigY + (e.clientY - this.panStartY);
      this.render();
      return;
    }

    if (this.resizing && this.selected.length === 1) {
      const { x: cx, y: cy } = this.screenToCanvas(e.clientX, e.clientY);
      const dy = cy - this.resizeStartY;
      const el = this.elements.find(e => e.id === this.selected[0]);
      if (el) {
        // Scale font size based on handle drag
        const handle = this.resizeHandle.id;
        let scale = 1;
        if (handle.includes('b')) {
          scale = 1 + (dy / this.canvasHeightPx) * 2;
        } else if (handle.includes('t')) {
          scale = 1 - (dy / this.canvasHeightPx) * 2;
        } else {
          const dx = cx - this.resizeStartX;
          scale = 1 + (dx / this.canvasWidthPx) * 2;
        }
        scale = Math.max(0.4, Math.min(3, scale));
        el.fontSize = Math.round(this.resizeOrigFontSize * scale * 10) / 10;
        if (this.onElementsChange) this.onElementsChange(this.elements);
        this._notifySelection();
        this.render();
      }
      return;
    }

    if (this.dragging && this.selected.length > 0) {
      const { x: cx, y: cy } = this.screenToCanvas(e.clientX, e.clientY);
      const dx = cx - this.dragStartX;
      const dy = cy - this.dragStartY;

      this.guides = [];

      for (const id of this.selected) {
        const el = this.elements.find(e => e.id === id);
        if (!el) continue;
        const orig = this.dragOrigPositions[id];

        if (el._type === 'sticker') {
          // Sticker uses percentage coords
          let newX = orig.x + (dx / this.canvasWidthPx) * 100;
          let newY = orig.y + (dy / this.canvasHeightPx) * 100;
          newX = Math.max(0, Math.min(100, newX));
          newY = Math.max(0, Math.min(100, newY));

          if (this.snapToGrid) {
            const snapPct = 2;
            newX = Math.round(newX / snapPct) * snapPct;
            newY = Math.round(newY / snapPct) * snapPct;

            // Snap guides: center (50%), edges
            const snapTargets = [0, 10, 25, 50, 75, 90, 100];
            for (const t of snapTargets) {
              if (Math.abs(newX - t) < 1.5) { newX = t; this.guides.push({ axis: 'x', pos: t }); }
              if (Math.abs(newY - t) < 1.5) { newY = t; this.guides.push({ axis: 'y', pos: t }); }
            }
          }
          el.x = Math.round(newX * 10) / 10;
          el.y = Math.round(newY * 10) / 10;
        } else {
          // Label uses position in a 400-wide pixel reference frame
          // dx/dy are in canvas-pixel space (mm-based), need to convert to 400-wide system
          const refW = 400;
          const refH = Math.round((this.paperHeight / this.paperWidth) * refW);
          let newX = orig.x + (dx / this.canvasWidthPx) * refW;
          let newY = orig.y + (dy / this.canvasHeightPx) * refH;
          newX = Math.max(0, Math.min(refW, newX));
          newY = Math.max(0, Math.min(refH, newY));

          if (this.snapToGrid) {
            const snapPx = 5;
            newX = Math.round(newX / snapPx) * snapPx;
            newY = Math.round(newY / snapPx) * snapPx;

            // Center guides
            const centerX = refW / 2;
            const centerY = refH / 2;
            if (Math.abs(newX - centerX) < 8) { newX = centerX; this.guides.push({ axis: 'x', posMm: this.paperWidth / 2 }); }
            if (Math.abs(newY - centerY) < 8) { newY = centerY; this.guides.push({ axis: 'y', posMm: this.paperHeight / 2 }); }
          }

          // Labels store position in 400-wide pixel reference
          if (el.position) {
            el.position.x = Math.round(newX);
            el.position.y = Math.round(newY);
          }
        }
      }

      if (this.onElementsChange) this.onElementsChange(this.elements);
      this._notifySelection();
      this.render();
      return;
    }

    // Hover cursor
    if (!this.dragging && !this.panning && !this.resizing) {
      const { x: cx, y: cy } = this.screenToCanvas(e.clientX, e.clientY);
      const handle = this._hitTestHandle(cx, cy);
      if (handle) {
        const cursors = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize',
                          tm: 'ns-resize', bm: 'ns-resize', ml: 'ew-resize', mr: 'ew-resize' };
        this.wrapper.style.cursor = cursors[handle.id] || 'default';
      } else if (this._hitTest(cx, cy)) {
        this.wrapper.style.cursor = 'move';
      } else {
        this.wrapper.style.cursor = 'default';
      }
    }
  },

  _handleMouseUp(e) {
    if (this.dragging || this.resizing) {
      this._pushHistory();
    }
    this.dragging = false;
    this.resizing = false;
    this.panning = false;
    this.guides = [];
    this.wrapper.style.cursor = 'default';
    this.render();
  },

  _handleWheel(e) {
    e.preventDefault();
    const rect = this.wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const oldZoom = this.zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.2, Math.min(5, this.zoom * delta));

    // Zoom toward mouse position
    this.panX = mx - (mx - this.panX) * (this.zoom / oldZoom);
    this.panY = my - (my - this.panY) * (this.zoom / oldZoom);

    this.render();
  },

  _handleDblClick(e) {
    const { x: cx, y: cy } = this.screenToCanvas(e.clientX, e.clientY);
    const hit = this._hitTest(cx, cy);
    if (hit) {
      this._startInlineEdit(hit, e.clientX, e.clientY);
    }
  },

  _handleKeyDown(e) {
    // Don't intercept if editing or if a form input has focus
    if (this.editing) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    // Also skip if editor overlay is not visible
    if (!this.wrapper || !this.wrapper.offsetParent) return;

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      this.redo();
      return;
    }

    // Delete selected
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected.length > 0) {
      e.preventDefault();
      this.deleteSelected();
      return;
    }

    // Arrow key nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && this.selected.length > 0) {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      for (const id of this.selected) {
        const el = this.elements.find(e => e.id === id);
        if (!el) continue;
        if (el._type === 'sticker') {
          const pctStep = step * 0.5;
          if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - pctStep);
          if (e.key === 'ArrowRight') el.x = Math.min(100, el.x + pctStep);
          if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - pctStep);
          if (e.key === 'ArrowDown') el.y = Math.min(100, el.y + pctStep);
        } else if (el.position) {
          const pxStep = step;
          if (e.key === 'ArrowLeft') el.position.x = Math.max(0, el.position.x - pxStep);
          if (e.key === 'ArrowRight') el.position.x += pxStep;
          if (e.key === 'ArrowUp') el.position.y = Math.max(0, el.position.y - pxStep);
          if (e.key === 'ArrowDown') el.position.y += pxStep;
        }
      }
      this._pushHistory();
      if (this.onElementsChange) this.onElementsChange(this.elements);
      this._notifySelection();
      this.render();
    }

    // Escape deselect
    if (e.key === 'Escape') {
      this.selected = [];
      this._notifySelection();
      this.render();
    }

    // Ctrl+A select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      this.selected = this.elements.map(e => e.id);
      this._notifySelection();
      this.render();
    }
  },

  _handleContextMenu(e) {
    e.preventDefault();
  },

  // ---- Inline text editing ----
  _startInlineEdit(el, screenX, screenY) {
    this.editing = true;
    this.editingElement = el;

    const bounds = this._getElementBounds(el);
    const screenPos = this.canvasToScreen(bounds.x, bounds.y);
    const rect = this.wrapper.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.value = el.text || el.value || el.name || '';
    input.className = 'canvas-inline-edit';
    input.style.cssText = `
      position: absolute;
      left: ${bounds.x * this.zoom + this.panX - 2}px;
      top: ${bounds.y * this.zoom + this.panY - 2}px;
      width: ${Math.max(bounds.w * this.zoom + 20, 120)}px;
      height: ${bounds.h * this.zoom + 4}px;
      font-size: ${(el.fontSize || 12) * this.zoom}px;
      font-family: ${el.fontFamily || 'Arial'};
      font-weight: ${el.bold ? 'bold' : 'normal'};
      background: #fffde7;
      border: 2px solid #ffc107;
      border-radius: 3px;
      outline: none;
      padding: 0 4px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    const commit = () => {
      const newVal = input.value;
      if (el.text !== undefined) el.text = newVal;
      else if (el.value !== undefined) el.value = newVal;
      else if (el.content !== undefined) el.content = newVal;
      if (input.parentNode) input.parentNode.removeChild(input);
      this.editing = false;
      this.editingElement = null;
      this._pushHistory();
      if (this.onElementsChange) this.onElementsChange(this.elements);
      this._notifySelection();
      this.render();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') {
        if (input.parentNode) input.parentNode.removeChild(input);
        this.editing = false;
        this.editingElement = null;
        this.render();
      }
    });

    this.wrapper.appendChild(input);
    input.focus();
    input.select();
  },

  // ---- History ----
  _pushHistory() {
    const state = JSON.stringify(this.elements);
    // Remove future states if we're in the middle of history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  },

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.elements = JSON.parse(this.history[this.historyIndex]);
    this.selected = this.selected.filter(id => this.elements.some(e => e.id === id));
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.elements = JSON.parse(this.history[this.historyIndex]);
    this.selected = this.selected.filter(id => this.elements.some(e => e.id === id));
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  // ---- Element operations ----
  addElement(el) {
    this.elements.push(el);
    this.selected = [el.id];
    this._pushHistory();
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  deleteSelected() {
    if (this.selected.length === 0) return;
    this.elements = this.elements.filter(e => !this.selected.includes(e.id));
    this.selected = [];
    this._pushHistory();
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  deleteElement(id) {
    this.elements = this.elements.filter(e => e.id !== id);
    this.selected = this.selected.filter(sid => sid !== id);
    this._pushHistory();
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  updateElement(id, props) {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    Object.assign(el, props);
    this._pushHistory();
    if (this.onElementsChange) this.onElementsChange(this.elements);
    this._notifySelection();
    this.render();
  },

  selectElement(id) {
    this.selected = id ? [id] : [];
    this._notifySelection();
    this.render();
  },

  getSelectedElement() {
    if (this.selected.length !== 1) return null;
    return this.elements.find(e => e.id === this.selected[0]) || null;
  },

  // ---- Notification ----
  _notifySelection() {
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selected.length === 1 ? this.getSelectedElement() : null);
    }
  },

  // ---- Paper change ----
  setPaper(widthMm, heightMm) {
    this.paperWidth = widthMm;
    this.paperHeight = heightMm;
    this._fitToView();
    this.render();
  },

  setZoom(z) {
    const rect = this.wrapper.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldZoom = this.zoom;
    this.zoom = Math.max(0.2, Math.min(5, z));
    this.panX = cx - (cx - this.panX) * (this.zoom / oldZoom);
    this.panY = cy - (cy - this.panY) * (this.zoom / oldZoom);
    this.render();
  },

  fitToView() {
    this._fitToView();
    this.render();
  },

  // ============================================================
  // RENDERING
  // ============================================================
  render() {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const ww = this.wrapper.clientWidth;
    const wh = this.wrapper.clientHeight;

    this.canvas.width = ww * dpr;
    this.canvas.height = wh * dpr;
    this.canvas.style.width = ww + 'px';
    this.canvas.style.height = wh + 'px';

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, ww, wh);

    // Apply viewport transform
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw paper shadow
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvasWidthPx, this.canvasHeightPx);
    ctx.shadowColor = 'transparent';

    // Paper border
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, this.canvasWidthPx, this.canvasHeightPx);

    // Grid
    if (this.showGrid) {
      this._drawGrid(ctx);
    }

    // Snap guides
    this._drawGuides(ctx);

    // Draw elements
    this._drawElements(ctx);

    // Selection handles
    this._drawSelectionHandles(ctx);

    ctx.restore();

    // Draw rulers (outside viewport transform)
    if (this.showRulers) {
      this._drawRulers(ctx, ww, wh);
    }
  },

  _drawGrid(ctx) {
    const gridMm = this.gridSize > 0 ? this.gridSize : 5;
    const gridPx = this.mmToPx(gridMm);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5 / this.zoom;

    for (let x = gridPx; x < this.canvasWidthPx; x += gridPx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeightPx);
    }
    for (let y = gridPx; y < this.canvasHeightPx; y += gridPx) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidthPx, y);
    }
    ctx.stroke();

    // Center crosshair
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(25,118,210,0.15)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
    const cx = this.canvasWidthPx / 2;
    const cy = this.canvasHeightPx / 2;
    ctx.moveTo(cx, 0); ctx.lineTo(cx, this.canvasHeightPx);
    ctx.moveTo(0, cy); ctx.lineTo(this.canvasWidthPx, cy);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  _drawGuides(ctx) {
    if (this.guides.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 1 / this.zoom;
    ctx.setLineDash([3 / this.zoom, 3 / this.zoom]);

    for (const g of this.guides) {
      if (g.axis === 'x') {
        const px = g.posMm != null ? this.mmToPx(g.posMm) : (g.pos / 100) * this.canvasWidthPx;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, this.canvasHeightPx);
      } else {
        const py = g.posMm != null ? this.mmToPx(g.posMm) : (g.pos / 100) * this.canvasHeightPx;
        ctx.moveTo(0, py);
        ctx.lineTo(this.canvasWidthPx, py);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  _drawElements(ctx) {
    for (const el of this.elements) {
      const isSelected = this.selected.includes(el.id);
      this._drawElement(ctx, el, isSelected);
    }
  },

  _drawElement(ctx, el, isSelected) {
    const text = el.text || el.value || el.content || el.name || '';
    if (!text) return;

    // Calculate position
    let x, y;
    if (el._type === 'sticker') {
      x = (el.x / 100) * this.canvasWidthPx;
      y = (el.y / 100) * this.canvasHeightPx;
    } else if (el.position) {
      // Label system: position is in canvas px (400-wide system)
      // Convert to our mm-based coordinate system
      const canvasRefW = 400;
      const canvasRefH = Math.round((this.paperHeight / this.paperWidth) * canvasRefW);
      x = (el.position.x / canvasRefW) * this.canvasWidthPx;
      y = (el.position.y / canvasRefH) * this.canvasHeightPx;
    } else {
      x = this.mmToPx(el.x || 0);
      y = this.mmToPx(el.y || 0);
    }

    // Font
    const fontSize = el.fontSize || 12;
    let pxSize;
    if (el._type === 'sticker') {
      // Sticker fontSize is already in pt-equivalent, scale to canvas
      pxSize = this.mmToPx(fontSize * 0.35);  // pt to mm approx
    } else {
      // Label fontSize is in canvas pixels → convert proportionally
      pxSize = (fontSize / 400) * this.canvasWidthPx * 1.1;
      if (pxSize < 3) pxSize = 3;
    }

    const fontStyle = (el.bold ? 'bold ' : '') + pxSize + 'px ' + (el.fontFamily || 'Arial');
    ctx.font = fontStyle;
    ctx.fillStyle = el.color || '#000000';

    const align = el.textAlign || el.align || 'left';
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    // Rotation
    const rotation = el.rotation || 0;
    if (rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(text, x, y);
    }

    // Selection highlight
    if (isSelected) {
      const bounds = this._getElementBounds(el);
      ctx.save();
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.setLineDash([4 / this.zoom, 2 / this.zoom]);
      ctx.strokeRect(bounds.x - 2 / this.zoom, bounds.y - 2 / this.zoom,
                     bounds.w + 4 / this.zoom, bounds.h + 4 / this.zoom);
      ctx.setLineDash([]);
      ctx.restore();
    }
  },

  _drawSelectionHandles(ctx) {
    if (this.selected.length !== 1) return;
    const el = this.elements.find(e => e.id === this.selected[0]);
    if (!el) return;

    const bounds = this._getElementBounds(el);
    const hs = 5 / this.zoom;
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.w, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.h },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      { x: bounds.x + bounds.w / 2, y: bounds.y },
      { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
      { x: bounds.x, y: bounds.y + bounds.h / 2 },
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 }
    ];

    for (const h of handles) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.fillRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
      ctx.strokeRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
    }
  },

  _drawRulers(ctx, ww, wh) {
    const rulerSize = 24;
    const rulerBg = '#f5f5f5';
    const rulerText = '#666';
    const rulerTick = '#aaa';

    // Top ruler
    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, ww, rulerSize);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, rulerSize, ww, 1);

    // Left ruler
    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, rulerSize, wh);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(rulerSize, 0, 1, wh);

    // Corner box
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, rulerSize, rulerSize);

    // Tick marks (mm)
    ctx.fillStyle = rulerText;
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Horizontal ticks
    const mmPx = this.mmToPx(1) * this.zoom;
    const startMm = -this.panX / (mmPx);
    const endMm = startMm + ww / mmPx;
    const tickInterval = mmPx < 4 ? 10 : mmPx < 8 ? 5 : 1;

    for (let mm = Math.floor(startMm / tickInterval) * tickInterval; mm <= endMm; mm += tickInterval) {
      const screenX = this.panX + mm * this.mmToPx(1) * this.zoom;
      if (screenX < rulerSize || screenX > ww) continue;

      const isMajor = mm % 10 === 0;
      ctx.strokeStyle = rulerTick;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(screenX, isMajor ? 2 : rulerSize - 6);
      ctx.lineTo(screenX, rulerSize);
      ctx.stroke();

      if (isMajor && mm >= 0) {
        ctx.fillText(mm + '', screenX, 3);
      }
    }

    // Vertical ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let mm = Math.floor(-this.panY / mmPx / tickInterval) * tickInterval; mm <= (-this.panY + wh) / mmPx; mm += tickInterval) {
      const screenY = this.panY + mm * this.mmToPx(1) * this.zoom;
      if (screenY < rulerSize || screenY > wh) continue;

      const isMajor = mm % 10 === 0;
      ctx.strokeStyle = rulerTick;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(isMajor ? 2 : rulerSize - 6, screenY);
      ctx.lineTo(rulerSize, screenY);
      ctx.stroke();

      if (isMajor && mm >= 0) {
        ctx.save();
        ctx.translate(11, screenY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(mm + '', 0, 0);
        ctx.restore();
      }
    }
  }
};
