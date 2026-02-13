// Admin Features: Customer Index & Appointment Calendar

let customerData = [];
let currentCalendarDate = new Date();

// --- Customer Index Logic ---

function extractCustomerName(sub) {
    // 1. Root level name
    if (sub.name && sub.name !== 'Unknown' && sub.name.trim()) return sub.name.trim();
    if (sub.first_name || sub.last_name) {
        let n = `${sub.first_name || ''} ${sub.last_name || ''}`.trim();
        if (n) return n;
    }
    
    // 2. Fields object lookup
    if (sub.fields) {
        // Priority keys
        const candidates = ['Name', 'name', 'First Name', 'Your Name', 'Full Name'];
        for (const key of candidates) {
            if (sub.fields[key]) {
                const val = sub.fields[key];
                if (typeof val === 'string' && val.trim()) return val.trim();
                // Handle object-based name fields (common in WPForms)
                if (typeof val === 'object') {
                     if (val.first || val.last) return `${val.first || ''} ${val.last || ''}`.trim();
                }
            }
        }
        
        // Compound keys (First Name + Last Name)
        if (sub.fields['First Name'] || sub.fields['Last Name']) {
             return `${sub.fields['First Name'] || ''} ${sub.fields['Last Name'] || ''}`.trim();
        }
        
        // 3. Scan all keys for "name" (case-insensitive)
        for (const key in sub.fields) {
            if (key.toLowerCase().includes('name')) {
                const val = sub.fields[key];
                if (typeof val === 'string' && val.length < 50 && val.toLowerCase() !== 'unknown') return val.trim();
                // Found a name key with object value
                if (typeof val === 'object' && (val.first || val.last)) {
                     return `${val.first || ''} ${val.last || ''}`.trim();
                }
            }
        }

        // 4. DEEP FALLBACK: Scan values for name-like objects regardless of key
        // This catches WPForms where keys are just IDs like '0', '1', etc.
        for (const key in sub.fields) {
            const val = sub.fields[key];
            if (val && typeof val === 'object') {
                if ('first' in val && 'last' in val) {
                     return `${val.first || ''} ${val.last || ''}`.trim();
                }
            }
        }
    }
    
    return 'Unknown';
}

function updateCustomerIndex() {
    if (typeof allSubmissions === 'undefined' || !allSubmissions.length) {
        document.getElementById('customer-list-body').innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No customer data found.</td></tr>';
        document.getElementById('customer-count-display').textContent = 'Showing 0 customers';
        return;
    }

    // Group submissions by unique customers (email or phone)
    const distinctCustomers = new Map();

    allSubmissions.forEach(sub => {
        // Extract contact info
        const email = (sub.email || sub.fields?.email || sub.fields?.Email || '').toLowerCase().trim();
        const phoneRaw = (sub.phone || sub.fields?.phone || sub.fields?.Phone || '');
        const phone = phoneRaw.replace(/\D/g, '');
        
        // Skip if absolutely no contact info
        if (!email && !phone) return;

        // Try to find existing record by email OR phone
        let existingKey = null;
        if (email && distinctCustomers.has(email)) existingKey = email;
        else if (phone && distinctCustomers.has(phone)) existingKey = phone;

        // If not found, check if any existing record matches the other identifier
        if (!existingKey) {
             for (const [key, cust] of distinctCustomers) {
                 if ((email && cust.emails.has(email)) || (phone && cust.phones.has(phone))) {
                     existingKey = key;
                     break;
                 }
             }
        }
        
        const key = existingKey || (email || phone);
        
        if (!distinctCustomers.has(key)) {
            distinctCustomers.set(key, {
                id: key, 
                name: extractCustomerName(sub),
                emails: new Set(email ? [email] : []),
                phones: new Set(phone ? [phoneRaw] : []), 
                submissions: [],
                lastActivity: null,
                submissionCount: 0
            });
        }

        const customer = distinctCustomers.get(key);
        
        // Merge data
        if (email) customer.emails.add(email);
        if (phoneRaw) customer.phones.add(phoneRaw);
        
        // Update name if current is 'Unknown' or shorter/less complete
        const subName = extractCustomerName(sub);
        if ((customer.name === 'Unknown' || customer.name.length < subName.length) && subName !== 'Unknown') {
             customer.name = subName;
        }
        
        customer.submissions.push(sub);
        customer.submissionCount++;
        
        // Use global getSubmissionDate or fallback
        let subDate = null;
        if (typeof getSubmissionDate === 'function') {
             subDate = getSubmissionDate(sub);
        } else {
             // Fallback minimal implementation
             const raw = sub.timestamp || sub.date || sub.createdAt;
             if (raw && typeof raw.toDate === 'function') subDate = raw.toDate();
             else if (raw) subDate = new Date(raw);
        }

        if (subDate && (!customer.lastActivity || subDate > customer.lastActivity)) {
            customer.lastActivity = subDate;
        }
    });

    customerData = Array.from(distinctCustomers.values());
    
    // Sort by Last Activity Descending
    customerData.sort((a, b) => b.lastActivity - a.lastActivity);

    renderCustomerTable();
}

