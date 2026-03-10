/* ============================================================
   admin-state-inspections.js — State Vehicle Inspection Log
   Manages state inspection records: add, view, filter, CSV import
   Saves to Firestore collection: state_inspections
   ============================================================ */

const StateInspections = (() => {
  // ── State ──────────────────────────────────────────────────
  let records = [];              // all loaded records
  let filteredRecords = [];      // after search/date filter
  let currentUserName = '';      // display name of logged-in user
  let editingId = null;          // id of record being edited (null = new)
  let unsubscribe = null;        // Firestore real-time listener

  // Date filter state
  let filterDateFrom = '';
  let filterDateTo = '';
  let filterSearch = '';
  let filterStatus = '';

  // ── Init ───────────────────────────────────────────────────
  function init(userDisplayName) {
    currentUserName = userDisplayName || '';
    _bindStaticEvents();
    _startListener();
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
          fleetRow.style.display = chip.dataset.value === 'Fleet' ? 'flex' : 'none';
        }
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
    _applyFilters();
  }

  function clearFilters() {
    filterSearch = filterStatus = filterDateFrom = filterDateTo = '';
    const ids = ['si-search', 'si-filter-status', 'si-filter-from', 'si-filter-to'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _applyFilters();
  }

  function _applyFilters() {
    let res = [...records];

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

    filteredRecords = res;
    _renderList();
    _renderStats();
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

  // ── List rendering ─────────────────────────────────────────
  function _renderList() {
    const container = document.getElementById('si-records-list');
    if (!container) return;

    if (filteredRecords.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-clipboard-check fa-3x mb-3 d-block opacity-25"></i>
          <p>No inspection records found</p>
        </div>`;
      return;
    }

    // Group by date
    const groups = {};
    filteredRecords.forEach(r => {
      const d = r.createdDate || 'Unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push(r);
    });

    let html = '';
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const label = date === 'Unknown' ? 'Unknown Date' : _formatDate(date);
      html += `
        <div class="si-date-group">
          <div class="si-date-header">
            <span>${_esc(label)}</span>
            <span class="badge bg-secondary ms-2">${groups[date].length}</span>
          </div>
          ${groups[date].map(_renderCard).join('')}
        </div>`;
    });

    container.innerHTML = html;
  }

  function _renderCard(r) {
    const statusClass = r.status === 'Pass' ? 'success' : r.status === 'Fail' ? 'danger' : 'warning';
    const statusIcon = r.status === 'Pass' ? 'fa-check-circle' : r.status === 'Fail' ? 'fa-times-circle' : 'fa-redo';
    const payAmt = r.paymentAmount !== undefined ? '$' + _parseMoney(r.paymentAmount).toFixed(2) : '';
    const payIcon = r.paymentType === 'Fleet' ? 'fa-truck' : 'fa-money-bill-wave';
    const payColor = r.paymentType === 'Fleet' ? '#e67e22' : '#27ae60';

    return `
      <div class="si-record-card" data-id="${r.id}">
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
              ${r.tintAffidavitUrl ? `<button class="btn btn-sm btn-outline-info" onclick="StateInspections.viewTint('${r.id}')" title="View Tint Photo"><i class="fas fa-camera"></i></button>` : ''}
              <button class="btn btn-sm btn-outline-primary" onclick="StateInspections.openEdit('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="StateInspections.deleteRecord('${r.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
        <div class="si-record-meta">
          <i class="fas fa-user me-1"></i>${_esc(r.createdBy || '')}
          ${r.paymentType ? `<span class="ms-3"><i class="fas fa-receipt me-1"></i>${_esc(r.paymentType)}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Modal: open/close ──────────────────────────────────────
  function openAddModal() {
    editingId = null;
    _resetForm();
    document.getElementById('si-modal-title').textContent = 'Add State Inspection';
    document.getElementById('si-modal').style.display = 'flex';
  }

  function openEdit(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    _resetForm();
    _populateForm(r);
    document.getElementById('si-modal-title').textContent = 'Edit Inspection';
    document.getElementById('si-modal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('si-modal').style.display = 'none';
    editingId = null;
    // reset tint preview
    const preview = document.getElementById('si-tint-preview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  }

  function _resetForm() {
    const today = new Date().toISOString().split('T')[0];

    _val('si-form-date', today);
    _val('si-form-sticker', '');
    _val('si-form-lastname', '');
    _val('si-form-notes', '');
    _val('si-form-fleet', '');
    _val('si-custom-amount', '');

    // Created by: current user
    _val('si-form-createdby', currentUserName);

    // Clear chip selections
    document.querySelectorAll('.si-chip-payment-type, .si-chip-payment, .si-chip-status')
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
    _populateCreatedByDropdown();
  }

  function _populateCreatedByDropdown() {
    const select = document.getElementById('si-form-createdby');
    if (!select) return;

    // Populate with approved admin users + current user
    const approvedUsers = typeof UserManagement !== 'undefined'
      ? (UserManagement.getAllUsers ? UserManagement.getAllUsers().filter(u => u.status === 'approved') : [])
      : [];

    let options = '';
    if (approvedUsers.length > 0) {
      approvedUsers.forEach(u => {
        const name = u.displayName || u.email || '';
        const selected = name === currentUserName ? ' selected' : '';
        options += `<option value="${_esc(name)}"${selected}>${_esc(name)}</option>`;
      });
    } else {
      // Fallback: just show current user
      options = `<option value="${_esc(currentUserName)}" selected>${_esc(currentUserName || 'Current User')}</option>`;
    }

    // Add manual entry option
    options += `<option value="__manual__">Other (type below)</option>`;
    select.innerHTML = options;

    // If currentUserName is not in the list at all, add it
    const found = Array.from(select.options).some(o => o.value === currentUserName);
    if (!found && currentUserName) {
      const opt = document.createElement('option');
      opt.value = currentUserName;
      opt.textContent = currentUserName;
      opt.selected = true;
      select.prepend(opt);
    }

    select.onchange = function () {
      const manualWrap = document.getElementById('si-createdby-manual-wrap');
      if (manualWrap) manualWrap.style.display = this.value === '__manual__' ? 'block' : 'none';
    };
  }

  function _populateForm(r) {
    _val('si-form-date', r.createdDate || '');
    _val('si-form-sticker', r.stickerNumber || '');
    _val('si-form-lastname', r.lastName || '');
    _val('si-form-notes', r.notes || '');
    _val('si-form-fleet', r.fleetAccount || '');

    // created by — try to select from dropdown
    const select = document.getElementById('si-form-createdby');
    if (select) {
      const opt = Array.from(select.options).find(o => o.value === r.createdBy);
      if (opt) {
        select.value = r.createdBy;
      } else {
        // Add as option
        const newOpt = document.createElement('option');
        newOpt.value = r.createdBy || '';
        newOpt.textContent = r.createdBy || '';
        newOpt.selected = true;
        select.prepend(newOpt);
      }
    }

    // Payment type chip
    if (r.paymentType) _activateChip('.si-chip-payment-type', r.paymentType);
    const fleetRow = document.getElementById('si-fleet-row');
    if (fleetRow) fleetRow.style.display = r.paymentType === 'Fleet' ? 'flex' : 'none';

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

    // Created by: dropdown + optional manual
    let createdBy = _getVal('si-form-createdby');
    if (createdBy === '__manual__') {
      createdBy = _getVal('si-createdby-manual') || currentUserName;
    }

    const paymentTypeChip = document.querySelector('.si-chip-payment-type.active');
    const paymentAmountChip = document.querySelector('.si-chip-payment.active');
    const statusChip = document.querySelector('.si-chip-status.active');

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

  function viewTint(id) {
    const r = records.find(x => x.id === id);
    if (!r || !r.tintAffidavitUrl) return;
    window.open(r.tintAffidavitUrl, '_blank');
  }

  // ── Delete ─────────────────────────────────────────────────
  async function deleteRecord(id) {
    if (!confirm('Delete this inspection record? This cannot be undone.')) return;
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
    const colDate      = _findCol(header, ['date created', 'date', 'created date', 'dateCreated', 'created_date', 'date_created', 'Time Created']);
    const colBy        = _findCol(header, ['created by', 'createdby', 'employee', 'tech', 'technician', 'created_by', 'createdBy']);
    const colSticker   = _findCol(header, ['sticker number', 'sticker', 'stickernumber', 'sticker_number', 'vsi number', 'vsi_number', 'Sticker Number']);
    const colLastname  = _findCol(header, ['last name', 'lastname', 'last_name', 'customer', 'name', 'Last name']);
    const colPayType   = _findCol(header, ['payment', 'payment type', 'paymenttype', 'payment_type', 'Payment']);
    const colPayAmt    = _findCol(header, ['payment amount', 'paymentamount', 'amount', 'payment_amount', 'cost', 'price', 'Payment amount']);
    const colFleet     = _findCol(header, ['fleet name', 'fleetname', 'fleet', 'fleet_name', 'fleet_account', 'fleetaccount', 'Fleet Name']);
    const colStatus    = _findCol(header, ['status', 'result', 'pass/fail', 'Status']);
    const colNotes     = _findCol(header, ['notes', 'note', 'comments', 'Notes']);

    const today = new Date().toISOString().split('T')[0];

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
            createdBy:      get(colBy) || 'Imported',
            stickerNumber:  get(colSticker),
            lastName:       get(colLastname),
            paymentType:    get(colPayType) || 'Cash',
            paymentAmount:  payAmt,
            fleetAccount:   get(colFleet),
            status,
            notes:          get(colNotes),
            tintAffidavitUrl: '',
            createdAt:      new Date().toISOString(),
            updatedAt:      new Date().toISOString(),
            importedFromCsv: true
          };

          const ref = db.collection('state_inspections').doc();
          batch.set(ref, record);
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
    // Try native parse
    const dt = new Date(raw);
    if (!isNaN(dt)) return dt.toISOString().split('T')[0];
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

  function _activateChip(selector, value) {
    document.querySelectorAll(selector).forEach(c => {
      c.classList.toggle('active', String(c.dataset.value) === String(value));
    });
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init,
    openEdit,
    deleteRecord,
    viewTint,
  };
})();
