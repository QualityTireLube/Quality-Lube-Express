/* ============================================================
   admin-state-inspections.js — State Vehicle Inspection Log
   Manages state inspection records: add, view, filter, CSV import
   Saves to Firestore collection: state_inspections
   ============================================================ */

const StateInspections = (() => {
  // ── State ──────────────────────────────────────────────────
  let records = [];              // all loaded records
  let filteredRecords = [];      // after search/date filter
  let archivedRecords = [];      // archived records
  let showArchived = false;      // whether archived section is visible
  let currentUserName = '';      // display name of logged-in user
  let editingId = null;          // id of record being edited (null = new)
  let unsubscribe = null;        // Firestore real-time listener

  // ── Pagination / lazy-render ──
  const PAGE_SIZE = 50;
  let renderedCount = 0;
  let archivedRenderedCount = 0;
  let _filterDebounceTimer = null;

  // Date filter state
  let filterDateFrom = '';
  let filterDateTo = '';
  let filterSearch = '';
  let filterStatus = '';
  let filterFleet = '';

  // Fleet account names derived from records + fleet_accounts collection
  let knownFleetAccounts = [];

  // State inspection employees from settings
  let siEmployees = [];
  let siEmployeesUnsubscribe = null;

  // ── Init ───────────────────────────────────────────────────
  function init(userDisplayName) {
    currentUserName = userDisplayName || '';
    _bindStaticEvents();
    _startListener();
    _loadFleetAccountsCollection();
    _loadSIEmployees();
    _bindSettingsEvents();
  }

  function _bindStaticEvents() {
    // Add button
    const addBtn = document.getElementById('si-add-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    // CSV import button
    const csvBtn = document.getElementById('si-import-btn');
    if (csvBtn) csvBtn.addEventListener('click', () => document.getElementById('si-csv-input').click());

    // CSV file input
    const csvInput = document.getElementById('si-csv-input');
    if (csvInput) csvInput.addEventListener('change', handleCsvImport);

    // Modal save
    const saveBtn = document.getElementById('si-modal-save');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);

    // Modal cancel / close
    ['si-modal-cancel', 'si-modal-close'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeModal);
    });

    // Close panel when clicking the overlay backdrop
    const overlay = document.getElementById('si-modal');
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Search / date filters
    const searchEl = document.getElementById('si-search');
    if (searchEl) searchEl.addEventListener('input', _onFilterChange);

    const statusEl = document.getElementById('si-filter-status');
    if (statusEl) statusEl.addEventListener('change', _onFilterChange);

    const fromEl = document.getElementById('si-filter-from');
    if (fromEl) fromEl.addEventListener('change', _onFilterChange);

    const toEl = document.getElementById('si-filter-to');
    if (toEl) toEl.addEventListener('change', _onFilterChange);

    const clearBtn = document.getElementById('si-filter-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    // Export CSV
    const exportBtn = document.getElementById('si-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);

    // Fleet filter in filter bar
    const fleetFilterEl = document.getElementById('si-filter-fleet');
    if (fleetFilterEl) fleetFilterEl.addEventListener('input', _onFilterChange);

    // Fleet combobox in modal form
    _wireFleetCombobox();

    // Payment amount chips
    document.querySelectorAll('.si-chip-payment').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.si-chip-payment').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // Show/hide custom amount input
        const customWrap = document.getElementById('si-custom-amount-wrap');
        if (chip.dataset.value === 'custom') {
          if (customWrap) customWrap.style.display = 'block';
        } else {
          if (customWrap) customWrap.style.display = 'none';
        }
      });
    });

    // Tint affidavit photo
    const tintBtn = document.getElementById('si-tint-photo-btn');
    const tintInput = document.getElementById('si-tint-input');
    if (tintBtn && tintInput) {
      tintBtn.addEventListener('click', () => tintInput.click());
      tintInput.addEventListener('change', handleTintPhoto);
    }

    // Fleet name visibility: show when Fleet payment type selected
    document.querySelectorAll('.si-chip-payment-type').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.si-chip-payment-type').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const fleetRow = document.getElementById('si-fleet-row');
        if (fleetRow) {
          fleetRow.style.display = chip.dataset.value === 'Fleet' ? 'block' : 'none';
        }
      });
    });

    // Status chips
    document.querySelectorAll('.si-chip-status').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.si-chip-status').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  // ── Firestore real-time listener ───────────────────────────
  function _startListener() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (typeof db === 'undefined') {
      setTimeout(_startListener, 500);
      return;
    }
    _showLoading(true);
    unsubscribe = db.collection('state_inspections')
      .orderBy('createdDate', 'desc')
      .onSnapshot(snap => {
        records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _buildFleetFromRecords();
        _applyFilters();
        _showLoading(false);
      }, err => {
        console.error('[StateInspections] Firestore error:', err);
        _showLoading(false);
        _renderError('Error loading records: ' + err.message);
      });
  }

  function _showLoading(show) {
    const el = document.getElementById('si-loading');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function _renderError(msg) {
    const list = document.getElementById('si-records-list');
    if (list) list.innerHTML = `<div class="alert alert-danger">${_esc(msg)}</div>`;
  }

  // ── Filtering ──────────────────────────────────────────────
  function _onFilterChange() {
    filterSearch = (document.getElementById('si-search') || {}).value || '';
    filterStatus = (document.getElementById('si-filter-status') || {}).value || '';
    filterDateFrom = (document.getElementById('si-filter-from') || {}).value || '';
    filterDateTo = (document.getElementById('si-filter-to') || {}).value || '';
    filterFleet = (document.getElementById('si-filter-fleet') || {}).value || '';
    if (_filterDebounceTimer) clearTimeout(_filterDebounceTimer);
    _filterDebounceTimer = setTimeout(() => { _filterDebounceTimer = null; _applyFilters(); }, 180);
  }

  function clearFilters() {
    filterSearch = filterStatus = filterDateFrom = filterDateTo = filterFleet = '';
    const ids = ['si-search', 'si-filter-status', 'si-filter-from', 'si-filter-to', 'si-filter-fleet'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _applyFilters();
  }

  function _applyFilters() {
    // Separate active vs archived
    const active = records.filter(r => !r.archived);
    const archived = records.filter(r => r.archived);

    let res = [...active];

    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      res = res.filter(r =>
        (r.lastName || '').toLowerCase().includes(q) ||
        String(r.stickerNumber || '').includes(q) ||
        (r.createdBy || '').toLowerCase().includes(q) ||
        (r.fleetAccount || '').toLowerCase().includes(q)
      );
    }

    if (filterStatus) {
      res = res.filter(r => r.status === filterStatus);
    }

    if (filterDateFrom) {
      res = res.filter(r => (r.createdDate || '') >= filterDateFrom);
    }
    if (filterDateTo) {
      res = res.filter(r => (r.createdDate || '') <= filterDateTo);
    }

    if (filterFleet) {
      const q = filterFleet.toLowerCase();
      res = res.filter(r => (r.fleetAccount || '').toLowerCase().includes(q));
    }

    filteredRecords = res;
    archivedRecords = archived;
    _renderList();
    _renderStats();
    _renderArchivedSection();
  }

  // ── Stats bar ──────────────────────────────────────────────
  function _renderStats() {
    const total = filteredRecords.length;
    const pass = filteredRecords.filter(r => r.status === 'Pass').length;
    const retest = filteredRecords.filter(r => r.status === 'Retest').length;
    const fail = filteredRecords.filter(r => r.status === 'Fail').length;
    const revenue = filteredRecords.reduce((s, r) => s + (_parseMoney(r.paymentAmount)), 0);

    _setText('si-stat-total', total);
    _setText('si-stat-pass', pass);
    _setText('si-stat-retest', retest);
    _setText('si-stat-fail', fail);
    _setText('si-stat-revenue', '$' + revenue.toFixed(2));
  }

  function _parseMoney(val) {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  // ── List rendering (chunked / lazy) ─────────────────────────
  function _renderList() {
    const container = document.getElementById('si-records-list');
    if (!container) return;
    renderedCount = 0;

    if (filteredRecords.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-clipboard-check fa-3x mb-3 d-block opacity-25"></i>
          <p>No inspection records found</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    _appendRecordBatch(container, false);
  }

  /** Append the next PAGE_SIZE records to a container (active or archived). */
  function _appendRecordBatch(container, isArchived) {
    const source = isArchived ? archivedRecords : filteredRecords;
    const count  = isArchived ? archivedRenderedCount : renderedCount;
    const end    = Math.min(count + PAGE_SIZE, source.length);
    const batch  = source.slice(count, end);
    if (batch.length === 0) return;

    // Remove existing "load more" button
    const oldWrap = container.querySelector('.si-load-more-wrap');
    if (oldWrap) oldWrap.remove();

    // Continue into the last rendered date group if the first new record shares its date
    const firstDate    = batch[0].createdDate || 'Unknown';
    const lastGroupEl  = container.querySelector('.si-date-group:last-child');
    const lastGroupDate = lastGroupEl ? (lastGroupEl.dataset.date || '') : '';
    let currentGroupEl  = (firstDate === lastGroupDate) ? lastGroupEl : null;
    let lastDate        = currentGroupEl ? lastGroupDate : '';

    const frag = document.createDocumentFragment();

    batch.forEach(r => {
      const d = r.createdDate || 'Unknown';
      if (d !== lastDate || !currentGroupEl) {
        const label = d === 'Unknown' ? 'Unknown Date' : _formatDate(d);
        currentGroupEl = document.createElement('div');
        currentGroupEl.className = 'si-date-group';
        currentGroupEl.dataset.date = d;
        const header = document.createElement('div');
        header.className = 'si-date-header';
        header.innerHTML = `<span>${_esc(label)}</span><span class="badge bg-secondary ms-2">0</span>`;
        currentGroupEl.appendChild(header);
        frag.appendChild(currentGroupEl);
        lastDate = d;
      }
      const wrapper = document.createElement('div');
      wrapper.innerHTML = _renderCard(r, isArchived);
      currentGroupEl.appendChild(wrapper.firstElementChild);
      const badge = currentGroupEl.querySelector('.si-date-header .badge');
      if (badge) badge.textContent = currentGroupEl.querySelectorAll('.si-record-card').length;
    });

    container.appendChild(frag);
    if (isArchived) { archivedRenderedCount = end; } else { renderedCount = end; }

    const remaining = source.length - end;
    if (remaining > 0) {
      const wrap = document.createElement('div');
      wrap.className = 'si-load-more-wrap text-center py-3';
      const fn = isArchived ? 'loadMoreArchived' : 'loadMore';
      wrap.innerHTML = `<button class="btn btn-outline-secondary btn-sm si-load-more-btn" onclick="StateInspections.${fn}()">
        <i class="fas fa-chevron-down me-1"></i>Load More (${remaining} remaining)
      </button>`;
      container.appendChild(wrap);
    }
  }

  function _loadMore() {
    const container = document.getElementById('si-records-list');
    if (container) _appendRecordBatch(container, false);
  }

  function _loadMoreArchived() {
    const container = document.getElementById('si-archived-records-inner');
    if (container) _appendRecordBatch(container, true);
  }

  function _renderCard(r, isArchived) {
    const statusClass = r.status === 'Pass' ? 'success' : r.status === 'Fail' ? 'danger' : 'warning';
    const statusIcon = r.status === 'Pass' ? 'fa-check-circle' : r.status === 'Fail' ? 'fa-times-circle' : 'fa-redo';
    const payAmt = r.paymentAmount !== undefined ? '$' + _parseMoney(r.paymentAmount).toFixed(2) : '';
    const payIcon = r.paymentType === 'Fleet' ? 'fa-truck' : 'fa-money-bill-wave';
    const payColor = r.paymentType === 'Fleet' ? '#e67e22' : '#27ae60';

    const actionButtons = isArchived
      ? `<button class="btn btn-sm btn-outline-success" onclick="StateInspections.restoreRecord('${r.id}')" title="Restore"><i class="fas fa-undo"></i></button>
         <button class="btn btn-sm btn-outline-danger" onclick="StateInspections.permanentDelete('${r.id}')" title="Delete Permanently"><i class="fas fa-trash"></i></button>`
      : `${r.tintAffidavitUrl ? `<button class="btn btn-sm btn-outline-info" onclick="StateInspections.viewTint('${r.id}')" title="View Tint Photo"><i class="fas fa-camera"></i></button>` : ''}
         <button class="btn btn-sm btn-outline-primary" onclick="StateInspections.openEdit('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
         <button class="btn btn-sm btn-outline-warning" onclick="StateInspections.archiveRecord('${r.id}')" title="Archive"><i class="fas fa-archive"></i></button>`;

    return `
      <div class="si-record-card${isArchived ? ' si-archived-card' : ''}" data-id="${r.id}">
        <div class="si-record-main">
          <div class="si-record-left">
            <i class="fas ${statusIcon} text-${statusClass} me-2"></i>
            <span class="si-sticker-num">${_esc(String(r.stickerNumber || ''))}</span>
          </div>
          <div class="si-record-center">
            <span class="si-last-name">${_esc(r.lastName || '')}</span>
            ${r.fleetAccount ? `<span class="badge bg-warning text-dark ms-2">${_esc(r.fleetAccount)}</span>` : ''}
            ${r.notes ? `<div class="si-notes-preview text-muted">${_esc(r.notes.slice(0, 80))}${r.notes.length > 80 ? '…' : ''}</div>` : ''}
          </div>
          <div class="si-record-right">
            <span style="color:${payColor};font-weight:600;">
              <i class="fas ${payIcon} me-1"></i>${payAmt}
            </span>
            <div class="si-record-actions">
              ${actionButtons}
            </div>
          </div>
        </div>
        <div class="si-record-meta">
          <i class="fas fa-user me-1"></i>${_esc(r.createdBy || '')}
          ${r.paymentType ? `<span class="ms-3"><i class="fas fa-receipt me-1"></i>${_esc(r.paymentType)}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Archived section rendering ─────────────────────────────
  function _renderArchivedSection() {
    let container = document.getElementById('si-archived-section');
    if (!container) return;

    const count = archivedRecords.length;
    const toggleBtn = document.getElementById('si-toggle-archived');
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i class="fas fa-archive me-1"></i>Archived (${count})`;
      toggleBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (!showArchived || count === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      archivedRenderedCount = 0;
      return;
    }

    container.style.display = 'block';
    archivedRenderedCount = 0;

    container.innerHTML = `<div class="si-archived-header">
      <i class="fas fa-archive me-2"></i>Archived Records
      <span class="badge bg-secondary ms-2">${count}</span>
    </div>
    <div id="si-archived-records-inner"></div>`;

    const inner = document.getElementById('si-archived-records-inner');
    if (inner) _appendRecordBatch(inner, true);
  }

  function _toggleArchived() {
    showArchived = !showArchived;
    _renderArchivedSection();
  }

  // ── Modal: open/close (slide-in panel) ──────────────────────
  function _openPanel() {
    const overlay = document.getElementById('si-modal');
    overlay.style.display = 'flex';
    // Trigger reflow for CSS transition
    void overlay.offsetWidth;
    overlay.classList.add('open');
  }

  function openAddModal() {
    editingId = null;
    _resetForm();
    document.getElementById('si-modal-title').textContent = 'Add State Inspection';
    _openPanel();
  }

  function openEdit(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    _resetForm();
    _populateForm(r);
    document.getElementById('si-modal-title').textContent = 'Edit Inspection';
    _openPanel();
  }

  function closeModal() {
    const overlay = document.getElementById('si-modal');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 260);
    editingId = null;
    // reset tint preview
    const preview = document.getElementById('si-tint-preview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  }

  function _resetForm() {
    const today = _localToday();

    _val('si-form-date', today);
    _val('si-form-sticker', '');
    _val('si-form-lastname', '');
    _val('si-form-notes', '');
    _val('si-form-fleet', '');
    _val('si-custom-amount', '');

    // Clear chip selections
    document.querySelectorAll('.si-chip-payment-type, .si-chip-payment, .si-chip-status, .si-chip-createdby')
      .forEach(c => c.classList.remove('active'));

    // Default payment type Cash, amount $18, status Pass
    _activateChip('.si-chip-payment-type', 'Cash');
    _activateChip('.si-chip-payment', '18');
    _activateChip('.si-chip-status', 'Pass');

    // Hide fleet row & custom amount
    const fleetRow = document.getElementById('si-fleet-row');
    if (fleetRow) fleetRow.style.display = 'none';
    const customWrap = document.getElementById('si-custom-amount-wrap');
    if (customWrap) customWrap.style.display = 'none';

    // Clear tint
    const input = document.getElementById('si-tint-input');
    if (input) input.value = '';
    document.getElementById('si-tint-preview').innerHTML = '';
    document.getElementById('si-tint-preview').style.display = 'none';

    // Clear error
    _setError('');
    _renderCreatedByChips();
  }

  // ── SI Employee settings (Firestore) ───────────────────────
  function _loadSIEmployees() {
    if (typeof db === 'undefined') { setTimeout(_loadSIEmployees, 500); return; }
    siEmployeesUnsubscribe = db.collection('settings').doc('state_inspection_employees')
      .onSnapshot(snap => {
        const data = snap.data();
        siEmployees = (data && data.employees) ? data.employees : [];
        _renderCreatedByChips();
        _renderSettingsEmployeeList();
        _populateUserSelect();
      }, err => {
        console.error('[StateInspections] Failed to load SI employees:', err);
      });
  }

  function _bindSettingsEvents() {
    // Add from custom name
    const addBtn = document.getElementById('si-settings-add-employee');
    const input = document.getElementById('si-settings-new-employee');
    if (addBtn && input) {
      addBtn.addEventListener('click', () => _addSIEmployeeByName(input));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') _addSIEmployeeByName(input); });
    }

    // Add from existing user dropdown
    const addFromUsersBtn = document.getElementById('si-settings-add-from-users');
    if (addFromUsersBtn) addFromUsersBtn.addEventListener('click', _addSIEmployeeFromSelect);
  }

  function _populateUserSelect() {
    const select = document.getElementById('si-settings-user-select');
    if (!select) return;

    let options = '<option value="">\u2014 Select a user \u2014</option>';
    if (typeof UserManagement !== 'undefined' && typeof UserManagement.getAllUsers === 'function') {
      const users = UserManagement.getAllUsers().filter(u => u.status === 'approved');
      users.forEach(u => {
        const name = u.displayName || u.email || '';
        if (name && !siEmployees.includes(name)) {
          options += `<option value="${_esc(name)}">${_esc(name)}${u.role === 'admin' ? ' (Admin)' : ''}</option>`;
        }
      });
    }
    select.innerHTML = options;
  }

  function _toggleSettings() {
    const panel = document.getElementById('si-settings-panel');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';
    if (!visible) _populateUserSelect();
  }

  function _addSIEmployeeFromSelect() {
    const select = document.getElementById('si-settings-user-select');
    if (!select || !select.value) return;
    const name = select.value;
    if (siEmployees.includes(name)) { alert('Already in the list.'); return; }
    _saveSIEmployees([...siEmployees, name]);
  }

  async function _addSIEmployeeByName(input) {
    const name = input.value.trim();
    if (!name) return;
    if (siEmployees.includes(name)) { alert('Employee already exists.'); return; }
    await _saveSIEmployees([...siEmployees, name]);
    input.value = '';
  }

  async function _saveSIEmployees(list) {
    try {
      await db.collection('settings').doc('state_inspection_employees').set({ employees: list }, { merge: true });
    } catch (e) {
      alert('Failed to save employees: ' + e.message);
    }
  }

  async function _removeSIEmployee(name) {
    if (!confirm('Remove "' + name + '" from the inspection employee list?')) return;
    await _saveSIEmployees(siEmployees.filter(n => n !== name));
  }

  function _renderSettingsEmployeeList() {
    const container = document.getElementById('si-settings-employee-list');
    if (!container) return;
    if (siEmployees.length === 0) {
      container.innerHTML = '<p class="text-muted mb-0"><i class="fas fa-info-circle me-1"></i>No employees added yet. Add employees above to populate the "Created By" options.</p>';
      return;
    }
    container.innerHTML = siEmployees.map(name => `
      <div class="d-flex align-items-center justify-content-between py-2 px-3 mb-1" style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
        <span><i class="fas fa-user me-2 text-muted"></i>${_esc(name)}</span>
        <button class="btn btn-sm btn-outline-danger" onclick="StateInspections.removeSIEmployee('${_esc(name)}')" title="Remove"><i class="fas fa-times"></i></button>
      </div>
    `).join('');
  }

  // ── Created By chips ───────────────────────────────────────
  function _renderCreatedByChips() {
    const container = document.getElementById('si-createdby-chips');
    if (!container) return;
    const names = siEmployees.length > 0 ? siEmployees : (currentUserName ? [currentUserName] : ['Unknown']);
    container.innerHTML = names.map(name =>
      `<span class="si-chip si-chip-createdby" data-value="${_esc(name)}">${_esc(name)}</span>`
    ).join('');

    container.querySelectorAll('.si-chip-createdby').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.si-chip-createdby').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Default select current user if in list
    const defaultChip = container.querySelector(`.si-chip-createdby[data-value="${CSS.escape(currentUserName)}"]`);
    if (defaultChip) defaultChip.classList.add('active');
  }

  function _populateForm(r) {
    _val('si-form-date', r.createdDate || '');
    _val('si-form-sticker', r.stickerNumber || '');
    _val('si-form-lastname', r.lastName || '');
    _val('si-form-notes', r.notes || '');
    _val('si-form-fleet', r.fleetAccount || '');

    // created by — select matching chip
    if (r.createdBy) {
      _activateChip('.si-chip-createdby', r.createdBy);
      // If not in list, add a temporary chip
      const container = document.getElementById('si-createdby-chips');
      if (container && !container.querySelector(`.si-chip-createdby[data-value="${CSS.escape(r.createdBy)}"]`)) {
        const chip = document.createElement('span');
        chip.className = 'si-chip si-chip-createdby active';
        chip.dataset.value = r.createdBy;
        chip.textContent = r.createdBy;
        chip.addEventListener('click', () => {
          container.querySelectorAll('.si-chip-createdby').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        });
        container.prepend(chip);
      }
    }

    // Payment type chip
    if (r.paymentType) _activateChip('.si-chip-payment-type', r.paymentType);
    const fleetRow = document.getElementById('si-fleet-row');
    if (fleetRow) fleetRow.style.display = r.paymentType === 'Fleet' ? 'block' : 'none';

    // Payment amount chip
    const amt = String(_parseMoney(r.paymentAmount));
    const stdAmounts = ['0', '10', '18', '20'];
    if (stdAmounts.includes(amt)) {
      _activateChip('.si-chip-payment', amt);
      const customWrap = document.getElementById('si-custom-amount-wrap');
      if (customWrap) customWrap.style.display = 'none';
    } else {
      _activateChip('.si-chip-payment', 'custom');
      _val('si-custom-amount', amt);
      const customWrap = document.getElementById('si-custom-amount-wrap');
      if (customWrap) customWrap.style.display = 'block';
    }

    // Status chip
    if (r.status) _activateChip('.si-chip-status', r.status);

    // Tint affidavit
    if (r.tintAffidavitUrl) {
      const preview = document.getElementById('si-tint-preview');
      if (preview) {
        preview.innerHTML = `<img src="${_esc(r.tintAffidavitUrl)}" alt="Tint Affidavit" class="si-tint-thumb">
          <div class="text-muted small mt-1">Existing photo — upload new to replace</div>`;
        preview.style.display = 'block';
      }
    }
  }

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    _setError('');

    const dateVal  = _getVal('si-form-date');
    let stickerVal = _getVal('si-form-sticker').trim();
    const lastName = _getVal('si-form-lastname').trim();

    // Created by: chip selection
    const createdByChip = document.querySelector('.si-chip-createdby.active');
    let createdBy = createdByChip ? createdByChip.dataset.value : '';

    const paymentTypeChip = document.querySelector('.si-chip-payment-type.active');
    const paymentAmountChip = document.querySelector('.si-chip-payment.active');
    const statusChip = document.querySelector('.si-chip-status.active');

    if (!createdBy)           { _setError('Select a "Created By" employee.'); return; }
    if (!stickerVal)          { _setError('Sticker number is required.'); return; }
    if (!lastName)            { _setError('Last name is required.'); return; }
    if (!paymentTypeChip)     { _setError('Select a payment type.'); return; }
    if (!paymentAmountChip)   { _setError('Select a payment amount.'); return; }
    if (!statusChip)          { _setError('Select a status.'); return; }

    let paymentAmount;
    if (paymentAmountChip.dataset.value === 'custom') {
      paymentAmount = parseFloat(_getVal('si-custom-amount')) || 0;
    } else {
      paymentAmount = parseFloat(paymentAmountChip.dataset.value) || 0;
    }

    const fleetAccount = _getVal('si-form-fleet').trim();
    const notes = _getVal('si-form-notes').trim();
    const status = statusChip.dataset.value;
    const paymentType = paymentTypeChip.dataset.value;

    // Handle tint photo upload
    let tintAffidavitUrl = editingId
      ? (records.find(r => r.id === editingId) || {}).tintAffidavitUrl || ''
      : '';

    const tintInput = document.getElementById('si-tint-input');
    if (tintInput && tintInput.files && tintInput.files[0]) {
      try {
        tintAffidavitUrl = await _uploadTintPhoto(tintInput.files[0]);
      } catch (e) {
        _setError('Failed to upload tint photo: ' + e.message);
        return;
      }
    }

    const record = {
      createdDate: dateVal,
      createdBy: createdBy,
      stickerNumber: stickerVal,
      lastName: lastName,
      paymentType: paymentType,
      paymentAmount: paymentAmount,
      status: status,
      fleetAccount: fleetAccount,
      notes: notes,
      tintAffidavitUrl: tintAffidavitUrl,
      updatedAt: new Date().toISOString()
    };

    const saveBtn = document.getElementById('si-modal-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
      if (editingId) {
        await db.collection('state_inspections').doc(editingId).update(record);
      } else {
        record.createdAt = new Date().toISOString();
        await db.collection('state_inspections').add(record);
      }
      closeModal();
    } catch (e) {
      console.error('[StateInspections] Save error:', e);
      _setError('Save failed: ' + e.message);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    }
  }

  // ── Tint photo upload (Firebase Storage if available, else base64) ─
  async function _uploadTintPhoto(file) {
    if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds 10 MB limit.');

    // If Firebase Storage is configured, upload there
    if (typeof firebase !== 'undefined' && firebase.storage) {
      try {
        const storageRef = firebase.storage().ref();
        const filePath = `tint_affidavits/${Date.now()}_${file.name}`;
        const snap = await storageRef.child(filePath).put(file);
        return await snap.ref.getDownloadURL();
      } catch (e) {
        console.warn('[StateInspections] Firebase Storage upload failed, using base64:', e);
      }
    }

    // Fallback: base64 inline
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Tint photo preview on file selection ──────────────────
  function handleTintPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('si-tint-preview');
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = ev => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Tint Affidavit Preview" class="si-tint-thumb">`;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  // ── Tint viewer (pan + zoom) ────────────────────────────────
  (function _initTintViewer() {
    let _scale = 1, _ox = 0, _oy = 0;
    let _dragging = false, _startX = 0, _startY = 0, _dragOx = 0, _dragOy = 0;
    const MIN = 0.2, MAX = 8, STEP = 0.25;

    function _applyTransform() {
      const img = document.getElementById('si-tint-viewer-img');
      if (!img) return;
      img.style.transform = `translate(calc(-50% + ${_ox}px), calc(-50% + ${_oy}px)) scale(${_scale})`;
      const lbl = document.getElementById('tvZoomLabel');
      if (lbl) lbl.textContent = Math.round(_scale * 100) + '%';
    }

    function _resetView(fit) {
      const img   = document.getElementById('si-tint-viewer-img');
      const canvas = document.getElementById('tvCanvas');
      _ox = 0; _oy = 0;
      if (fit && img && img.naturalWidth && canvas) {
        const sw = canvas.clientWidth  / img.naturalWidth;
        const sh = canvas.clientHeight / img.naturalHeight;
        _scale = Math.min(sw, sh, 1);
      } else {
        _scale = 1;
      }
      _applyTransform();
    }

    function _closeTintViewer() {
      const v = document.getElementById('si-tint-viewer');
      if (v) v.style.display = 'none';
      const img = document.getElementById('si-tint-viewer-img');
      if (img) img.src = '';
    }

    // Wire controls once DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      const viewer = document.getElementById('si-tint-viewer');
      const canvas = document.getElementById('tvCanvas');
      const img    = document.getElementById('si-tint-viewer-img');
      if (!viewer || !canvas || !img) return;

      document.getElementById('tvClose').addEventListener('click', _closeTintViewer);
      document.getElementById('tvZoomIn').addEventListener('click', () => { _scale = Math.min(MAX, _scale + STEP); _applyTransform(); });
      document.getElementById('tvZoomOut').addEventListener('click', () => { _scale = Math.max(MIN, _scale - STEP); _applyTransform(); });
      document.getElementById('tvDownload').addEventListener('click', () => {
        const src = img.src;
        if (!src) return;
        const a = document.createElement('a');
        if (src.startsWith('data:')) {
          a.href = src;
        } else {
          // For remote URLs, fetch as blob so the browser downloads rather than navigates
          fetch(src)
            .then(res => res.blob())
            .then(blob => {
              const url = URL.createObjectURL(blob);
              a.href = url;
              a.download = 'tint-affidavit.' + (blob.type.split('/')[1] || 'jpg');
              document.body.appendChild(a); a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            })
            .catch(() => window.open(src, '_blank'));
          return;
        }
        a.download = 'tint-affidavit.' + (src.split(';')[0].split('/')[1] || 'jpg');
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
      document.getElementById('tvZoomReset').addEventListener('click', () => _resetView(false));
      document.getElementById('tvZoomFit').addEventListener('click', () => _resetView(true));

      // Scroll to zoom
      canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? STEP : -STEP;
        const prev  = _scale;
        _scale = Math.min(MAX, Math.max(MIN, _scale + delta));
        // zoom toward cursor position
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width  / 2;
        const cy = e.clientY - rect.top  - rect.height / 2;
        _ox = cx + (_ox - cx) * (_scale / prev);
        _oy = cy + (_oy - cy) * (_scale / prev);
        _applyTransform();
      }, { passive: false });

      // Mouse drag to pan
      canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        _dragging = true; _startX = e.clientX; _startY = e.clientY;
        _dragOx = _ox; _dragOy = _oy;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      });
      window.addEventListener('mousemove', e => {
        if (!_dragging) return;
        _ox = _dragOx + (e.clientX - _startX);
        _oy = _dragOy + (e.clientY - _startY);
        _applyTransform();
      });
      window.addEventListener('mouseup', () => { _dragging = false; canvas.style.cursor = 'grab'; });

      // Touch drag & pinch-zoom
      let _t0x = 0, _t0y = 0, _tOx = 0, _tOy = 0, _tScale = 1, _tDist0 = 0;
      canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          _t0x = e.touches[0].clientX; _t0y = e.touches[0].clientY;
          _tOx = _ox; _tOy = _oy;
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          _tDist0 = Math.hypot(dx, dy);
          _tScale = _scale;
        }
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1) {
          _ox = _tOx + (e.touches[0].clientX - _t0x);
          _oy = _tOy + (e.touches[0].clientY - _t0y);
          _applyTransform();
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          _scale = Math.min(MAX, Math.max(MIN, _tScale * (dist / _tDist0)));
          _applyTransform();
        }
        e.preventDefault();
      }, { passive: false });

      // Esc key closes
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && viewer.style.display !== 'none') _closeTintViewer();
      });
    });

    // Expose so viewTint can trigger reset after image loads
    window._tvResetView = _resetView;
  }());

  function viewTint(id) {
    const r = records.find(x => x.id === id);
    if (!r || !r.tintAffidavitUrl) return;
    const viewer = document.getElementById('si-tint-viewer');
    const img    = document.getElementById('si-tint-viewer-img');
    if (!viewer || !img) {
      // fallback
      if (r.tintAffidavitUrl.startsWith('data:')) {
        const [meta, b64] = r.tintAffidavitUrl.split(',');
        const mime = meta.split(':')[1].split(';')[0];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        window.open(URL.createObjectURL(new Blob([bytes], { type: mime })), '_blank');
      } else {
        window.open(r.tintAffidavitUrl, '_blank');
      }
      return;
    }
    img.onload = () => { if (window._tvResetView) window._tvResetView(true); };
    img.src = r.tintAffidavitUrl;
    viewer.style.display = 'flex';
  }

  // ── Archive ────────────────────────────────────────────────
  async function archiveRecord(id) {
    if (!confirm('Archive this inspection record?')) return;
    try {
      await db.collection('state_inspections').doc(id).update({ archived: true });
    } catch (e) {
      alert('Archive failed: ' + e.message);
    }
  }

  // ── Restore from archive ───────────────────────────────────
  async function restoreRecord(id) {
    try {
      await db.collection('state_inspections').doc(id).update({ archived: false });
    } catch (e) {
      alert('Restore failed: ' + e.message);
    }
  }

  // ── Permanent Delete (archived only) ───────────────────────
  async function permanentDelete(id) {
    if (!confirm('Permanently delete this record? This cannot be undone.')) return;
    try {
      await db.collection('state_inspections').doc(id).delete();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  // ── CSV Import ─────────────────────────────────────────────
  async function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    let rows;
    try {
      rows = _parseCsv(text);
    } catch (err) {
      alert('Failed to parse CSV: ' + err.message);
      return;
    }

    if (rows.length < 2) {
      alert('CSV appears empty or has only a header row.');
      return;
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1).filter(r => r.some(c => c.trim()));

    // Map column names flexibly
    const col = name => {
      const aliases = {
        date: ['date created', 'date', 'created date', 'dateCreated', 'created_date'],
        createdby: ['created by', 'createdby', 'employee', 'tech', 'technician', 'created_by'],
        sticker: ['sticker number', 'sticker', 'stickernumber', 'sticker_number', 'vsi number', 'vsi_number'],
        lastname: ['last name', 'lastname', 'last_name', 'customer', 'name'],
        paymenttype: ['payment', 'payment type', 'paymenttype', 'payment_type'],
        paymentamount: ['payment amount', 'paymentamount', 'amount', 'payment_amount', 'cost', 'price'],
        fleetname: ['fleet name', 'fleetname', 'fleet', 'fleet_name', 'fleet_account', 'fleetaccount'],
        status: ['status', 'result', 'pass/fail'],
        notes: ['notes', 'note', 'comments'],
        tint: ['tint affidavit', 'tint', 'affidavit']
      };
      for (const [, aliasList] of Object.entries(aliases)) {
        if (aliasList.includes(name)) {
          // find this key
          break;
        }
      }
      // plain find by alias
      for (const [key, aliasList] of Object.entries(aliases)) {
        if (name === key) {
          for (const alias of aliasList) {
            const idx = header.indexOf(alias);
            if (idx !== -1) return idx;
          }
          return -1;
        }
      }
      return header.indexOf(name);
    };

    // Pre-resolve column indices
    const colId        = _findCol(header, ['id', 'record id', 'inspection id', 'external_id', 'externalid']);
    const colDate      = _findCol(header, ['date created', 'date', 'created date', 'datecreated', 'created_date', 'date_created']);
    const colTime      = _findCol(header, ['time created', 'time', 'created time', 'timecreated', 'created_time', 'time_created']);
    const colBy        = _findCol(header, ['created by', 'createdby', 'employee', 'tech', 'technician', 'created_by']);
    const colSticker   = _findCol(header, ['sticker number', 'sticker', 'stickernumber', 'sticker_number', 'vsi number', 'vsi_number']);
    const colLastname  = _findCol(header, ['last name', 'lastname', 'last_name', 'customer', 'name']);
    const colPayType   = _findCol(header, ['payment', 'payment type', 'paymenttype', 'payment_type']);
    const colPayAmt    = _findCol(header, ['payment amount', 'paymentamount', 'amount', 'payment_amount', 'cost', 'price']);
    const colFleet     = _findCol(header, ['fleet name', 'fleetname', 'fleet', 'fleet_name', 'fleet_account', 'fleetaccount']);
    const colStatus    = _findCol(header, ['status', 'result', 'pass/fail']);
    const colNotes     = _findCol(header, ['notes', 'note', 'comments']);
    const colTint      = _findCol(header, ['tint affidavit', 'tint', 'affidavit', 'tint_affidavit', 'tintaffidavit', 'tint url', 'affidavit url']);
    const colCompanyId = _findCol(header, ['company_id', 'company id', 'companyid', 'company']);

    const today = _localToday();

    const importBtn = document.getElementById('si-import-btn');
    if (importBtn) { importBtn.disabled = true; importBtn.textContent = `Importing ${dataRows.length} rows…`; }

    let imported = 0;
    let failed = 0;
    const batchSize = 400; // Firestore batch limit is 500, staying safe

    // Batch write
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const chunk = dataRows.slice(i, i + batchSize);
      const batch = db.batch();

      chunk.forEach(row => {
        try {
          const get = idx => (idx >= 0 && row[idx] !== undefined) ? row[idx].trim() : '';

          const rawDate = get(colDate);
          const createdDate = _normalizeDate(rawDate) || today;

          let payAmt = get(colPayAmt);
          payAmt = parseFloat(payAmt.replace(/[^0-9.]/g, '')) || 0;

          let status = get(colStatus) || 'Pass';
          if (!['Pass', 'Retest', 'Fail'].includes(status)) {
            // try title-case
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
            if (!['Pass', 'Retest', 'Fail'].includes(status)) status = 'Pass';
          }

          const record = {
            createdDate,
            createdTime:    get(colTime),
            createdBy:      get(colBy) || 'Imported',
            stickerNumber:  get(colSticker),
            lastName:       get(colLastname),
            paymentType:    get(colPayType) || 'Cash',
            paymentAmount:  payAmt,
            fleetAccount:   get(colFleet),
            status,
            notes:          get(colNotes),
            tintAffidavitUrl: get(colTint),
            companyId:      get(colCompanyId),
            createdAt:      new Date().toISOString(),
            updatedAt:      new Date().toISOString(),
            importedFromCsv: true
          };

          // Use source ID as doc ref so re-importing the same CSV never duplicates records
          const sourceId = get(colId);
          const ref = sourceId
            ? db.collection('state_inspections').doc(sourceId)
            : db.collection('state_inspections').doc();
          batch.set(ref, record, { merge: false });
          imported++;
        } catch (rowErr) {
          console.warn('[StateInspections] CSV row error:', rowErr, row);
          failed++;
        }
      });

      await batch.commit();
    }

    if (importBtn) { importBtn.disabled = false; importBtn.textContent = 'Import CSV'; }

    const msg = `Import complete: ${imported} records added.${failed > 0 ? ` ${failed} rows skipped due to errors.` : ''}`;
    alert(msg);
  }

  function _findCol(header, aliases) {
    for (const alias of aliases) {
      const idx = header.indexOf(alias.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function _normalizeDate(raw) {
    if (!raw) return '';
    raw = raw.trim();
    // Already ISO: 2023-01-24
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // M/D/YYYY or MM/DD/YYYY
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, m, d, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Try native parse — use local date parts to avoid UTC offset shift
    const dt = new Date(raw);
    if (!isNaN(dt)) {
      const yyyy = dt.getFullYear();
      const mm   = String(dt.getMonth() + 1).padStart(2, '0');
      const dd   = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }

  /** Minimal RFC-4180 compatible CSV parser */
  function _parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cell); cell = '';
        } else if (ch === '\n') {
          row.push(cell); cell = '';
          rows.push(row); row = [];
        } else {
          cell += ch;
        }
      }
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    // Remove empty trailing row
    if (rows.length && rows[rows.length - 1].every(c => !c.trim())) rows.pop();
    return rows;
  }

  // ── Export CSV ─────────────────────────────────────────────
  function exportCsv() {
    const cols = [
      { key: 'createdDate',    label: 'Date Created' },
      { key: 'createdBy',      label: 'Created By' },
      { key: 'stickerNumber',  label: 'Sticker Number' },
      { key: 'lastName',       label: 'Last name' },
      { key: 'paymentType',    label: 'Payment' },
      { key: 'paymentAmount',  label: 'Payment amount' },
      { key: 'fleetAccount',   label: 'Fleet Name' },
      { key: 'status',         label: 'Status' },
      { key: 'notes',          label: 'Notes' },
    ];

    const csvCols = cols.map(c => '"' + c.label + '"').join(',');
    const csvRows = filteredRecords.map(r =>
      cols.map(c => {
        let v = r[c.key] === undefined || r[c.key] === null ? '' : String(r[c.key]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',')
    );

    const blob = new Blob([csvCols + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `state-inspections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Fleet Account Combobox ─────────────────────────────────

  /** Build sorted unique fleet name list from current records. */
  function _buildFleetFromRecords() {
    const names = new Set(knownFleetAccounts);
    records.forEach(r => {
      if (r.fleetAccount && r.fleetAccount.trim()) names.add(r.fleetAccount.trim());
    });
    knownFleetAccounts = [...names].sort((a, b) => a.localeCompare(b));
    _updateFleetDatalist();
    _updateFleetFilterSuggestions();
  }

  /** Also pull from the fleet_accounts collection if it exists. */
  function _loadFleetAccountsCollection() {
    if (typeof db === 'undefined') return;
    db.collection('fleet_accounts').orderBy('name', 'asc').get()
      .then(snap => {
        const names = new Set(knownFleetAccounts);
        snap.docs.forEach(d => {
          const n = (d.data().name || '').trim();
          if (n) names.add(n);
        });
        knownFleetAccounts = [...names].sort((a, b) => a.localeCompare(b));
        _updateFleetDatalist();
        _updateFleetFilterSuggestions();
      })
      .catch(() => {}); // collection may not exist — that's fine
  }

  /** Keep the <datalist> for the filter-bar input in sync. */
  function _updateFleetDatalist() {
    const dl = document.getElementById('si-fleet-datalist');
    if (!dl) return;
    dl.innerHTML = knownFleetAccounts
      .map(n => `<option value="${_esc(n)}">`)  
      .join('');
  }

  /** Refresh suggestions shown in the open combobox dropdown, if visible. */
  function _updateFleetFilterSuggestions() {
    const input = document.getElementById('si-form-fleet');
    const dropdown = document.getElementById('si-fleet-suggestions');
    if (!input || !dropdown || dropdown.style.display === 'none') return;
    _showFleetSuggestions(input, dropdown);
  }

  /** Wire the Fleet Account combobox in the modal form. */
  function _wireFleetCombobox() {
    const input = document.getElementById('si-form-fleet');
    const dropdown = document.getElementById('si-fleet-suggestions');
    if (!input || !dropdown) return;

    input.addEventListener('input',  () => _showFleetSuggestions(input, dropdown));
    input.addEventListener('focus',  () => _showFleetSuggestions(input, dropdown));
    input.addEventListener('blur',   () => setTimeout(() => { dropdown.style.display = 'none'; }, 200));

    // Keyboard: Escape closes dropdown
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { dropdown.style.display = 'none'; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = dropdown.querySelector('.si-fleet-suggestion');
        if (first) first.focus();
      }
    });
  }

  function _showFleetSuggestions(input, dropdown) {
    const q = input.value.trim().toLowerCase();
    const matches = q
      ? knownFleetAccounts.filter(n => n.toLowerCase().includes(q))
      : knownFleetAccounts;

    if (matches.length === 0) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = matches
      .map(n => `<li class="si-fleet-suggestion" tabindex="0" data-value="${_esc(n)}">${_escHighlight(n, q)}</li>`)
      .join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.si-fleet-suggestion').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        _selectFleetSuggestion(input, dropdown, li.dataset.value);
      });
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _selectFleetSuggestion(input, dropdown, li.dataset.value);
          input.focus();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = li.nextElementSibling;
          if (next) next.focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = li.previousElementSibling;
          if (prev) prev.focus(); else input.focus();
        }
        if (e.key === 'Escape') { dropdown.style.display = 'none'; input.focus(); }
      });
    });
  }

  function _selectFleetSuggestion(input, dropdown, value) {
    input.value = value;
    dropdown.style.display = 'none';
    // Auto-activate Fleet payment type chip if not already on
    const fleetChip = document.querySelector('.si-chip-payment-type[data-value="Fleet"]');
    if (fleetChip && !fleetChip.classList.contains('active')) {
      document.querySelectorAll('.si-chip-payment-type').forEach(c => c.classList.remove('active'));
      fleetChip.classList.add('active');
      const fleetRow = document.getElementById('si-fleet-row');
      if (fleetRow) fleetRow.style.display = 'block';
    }
  }

  /** Highlight matching substring in suggestion text. */
  function _escHighlight(name, query) {
    if (!query) return _esc(name);
    const idx = name.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return _esc(name);
    return _esc(name.slice(0, idx))
      + '<strong>' + _esc(name.slice(idx, idx + query.length)) + '</strong>'
      + _esc(name.slice(idx + query.length));
  }

  // ── Notify admin-users that it should expose getAllUsers ───
  // We expose a shim here so the form can load user names
  // even if UserManagement doesn't publicize getAllUsers yet.
  function _ensureUserList() {
    if (typeof UserManagement !== 'undefined' && typeof UserManagement.getAllUsers === 'function') {
      return UserManagement.getAllUsers();
    }
    return [];
  }

  // ── Helpers ────────────────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _val(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v !== undefined ? v : '';
  }

  function _getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function _setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function _setError(msg) {
    const el = document.getElementById('si-form-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }

  function _formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }

  /** Returns today's date as YYYY-MM-DD in the browser's local timezone. */
  function _localToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function _activateChip(selector, value) {
    document.querySelectorAll(selector).forEach(c => {
      c.classList.toggle('active', String(c.dataset.value) === String(value));
    });
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init,
    openEdit,
    archiveRecord,
    restoreRecord,
    permanentDelete,
    viewTint,
    toggleArchived: _toggleArchived,
    removeSIEmployee: _removeSIEmployee,
    toggleSettings: _toggleSettings,
    loadMore: _loadMore,
    loadMoreArchived: _loadMoreArchived,
  };
})();
