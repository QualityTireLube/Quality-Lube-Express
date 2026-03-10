/* ============================================================
   admin-users.js — Employee Account & Access Management
   Manages pending approvals, user roles, and per-tab access control
   ============================================================ */

const UserManagement = (() => {
  // All dashboard tabs that can be individually toggled
  const ALL_TABS = [
    { id: 'submissions-tab', label: 'Form Submissions', icon: 'fa-inbox' },
    { id: 'applicants-tab', label: 'Applicants', icon: 'fa-user-tie' },
    { id: 'customer-index-tab', label: 'Customer Index', icon: 'fa-users' },
    { id: 'analytics-tab', label: 'Analytics', icon: 'fa-chart-line' },
    { id: 'pricing-tab', label: 'Pricing Management', icon: 'fa-dollar-sign' },
    { id: 'settings-tab', label: 'Settings', icon: 'fa-cog' },
    { id: 'labels-tab', label: 'Labels & Stickers', icon: 'fa-tags' },
    { id: 'users-tab', label: 'User Management', icon: 'fa-user-shield' },
    { id: 'state-inspections-tab', label: 'State Inspections', icon: 'fa-car' }
  ];

  let allUsers = [];
  let currentUser = null; // The logged-in user's admin_users doc

  /** Initialize — called after auth confirms user is approved */
  async function init(userDoc) {
    currentUser = userDoc;
    await loadUsers();
    renderPendingCount();
  }

  /** Load all admin_users from Firestore */
  async function loadUsers() {
    try {
      const snap = await db.collection('admin_users').orderBy('createdAt', 'desc').get();
      allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAll();
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  /** Update the pending badge count on the Users tab */
  function renderPendingCount() {
    const pending = allUsers.filter(u => u.status === 'pending');
    const badge = document.getElementById('pending-users-count');
    if (badge) {
      if (pending.length > 0) {
        badge.textContent = pending.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /** Render all user management sections */
  function renderAll() {
    renderPendingUsers();
    renderApprovedUsers();
    renderDeniedUsers();
    renderPendingCount();
    updateHeaderCounts();
  }

  /** Update all count badges in the Users tab headers */
  function updateHeaderCounts() {
    const pending = allUsers.filter(u => u.status === 'pending');
    const approved = allUsers.filter(u => u.status === 'approved');
    const denied = allUsers.filter(u => u.status === 'denied');

    const admins = approved.filter(u => u.role === 'admin');
    const employees = approved.filter(u => u.role !== 'admin');

    const el = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
    el('pending-approvals-header-count', pending.length);
    el('admin-users-header-count', admins.length);
    el('employee-users-header-count', employees.length);
    el('denied-users-header-count', denied.length);
    el('total-users-badge', `${allUsers.length} user${allUsers.length !== 1 ? 's' : ''}`);
  }

  /** ---- Pending Users Section ---- */
  function renderPendingUsers() {
    const tbody = document.getElementById('pending-users-tbody');
    if (!tbody) return;
    const pending = allUsers.filter(u => u.status === 'pending');
    const empty = document.getElementById('pending-users-empty');

    if (pending.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = pending.map(u => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="user-avatar-sm">${(u.displayName || u.email)[0].toUpperCase()}</div>
            <div>
              <div class="fw-semibold">${escHtml(u.displayName || 'No Name')}</div>
              <small class="text-muted">${escHtml(u.email)}</small>
            </div>
          </div>
        </td>
        <td><small class="text-muted">${formatDate(u.createdAt)}</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-success me-1" onclick="UserManagement.showApproveModal('${u.id}')">
            <i class="fas fa-check me-1"></i>Approve
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="UserManagement.denyUser('${u.id}')">
            <i class="fas fa-times me-1"></i>Deny
          </button>
        </td>
      </tr>
    `).join('');
  }

  /** ---- Approved Users — split by role ---- */
  function renderApprovedUsers() {
    const approved = allUsers.filter(u => u.status === 'approved');
    const admins = approved.filter(u => u.role === 'admin');
    const employees = approved.filter(u => u.role !== 'admin');

    _renderRoleGroup('admin-users', admins);
    _renderRoleGroup('employee-users', employees);
  }

  function _renderRoleGroup(prefix, users) {
    const tbody = document.getElementById(`${prefix}-tbody`);
    if (!tbody) return;
    const empty = document.getElementById(`${prefix}-empty`);

    if (users.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = users.map(u => {
      const isMe = currentUser && u.id === currentUser.uid;
      const tabBadges = (u.allowedTabs || []).map(tid => {
        const tab = ALL_TABS.find(t => t.id === tid);
        return tab ? `<span class="badge bg-secondary me-1 mb-1">${tab.label}</span>` : '';
      }).join('');

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="user-avatar-sm${u.role === 'admin' ? ' bg-admin' : ''}">${(u.displayName || u.email)[0].toUpperCase()}</div>
              <div>
                <div class="fw-semibold">
                  ${escHtml(u.displayName || 'No Name')}
                  ${isMe ? '<span class="badge bg-dark ms-1">You</span>' : ''}
                </div>
                <small class="text-muted">${escHtml(u.email)}</small>
              </div>
            </div>
          </td>
          <td><div class="d-flex flex-wrap">${tabBadges || '<span class="text-muted">All Tabs</span>'}</div></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="UserManagement.showEditModal('${u.id}')" title="Edit Access">
              <i class="fas fa-pen"></i>
            </button>
            ${!isMe ? `<button class="btn btn-sm btn-outline-danger" onclick="UserManagement.revokeUser('${u.id}')" title="Revoke Access">
              <i class="fas fa-user-slash"></i>
            </button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  /** ---- Denied Users Section ---- */
  function renderDeniedUsers() {
    const tbody = document.getElementById('denied-users-tbody');
    if (!tbody) return;
    const denied = allUsers.filter(u => u.status === 'denied');
    const empty = document.getElementById('denied-users-empty');

    if (denied.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = denied.map(u => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="user-avatar-sm bg-secondary">${(u.displayName || u.email)[0].toUpperCase()}</div>
            <div>
              <div class="fw-semibold">${escHtml(u.displayName || 'No Name')}</div>
              <small class="text-muted">${escHtml(u.email)}</small>
            </div>
          </div>
        </td>
        <td><small class="text-muted">${formatDate(u.deniedAt || u.createdAt)}</small></td>
        <td><small class="text-muted">${escHtml(u.deniedReason || '—')}</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success me-1" onclick="UserManagement.showApproveModal('${u.id}')" title="Approve Instead">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="UserManagement.deleteUser('${u.id}')" title="Remove Permanently">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  /* ============================================================
     APPROVE MODAL — shows tab checkboxes + role selector
     ============================================================ */
  function showApproveModal(uid) {
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;

    const modal = document.getElementById('approveUserModal');
    if (!modal) return;

    document.getElementById('approve-user-name').textContent = user.displayName || user.email;
    document.getElementById('approve-user-email').textContent = user.email;
    document.getElementById('approve-user-uid').value = uid;
    document.getElementById('approve-user-role').value = 'employee';

    // Render tab checkboxes
    const container = document.getElementById('approve-tab-checkboxes');
    container.innerHTML = ALL_TABS.map(tab => `
      <div class="form-check">
        <input class="form-check-input approve-tab-cb" type="checkbox" 
               value="${tab.id}" id="approve-cb-${tab.id}"
               ${tab.id === 'users-tab' ? '' : 'checked'}>
        <label class="form-check-label" for="approve-cb-${tab.id}">
          <i class="fas ${tab.icon} me-1 text-muted"></i>${tab.label}
        </label>
      </div>
    `).join('');

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  /** Handle approve confirm */
  async function confirmApprove() {
    const uid = document.getElementById('approve-user-uid').value;
    const role = document.getElementById('approve-user-role').value;
    const checkboxes = document.querySelectorAll('.approve-tab-cb:checked');
    const allowedTabs = Array.from(checkboxes).map(cb => cb.value);

    // If role is admin, give them all tabs including users-tab
    const finalTabs = role === 'admin' ? ALL_TABS.map(t => t.id) : allowedTabs;

    try {
      await db.collection('admin_users').doc(uid).update({
        status: 'approved',
        role: role,
        allowedTabs: finalTabs,
        approvedBy: currentUser ? currentUser.uid : null,
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deniedBy: null,
        deniedAt: null,
        deniedReason: null
      });

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('approveUserModal'));
      if (modal) modal.hide();

      await loadUsers();
    } catch (err) {
      console.error('Approve failed:', err);
      alert('Failed to approve user: ' + err.message);
    }
  }

  /** Deny a pending user */
  async function denyUser(uid) {
    const reason = prompt('Reason for denial (optional):') || '';
    if (reason === null) return; // Cancelled

    try {
      await db.collection('admin_users').doc(uid).update({
        status: 'denied',
        deniedBy: currentUser ? currentUser.uid : null,
        deniedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deniedReason: reason || null
      });
      await loadUsers();
    } catch (err) {
      console.error('Deny failed:', err);
      alert('Failed to deny user: ' + err.message);
    }
  }

  /** Revoke an approved user (move back to denied) */
  async function revokeUser(uid) {
    if (!confirm('Revoke this user\'s access? They will no longer be able to log in.')) return;

    try {
      await db.collection('admin_users').doc(uid).update({
        status: 'denied',
        deniedBy: currentUser ? currentUser.uid : null,
        deniedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deniedReason: 'Access revoked',
        allowedTabs: []
      });
      await loadUsers();
    } catch (err) {
      console.error('Revoke failed:', err);
      alert('Failed to revoke user: ' + err.message);
    }
  }

  /** Delete a denied user doc permanently */
  async function deleteUser(uid) {
    if (!confirm('Permanently remove this user record? (Their Firebase Auth account will remain but they will need to re-register.)')) return;

    try {
      await db.collection('admin_users').doc(uid).delete();
      await loadUsers();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete user: ' + err.message);
    }
  }

  /* ============================================================
     EDIT ACCESS MODAL — edit an approved user's tabs + role
     ============================================================ */
  function showEditModal(uid) {
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;

    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    document.getElementById('edit-user-name').textContent = user.displayName || user.email;
    document.getElementById('edit-user-email').textContent = user.email;
    document.getElementById('edit-user-uid').value = uid;
    document.getElementById('edit-user-role').value = user.role || 'employee';

    // Render tab checkboxes with current state
    const currentTabs = user.allowedTabs || [];
    const container = document.getElementById('edit-tab-checkboxes');
    container.innerHTML = ALL_TABS.map(tab => `
      <div class="form-check">
        <input class="form-check-input edit-tab-cb" type="checkbox" 
               value="${tab.id}" id="edit-cb-${tab.id}"
               ${currentTabs.includes(tab.id) ? 'checked' : ''}>
        <label class="form-check-label" for="edit-cb-${tab.id}">
          <i class="fas ${tab.icon} me-1 text-muted"></i>${tab.label}
        </label>
      </div>
    `).join('');

    // Toggle select-all based on role
    handleRoleChange('edit');

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  /** Handle role change in approve/edit modals */
  function handleRoleChange(prefix) {
    const role = document.getElementById(`${prefix}-user-role`).value;
    const checkboxes = document.querySelectorAll(`.${prefix}-tab-cb`);
    if (role === 'admin') {
      checkboxes.forEach(cb => { cb.checked = true; cb.disabled = true; });
    } else {
      checkboxes.forEach(cb => { cb.disabled = false; });
    }
  }

  /** Handle edit confirm */
  async function confirmEdit() {
    const uid = document.getElementById('edit-user-uid').value;
    const role = document.getElementById('edit-user-role').value;
    const checkboxes = document.querySelectorAll('.edit-tab-cb:checked');
    const allowedTabs = Array.from(checkboxes).map(cb => cb.value);

    const finalTabs = role === 'admin' ? ALL_TABS.map(t => t.id) : allowedTabs;

    try {
      await db.collection('admin_users').doc(uid).update({
        role: role,
        allowedTabs: finalTabs
      });

      const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
      if (modal) modal.hide();

      // If editing self, enforce tab visibility immediately
      if (currentUser && uid === currentUser.uid) {
        currentUser.role = role;
        currentUser.allowedTabs = finalTabs;
        enforceTabAccess(currentUser);
      }

      await loadUsers();
    } catch (err) {
      console.error('Edit failed:', err);
      alert('Failed to update user: ' + err.message);
    }
  }

  /* ============================================================
     TAB ACCESS ENFORCEMENT
     ============================================================ */
  
  /** Hide/show tabs based on the user's allowedTabs array */
  function enforceTabAccess(userDoc) {
    if (!userDoc) return;
    
    // Admins see everything
    if (userDoc.role === 'admin') {
      ALL_TABS.forEach(tab => {
        const navItem = document.querySelector(`a[href="#${tab.id}"]`);
        if (navItem) navItem.closest('.nav-item').style.display = '';
      });
      return;
    }

    const allowed = userDoc.allowedTabs || [];
    
    ALL_TABS.forEach(tab => {
      const navLink = document.querySelector(`a[href="#${tab.id}"]`);
      if (navLink) {
        const navItem = navLink.closest('.nav-item');
        if (allowed.includes(tab.id)) {
          navItem.style.display = '';
        } else {
          navItem.style.display = 'none';
          // If this was the active tab, switch to first allowed
          if (navLink.classList.contains('active')) {
            const firstAllowed = allowed[0] || 'submissions-tab';
            const fallback = document.querySelector(`a[href="#${firstAllowed}"]`);
            if (fallback) {
              const bsTab = new bootstrap.Tab(fallback);
              bsTab.show();
            }
          }
        }
      }
    });
  }

  /* ============================================================
     BOOTSTRAP / AUTO-PROVISION — Handles legacy & first users
     ============================================================ */
  
  /**
   * Check or create admin_users doc for the authenticated user.
   * Returns the user doc, or null if they're pending/denied.
   *
   * Logic:
   * 1. If admin_users doc exists and is approved → return it
   * 2. If admin_users doc exists but is pending → return null (blocked)
   * 3. If admin_users doc exists but is denied → return null (blocked)
   * 4. If NO admin_users doc exists (legacy user):
   *    - If there are 0 approved admins → auto-approve as admin (bootstrap)
   *    - Otherwise → auto-approve as admin (legacy user, pre-existing Firebase Auth)
   */
  async function checkOrProvision(firebaseUser) {
    const uid = firebaseUser.uid;
    const docRef = db.collection('admin_users').doc(uid);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      if (data.status === 'approved') {
        return { uid, ...data };
      }
      // pending or denied
      return null;
    }

    // No doc — this is a legacy/pre-existing Firebase Auth user
    // Auto-provision as admin with full access
    const allTabs = ALL_TABS.map(t => t.id);
    const newDoc = {
      uid: uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email || 'Admin',
      status: 'approved',
      role: 'admin',
      allowedTabs: allTabs,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedBy: 'system',
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deniedBy: null,
      deniedAt: null,
      deniedReason: null
    };

    await docRef.set(newDoc);
    console.log('[UserManagement] Auto-provisioned legacy user as admin:', uid);
    return { uid, ...newDoc };
  }

  /**
   * Check user status for the login page flow.
   * Returns: { status, displayName, deniedReason }
   */
  async function checkLoginStatus(firebaseUser) {
    const docRef = db.collection('admin_users').doc(firebaseUser.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Legacy user — they'll be auto-provisioned on dashboard load
      return { status: 'approved' };
    }

    const data = doc.data();
    return {
      status: data.status,
      displayName: data.displayName,
      deniedReason: data.deniedReason
    };
  }

  /* ============================================================
     UTILITY HELPERS
     ============================================================ */
  
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Select/deselect all tabs in a modal */
  function toggleSelectAll(prefix) {
    const role = document.getElementById(`${prefix}-user-role`).value;
    if (role === 'admin') return; // admins always have all
    const checkboxes = document.querySelectorAll(`.${prefix}-tab-cb`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    ALL_TABS,
    getAllUsers: () => allUsers,
    init,
    loadUsers,
    checkOrProvision,
    checkLoginStatus,
    enforceTabAccess,
    showApproveModal,
    confirmApprove,
    denyUser,
    revokeUser,
    deleteUser,
    showEditModal,
    confirmEdit,
    handleRoleChange,
    toggleSelectAll
  };

})();