function renderCustomerTable(page = 1) {
    const tbody = document.getElementById('customer-list-body');
    const searchTerm = document.getElementById('customer-search').value.toLowerCase();
    
    // Filter
    let filtered = customerData;
    if (searchTerm) {
        filtered = customerData.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            Array.from(c.emails).some(e => e.includes(searchTerm)) || 
            Array.from(c.phones).some(p => p.includes(searchTerm))
        );
    }
    
    document.getElementById('customer-count-display').textContent = `Showing ${filtered.length} customers`;

    // Pagination
    const pageSize = 15;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (page - 1) * pageSize;
    const pagedCustomers = filtered.slice(start, start + pageSize);
    
    if (pagedCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No customers found matching your search.</td></tr>';
        return;
    }

    let html = '';
    pagedCustomers.forEach(cust => {
        const emails = Array.from(cust.emails).join(', ');
        const phones = Array.from(cust.phones).join(', ');
        const lastDate = cust.lastActivity ? cust.lastActivity.toLocaleDateString() : 'N/A';
        const modalId = `cust-${cust.id.replace(/[^a-zA-Z0-9]/g, '')}`;

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${cust.name}</div>
                </td>
                <td>
                    ${emails ? `<div><i class="fas fa-envelope text-muted me-1" style="font-size:0.8em;"></i> <a href="mailto:${emails}" class="text-decoration-none">${emails}</a></div>` : ''}
                    ${phones ? `<div><i class="fas fa-phone text-muted me-1" style="font-size:0.8em;"></i> <a href="tel:${phones}" class="text-decoration-none text-dark">${phones}</a></div>` : ''}
                </td>
                <td><small class="text-secondary">${lastDate}</small></td>
                <td><span class="badge bg-light text-dark border">${cust.submissionCount}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerDetails('${cust.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <!-- Additional actions like 'New Appointment' could go here -->
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    renderPagination(totalPages, page);
}

function renderPagination(totalPages, currentPage) {
    const pagination = document.getElementById('customer-pagination');
    let html = '';
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    // Prev
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="renderCustomerTable(${currentPage - 1})">&laquo;</button>
             </li>`;
             
    // Pages (Show max 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="renderCustomerTable(${i})">${i}</button>
                 </li>`;
    }
    
    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="renderCustomerTable(${currentPage + 1})">&raquo;</button>
             </li>`;
             
    pagination.innerHTML = html;
}

// Search Handler
document.getElementById('customer-search').addEventListener('input', (e) => {
    renderCustomerTable(1);
});

// CSV Export
function exportCustomersCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Last Activity,Submission Count\n";
    customerData.forEach(c => {
        const email = Array.from(c.emails).join('; ');
        const phone = Array.from(c.phones).join('; ');
        const date = c.lastActivity ? c.lastActivity.toLocaleDateString() : '';
        const row = `"${c.name}","${email}","${phone}","${date}",${c.submissionCount}`;
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customer_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function viewCustomerDetails(customerId) {
    const customer = customerData.find(c => c.id === customerId);
    if (!customer) return;
    
    // Create Modal HTML directly in body if not exists
    let modalEl = document.getElementById('customerDetailsModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'customerDetailsModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-user-circle me-2"></i>Customer Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                             <div class="col-md-6 border-end">
                                 <h4 class="mb-1" id="cust-modal-name"></h4>
                                 <div class="text-muted mb-2">Customer since <span id="cust-modal-since"></span></div>
                                 
                                 <div class="mb-2"><i class="fas fa-envelope text-secondary me-2"></i> <span id="cust-modal-email"></span></div>
                                 <div class="mb-2"><i class="fas fa-phone text-secondary me-2"></i> <span id="cust-modal-phone"></span></div>
                             </div>
                             <div class="col-md-6 ps-md-4">
                                 <div class="d-flex justify-content-between align-items-center mb-2">
                                     <span class="fw-bold">Total Interactions</span>
                                     <span class="badge bg-primary rounded-pill" id="cust-modal-count">0</span>
                                 </div>
                                 <div class="d-flex justify-content-between align-items-center mb-2">
                                     <span class="fw-bold">Last Activity</span>
                                     <span id="cust-modal-last"></span>
                                 </div>
                             </div>
                        </div>
                        
                        <h6 class="border-bottom pb-2 mb-3">Submission History</h6>
                        <div class="list-group list-group-flush" id="cust-modal-history">
                            <!-- Populated via JS -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    }
    
    // Populate Data
    document.getElementById('cust-modal-name').textContent = customer.name;
    document.getElementById('cust-modal-email').textContent = Array.from(customer.emails).join(', ') || 'No email';
    document.getElementById('cust-modal-phone').textContent = Array.from(customer.phones).join(', ') || 'No phone';
    document.getElementById('cust-modal-count').textContent = customer.submissionCount;
    document.getElementById('cust-modal-last').textContent = customer.lastActivity ? customer.lastActivity.toLocaleDateString() : 'N/A';
    
    // Find earliest submission for "since"
    let earliest = customer.lastActivity;
    customer.submissions.forEach(s => {
         const d = (typeof getSubmissionDate === 'function') ? getSubmissionDate(s) : new Date(s.timestamp || 0);
         if (d && (!earliest || d < earliest)) earliest = d;
    });
    document.getElementById('cust-modal-since').textContent = earliest ? earliest.toLocaleDateString() : 'Unknown';
    
    // History List
    const historyContainer = document.getElementById('cust-modal-history');
    let historyHtml = '';
    
    // Sort submissions new -> old
    const sortedSubs = [...customer.submissions].sort((a,b) => {
         const dA = (typeof getSubmissionDate === 'function') ? getSubmissionDate(a) : new Date(a.timestamp || 0);
         const dB = (typeof getSubmissionDate === 'function') ? getSubmissionDate(b) : new Date(b.timestamp || 0);
         return dB - dA;
    });
    
    sortedSubs.forEach(s => {
        const d = (typeof getSubmissionDate === 'function') ? getSubmissionDate(s) : new Date(s.timestamp || 0);
        const dateStr = d ? d.toLocaleString() : 'Date Unknown';
        const type = s.form_type || 'Form Submission';
        const vehicle = s.fields?.Vehicle || s.fields?.vehicle || s.vehicle || '';
        
        historyHtml += `
            <div class="list-group-item px-0">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 text-primary">${type}</h6>
                    <small>${dateStr}</small>
                </div>
                ${vehicle ? `<p class="mb-1 small text-dark"><i class="fas fa-car me-1"></i> ${vehicle}</p>` : ''}
                <small class="text-muted">Form ID: ${s.form_id || 'N/A'}</small>
                ${s.items ? `<div class="mt-1"><span class="badge bg-info text-dark">Inspection Report Available</span></div>` : ''}
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="viewInspectionResults('${s.id}')">View Details</button>
                    ${s.pdf_url ? `<a href="${s.pdf_url}" target="_blank" class="btn btn-sm btn-outline-danger ms-1"><i class="fas fa-file-pdf"></i> PDF</a>` : ''}
                </div>
            </div>
        `;
    });
    historyContainer.innerHTML = historyHtml;
    
    // Show Modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}


// --- Calendar Logic ---

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    monthYear.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week (0 = Sun, 1 = Mon). We want Mon start.
    let startDayOfWeek = firstDay.getDay(); 
    // Adjust to Mon=0, Sun=6 for grid logic if we want Mon start. 
    // Standard JS: Sun=0. 
    // My Grid Headers: Mon, Tue, Wed... Sun. 
    // So if startDayOfWeek is 0 (Sun), it should be index 6. 
    // If 1 (Mon), index 0.
    // Formula: (day + 6) % 7
    let gridStartIndex = (startDayOfWeek + 6) % 7;
    
    const daysInMonth = lastDay.getDate();
    
    let html = '<div class="d-flex flex-wrap border-start border-top">';
    
    // Empty cells for previous month
    for (let i = 0; i < gridStartIndex; i++) {
        html += `<div class="calendar-cell empty bg-light" style="width: 14.28%; height: 100px; border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6;"></div>`;
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const isToday = isSameDate(dateObj, new Date());
        
        // Find appointments for this day
        const appointments = getAppointmentsForDate(dateObj);
        
        html += `
            <div class="calendar-cell p-1 position-relative" style="width: 14.28%; height: 100px; border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; background: ${isToday ? '#e8f5e9' : '#fff'}; cursor: pointer;" onclick="viewDayAppointments(${year}, ${month}, ${day})">
                <div class="d-flex justify-content-between">
                    <span class="${isToday ? 'badge bg-success rounded-circle' : 'fw-bold text-secondary'}" style="${isToday ? 'width: 24px; height: 24px; line-height: 20px;' : ''}">${day}</span>
                    ${appointments.length > 0 ? `<span class="badge bg-primary rounded-pill">${appointments.length}</span>` : ''}
                </div>
                <div class="mt-1 overflow-hidden" style="max-height: 65px; font-size: 10px;">
                    ${renderAppointmentDots(appointments)}
                </div>
            </div>
        `;
        
        // Wrap new row if needed (every 7)
        // (gridStartIndex + day) % 7 === 0 means end of row
    }
    
    // Fill remaining cells
    const totalCells = gridStartIndex + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
        for (let i = 0; i < remaining; i++) {
             html += `<div class="calendar-cell empty bg-light" style="width: 14.28%; height: 100px; border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6;"></div>`;
        }
    }
    
    html += '</div>';
    grid.innerHTML = html;
    
    updateUpcomingList();
}

function getAppointmentsForDate(date) {
    return allSubmissions.filter(sub => {
        // Check if form type is appointment OR if it has a specific date field matching this date
        // Many forms just have a conceptual "requested date" in fields
        // We will look for 'date_requested', 'preferred_date', etc.
        const reqDateStr = sub.fields?.["Preferred Date"] || sub.fields?.["Requested Date"] || sub.fields?.["Appointment Date"] || sub.date;
        if (!reqDateStr) return false;
        
        // Try parsing
        const reqDate = new Date(reqDateStr);
        // If invalid date, return false
        if (isNaN(reqDate.getTime())) return false;
        
        return isSameDate(reqDate, date);
    }).map(sub => ({
        id: sub.id,
        name: sub.name || sub.fields?.Name || 'Client',
        type: sub.form_type || 'General',
        time: sub.fields?.["Preferred Time"] || sub.fields?.["Time"] || ''
    }));
}

function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function renderAppointmentDots(apps) {
    // Limit to 3 to prevent overflow, show +N if more
    const maxShow = 3;
    const displayApps = apps.slice(0, maxShow);
    const moreCount = apps.length - maxShow;
    
    let html = displayApps.map(app => {
        let colorClass = 'text-primary';
        if (app.type.toLowerCase().includes('inspection')) colorClass = 'text-info';
        else if (app.type.toLowerCase().includes('emergency') || app.type.toLowerCase().includes('urgent')) colorClass = 'text-danger';
        
        // Truncate name to 12 chars
        const shortName = app.name.length > 12 ? app.name.substring(0, 10) + '..' : app.name;
        
        return `
        <div class="text-truncate ${colorClass} mb-1" style="font-size: 11px; line-height: 1.2;">
            <i class="fas fa-circle px-1" style="font-size: 5px; vertical-align: middle;"></i>${shortName}
        </div>
        `;
    }).join('');
    
    if (moreCount > 0) {
        html += `<div class="text-muted ps-2" style="font-size: 10px;">+${moreCount} more</div>`;
    }
    return html;
}

function changeCalendarMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function updateUpcomingList() {
    const list = document.getElementById('upcoming-appointments-list');
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Find next 10 appointments
    const upcoming = [];
    allSubmissions.forEach(sub => {
        const reqDateStr = sub.fields?.["Preferred Date"] || sub.fields?.["Requested Date"] || sub.fields?.["Appointment Date"] || sub.date;
        if (!reqDateStr) return;
        const d = new Date(reqDateStr);
        if (d >= today) {
            upcoming.push({ date: d, sub: sub });
        }
    });
    
    upcoming.sort((a, b) => a.date - b.date);
    
    if (upcoming.length === 0) {
        list.innerHTML = '<div class="text-muted text-center">No upcoming appointments found.</div>';
        return;
    }
    
    let html = '';
    upcoming.slice(0, 5).forEach(item => {
        const sub = item.sub;
        const name = sub.name || sub.fields?.Name || 'Client';
        const type = sub.form_type;
        html += `
            <a href="#" class="list-group-item list-group-item-action" onclick="viewInspectionResults('${sub.id}'); return false;">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${name}</h6>
                    <small class="text-primary">${item.date.toLocaleDateString()}</small>
                </div>
                <p class="mb-1 text-muted small">${type} - ${sub.fields?.["Preferred Time"] || 'Any time'}</p>
            </a>
        `;
    });
    
    list.innerHTML = html;
}

function viewDayAppointments(year, month, day) {
    const date = new Date(year, month, day);
    const appointments = getAppointmentsForDate(date);
    
    // Create Modal HTML directly in body if not exists
    let modalEl = document.getElementById('dayDetailsModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'dayDetailsModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="day-modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group list-group-flush" id="day-modal-list"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    }
    
    document.getElementById('day-modal-title').innerHTML = `<i class="far fa-calendar-alt me-2"></i> ${date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    
    const listEl = document.getElementById('day-modal-list');
    
    if (appointments.length === 0) {
        listEl.innerHTML = `<div class="text-center text-muted py-4">No appointments scheduled for this day.</div>`;
    } else {
        let html = '';
        // Sort by time if available
        appointments.sort((a,b) => (a.time || 'ZZ').localeCompare(b.time || 'ZZ'));
        
        appointments.forEach(app => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge bg-primary rounded-pill">${app.time || 'Time TBD'}</span>
                        <small class="text-muted">${app.type}</small>
                    </div>
                    <h6 class="mb-1">${app.name}</h6>
                    <div class="mt-2 text-end">
                         <button class="btn btn-sm btn-outline-primary" onclick="bootstrap.Modal.getInstance(document.getElementById('dayDetailsModal')).hide(); viewInspectionResults('${app.id}')">View Form</button>
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}
