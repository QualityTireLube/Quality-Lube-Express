// ─── QualityServer  ──  Firebase Cloud Function ────────────────────
// Print-job API running on Cloud Functions for Firebase.
// Storage: Firestore  (qualityexpress-c19f2)
// URL: https://us-central1-qualityexpress-c19f2.cloudfunctions.net/printApi
// ────────────────────────────────────────────────────────────────────

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');
const { v4: uuidv4 } = require('uuid');

// ─── Firebase init ─────────────────────────────────────────────────
// firebase-admin v10+ requires databaseURL to be explicit; it is no longer
// inferred from the project ID at runtime.
admin.initializeApp({
  databaseURL: 'https://qualityexpress-c19f2-default-rtdb.firebaseio.com'
});
const db = admin.firestore();

const app = express();

// ─── Config (from .env file — Firebase auto-loads functions/.env) ───
const API_KEY            = process.env.API_KEY            || '';
const PRINT_CLIENT_TOKEN = process.env.PRINT_CLIENT_TOKEN || '';

// ─── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://qualitytirelube.com',
  'https://www.qualitytirelube.com',
  'https://main.d1jdc96l1z02o7.amplifyapp.com',  // Inspectionapp AWS Amplify
  'http://localhost',
  'http://localhost:3000',  // Inspectionapp dev
  'http://localhost:7010'   // Print Client dashboard
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                     // curl / print client
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// ─── Auth middleware ───────────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!API_KEY) return next();                              // no key = open (dev)

  let provided = req.headers['x-api-key'];
  if (!provided) {
    const h = req.headers['authorization'];
    if (h && h.startsWith('Bearer ')) provided = h.slice(7);
  }
  // Also accept ?token= query param so browser links (which can't send headers) work
  if (!provided) provided = req.query.token;
  if (!provided) return res.status(401).json({ error: 'Missing X-API-Key or Authorization header' });

  const valid = [API_KEY];
  if (PRINT_CLIENT_TOKEN) valid.push(PRINT_CLIENT_TOKEN);
  if (!valid.includes(provided)) return res.status(403).json({ error: 'Invalid API key' });

  next();
}

// ═══════════════════════════════════════════════════════════════════
//  Firestore helpers  — collections: printJobs, printers, clients
// ═══════════════════════════════════════════════════════════════════

const JOBS_COL     = 'printJobs';
const PRINTERS_COL = 'printers';
const CLIENTS_COL  = 'printClients';

async function readAll(collection) {
  const snap = await db.collection(collection).get();
  return snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
}

// ─── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════
//  PRINT JOBS
// ═══════════════════════════════════════════════════════════════════

// POST /api/print/jobs — create
app.post('/api/print/jobs', authMiddleware, async (req, res) => {
  try {
    const { templateName, formName, printer, printerName, printerId, copies, pdfData, labelData, paperSize, orientation, locationId } = req.body;
    if (!pdfData) return res.status(400).json({ error: 'pdfData (base64 PDF) is required' });

    const resolvedName = templateName || formName || 'Unnamed';
    const id = uuidv4();
    const job = {
      id,
      templateName: resolvedName,
      formName: resolvedName,
      printer: printer || printerName || null,
      printerId: printerId || null,
      copies: copies || 1,
      pdfData,
      labelData: labelData || {},
      paperSize: paperSize || 'Brother-QL800',
      orientation: orientation || 'landscape',
      locationId: locationId || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      claimedBy: null, claimedAt: null,
      completedAt: null, failedAt: null,
      errorMessage: null, retryCount: 0
    };

    await db.collection(JOBS_COL).doc(id).set(job);

    // Wake up the Print Client instantly via RTDB instead of waiting for next poll
    try {
      await admin.database().ref('printers/pendingSignal').set({
        jobId: id,
        t: new Date().toISOString()
      });
    } catch (rtdbErr) {
      console.warn('RTDB wake-up signal failed (non-blocking):', rtdbErr.message);
    }

    console.log(`Job created: ${id} — ${resolvedName}`);
    res.status(201).json({ id, status: 'pending', message: 'Print job queued' });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/print/jobs — list (no pdfData)
app.get('/api/print/jobs', authMiddleware, async (req, res) => {
  try {
    const { status, limit } = req.query;
    let snap;
    try {
      if (status) {
        snap = await db.collection(JOBS_COL).where('status', '==', status).orderBy('createdAt', 'desc').get();
      } else {
        snap = await db.collection(JOBS_COL).orderBy('createdAt', 'desc').get();
      }
    } catch (indexErr) {
      // Fallback if composite index not ready
      console.warn('Index not ready, using fallback query:', indexErr.message);
      snap = status
        ? await db.collection(JOBS_COL).where('status', '==', status).get()
        : await db.collection(JOBS_COL).get();
    }
    let jobs = snap.docs.map(d => d.data());
    // Sort in memory as fallback
    jobs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (limit) jobs = jobs.slice(0, parseInt(limit, 10));
    // Strip pdfData from list
    const summary = jobs.map(({ pdfData, ...rest }) => rest);
    res.json(summary);
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/print/jobs/pending — poll (includes pdfData)
// Print Client expects: { jobs: [...] }
async function pendingJobsHandler(req, res) {
  try {
    const { limit, locationId, clientId, clientName } = { ...req.query, ...req.body };
    let snap;
    try {
      snap = await db.collection(JOBS_COL).where('status', '==', 'pending').orderBy('createdAt', 'asc').get();
    } catch (indexErr) {
      // Fallback if composite index not ready
      console.warn('Index not ready, using fallback query:', indexErr.message);
      snap = await db.collection(JOBS_COL).where('status', '==', 'pending').get();
    }
    let jobs = snap.docs.map(d => d.data());
    // Sort in memory as fallback
    jobs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    if (locationId) jobs = jobs.filter(j => !j.locationId || j.locationId === locationId);
    const max = parseInt(limit, 10) || 10;
    jobs = jobs.slice(0, max);
    // Ensure formName alias and add printer field as systemName
    jobs = jobs.map(j => ({
      ...j,
      formName: j.formName || j.templateName || 'Unnamed',
      printer: j.printer || j.printerName || null
    }));

    // If client sent printer statuses, update them in background
    const printerStatuses = req.body && req.body.printerStatuses;
    if (Array.isArray(printerStatuses) && clientId) {
      const batch = db.batch();
      for (const s of printerStatuses) {
        const sysName = s.systemName || s.name;
        if (!sysName) continue;
        const docId = `${clientId}_${sysName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        batch.set(db.collection(PRINTERS_COL).doc(docId), {
          clientId, name: s.name || sysName, systemName: sysName,
          status: s.status || 'online', lastSeen: new Date().toISOString()
        }, { merge: true });
      }
      batch.commit().catch(e => console.error('Printer status update error:', e));
    }

    // Print Client expects { jobs: [...] } wrapper
    res.json({ jobs });
  } catch (err) {
    console.error('Pending jobs error:', err);
    res.status(500).json({ error: err.message });
  }
}
app.get('/api/print/jobs/pending', authMiddleware, pendingJobsHandler);
app.post('/api/print/jobs/pending', authMiddleware, pendingJobsHandler);

// POST /api/print/jobs/:id/claim
app.post('/api/print/jobs/:id/claim', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId } = req.body;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });

    const job = doc.data();
    if (job.status !== 'pending') return res.status(409).json({ error: `Job already ${job.status}`, status: job.status });

    await ref.update({ status: 'printing', claimedBy: clientId || 'unknown', claimedAt: new Date().toISOString() });
    console.log(`Job ${id} claimed by ${clientId || 'unknown'}`);
    res.json({ success: true, message: 'Job claimed', job: { ...job, status: 'printing', claimedBy: clientId || 'unknown', claimedAt: new Date().toISOString() } });
  } catch (err) {
    console.error('Claim error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print/jobs/:id/complete
app.post('/api/print/jobs/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, printDetails } = req.body;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });

    await ref.update({ status: 'completed', completedAt: new Date().toISOString(), printDetails: printDetails || {}, pdfData: admin.firestore.FieldValue.delete() });
    console.log(`Job ${id} completed`);
    res.json({ message: 'Job completed' });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print/jobs/:id/fail
app.post('/api/print/jobs/:id/fail', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, errorMessage, shouldRetry } = req.body;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });

    const job = doc.data();
    const willRetry = shouldRetry !== false && (job.retryCount || 0) < 3;

    if (willRetry) {
      await ref.update({ status: 'pending', retryCount: (job.retryCount || 0) + 1, claimedBy: null, claimedAt: null, errorMessage: errorMessage || 'Unknown error' });
    } else {
      await ref.update({ status: 'failed', failedAt: new Date().toISOString(), errorMessage: errorMessage || 'Unknown error' });
    }
    res.json({ message: willRetry ? 'Job will be retried' : 'Job failed permanently', willRetry });
  } catch (err) {
    console.error('Fail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print/jobs/:id/pause — hold a pending job so the print client skips it
app.post('/api/print/jobs/:id/pause', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    if (doc.data().status !== 'pending')
      return res.status(409).json({ error: 'Only pending jobs can be paused' });
    await ref.update({ status: 'paused', pausedAt: new Date().toISOString() });
    res.json({ message: 'Job paused' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/print/jobs/:id/resume — release a paused job back to pending
app.post('/api/print/jobs/:id/resume', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    if (doc.data().status !== 'paused')
      return res.status(409).json({ error: 'Only paused jobs can be resumed' });
    await ref.update({ status: 'pending', pausedAt: null });
    // Wake up print client immediately
    await admin.database().ref('printers/pendingSignal').set({ jobId: id, ts: Date.now() });
    res.json({ message: 'Job resumed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/print/jobs/:id/retry — reset a failed job back to pending so it can be re-attempted
app.post('/api/print/jobs/:id/retry', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    await ref.update({
      status:       'pending',
      claimedBy:    null,
      claimedAt:    null,
      errorMessage: null,
      retriedAt:    new Date().toISOString(),
    });
    res.json({ message: 'Job reset to pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/print/jobs/:id — single job including pdfData (for View / Reprint)
app.get('/api/print/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(JOBS_COL).doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    res.json({ id, ...doc.data() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/print/jobs/:id/reprint — clone a job as a new pending job
// If pdfData was already deleted (completed jobs), returns 422 with job metadata
// so the browser can regenerate the PDF from labelData + template.
app.post('/api/print/jobs/:id/reprint', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(JOBS_COL).doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    const data = doc.data();

    if (!data.pdfData) {
      // PDF was cleared after printing — return metadata so client can regenerate
      const { pdfData: _dropped, ...meta } = data;
      return res.status(422).json({ error: 'pdfData no longer stored', job: { id, ...meta } });
    }

    const newId = uuidv4();
    await db.collection(JOBS_COL).doc(newId).set({
      templateName: data.templateName || null,
      formName:     data.formName     || null,
      printer:      data.printer      || null,
      printerName:  data.printerName  || null,
      printerId:    data.printerId    || null,
      copies:       data.copies       || 1,
      pdfData:      data.pdfData,
      labelData:    data.labelData    || {},
      paperSize:    data.paperSize    || null,
      orientation:  data.orientation  || 'landscape',
      locationId:   data.locationId   || null,
      status:       'pending',
      createdAt:    new Date().toISOString(),
      reprintOf:    id,
    });

    // Wake up the print client immediately
    await admin.database().ref('printers/pendingSignal').set({ jobId: newId, ts: Date.now() });
    res.json({ message: 'Reprint job queued', newJobId: newId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/print/jobs/:id
app.delete('/api/print/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection(JOBS_COL).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    await ref.delete();
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/print/jobs/clear
app.delete('/api/print/jobs/clear', authMiddleware, async (_req, res) => {
  try {
    const snap = await db.collection(JOBS_COL).where('status', 'in', ['completed', 'failed']).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ message: `Cleared ${snap.size} jobs` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════════════════

async function statsHandler(_req, res) {
  try {
    const snap = await db.collection(JOBS_COL).get();
    const jobs = snap.docs.map(d => d.data());
    const pending   = jobs.filter(j => j.status === 'pending').length;
    const printing  = jobs.filter(j => j.status === 'printing').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed    = jobs.filter(j => j.status === 'failed').length;
    res.json({ status: 'ok', queue: { pending, printing, completed, failed, total: jobs.length }, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
app.get('/api/print/stats', authMiddleware, statsHandler);
app.get('/api/print/stats/polling', authMiddleware, statsHandler);

// ═══════════════════════════════════════════════════════════════════
//  PRINTERS
// ═══════════════════════════════════════════════════════════════════

// GET /api/print/printers
app.get('/api/print/printers', authMiddleware, async (req, res) => {
  try {
    const all = await readAll(PRINTERS_COL);
    // Deduplicate by systemName — keep the most recently seen entry
    const seen = {};
    for (const p of all) {
      const key = (p.systemName || p.name || '').toLowerCase();
      if (!key) continue;
      const prev = seen[key];
      if (!prev || (p.lastSeen && (!prev.lastSeen || p.lastSeen > prev.lastSeen))) {
        seen[key] = p;
      }
    }
    res.json(Object.values(seen));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/print/printers — register
app.post('/api/print/printers', authMiddleware, async (req, res) => {
  try {
    const { clientId, printers } = req.body;
    if (!clientId || !Array.isArray(printers)) return res.status(400).json({ error: 'clientId and printers[] required' });

    const batch = db.batch();
    for (const p of printers) {
      const sysName = p.systemName || p.systemPrinterName || p.name;
      // Use deterministic doc ID so upsert works
      const docId = `${clientId}_${sysName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      batch.set(db.collection(PRINTERS_COL).doc(docId), {
        id: docId,
        clientId,
        name: p.name,
        type: p.type || 'Generic',
        connectionType: p.connectionType || 'network',
        status: p.status || 'online',
        systemName: sysName,
        lastSeen: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
    res.json({ message: `${printers.length} printer(s) registered` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print/client/register-printers (Print Client compat)
app.post('/api/print/client/register-printers', authMiddleware, async (req, res) => {
  // Delegate to canonical handler
  req.url = '/api/print/printers';
  app.handle(req, res);
});

// PUT /api/print/printers/status — bulk update
app.put('/api/print/printers/status', authMiddleware, async (req, res) => {
  try {
    const { clientId, statuses, printerStatuses } = req.body;
    const statusList = statuses || printerStatuses;
    if (!clientId || !Array.isArray(statusList)) return res.status(400).json({ error: 'clientId and statuses[] required' });

    const snap = await db.collection(PRINTERS_COL).where('clientId', '==', clientId).get();
    const printerDocs = snap.docs.map(d => ({ ref: d.ref, ...d.data() }));
    const batch = db.batch();
    let updated = 0;

    for (const s of statusList) {
      const sysName = s.systemName || s.name;
      const match = printerDocs.find(p => p.systemName === sysName || p.name === sysName);
      if (match) {
        batch.update(match.ref, { status: s.status, lastSeen: new Date().toISOString() });
        updated++;
      }
    }
    await batch.commit();
    res.json({ message: `Updated ${updated} printer statuses` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/print/client/printer-status (Print Client compat)
app.put('/api/print/client/printer-status', authMiddleware, async (req, res) => {
  req.url = '/api/print/printers/status';
  app.handle(req, res);
});

// DELETE /api/print/printers/stale — remove disconnected printers not seen in > staleDays (default 0.125 = 3 hours)
// NEVER removes a printer that is currently connected (lastSeen within last 5 minutes).
app.delete('/api/print/printers/stale', authMiddleware, async (req, res) => {
  try {
    const staleDays = parseFloat(req.query.days || '0.125'); // default: 3 hours
    const cutoff          = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
    const connectedCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5-min safety window
    const snap = await db.collection(PRINTERS_COL).get();
    const batch = db.batch();
    let removed = 0, skipped = 0;
    snap.docs.forEach(d => {
      const lastSeen = d.data().lastSeen || '';
      if (lastSeen >= connectedCutoff) { skipped++; return; } // currently connected — never touch it
      if (!lastSeen || lastSeen < cutoff) { batch.delete(d.ref); removed++; }
    });
    await batch.commit();
    res.json({ message: `Removed ${removed} disconnected printer(s). Skipped ${skipped} connected printer(s).` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/print/clients/stale — remove disconnected clients not seen in > staleDays (default 0.125 = 3 hours)
// NEVER removes a client that is currently connected (lastSeen within last 5 minutes).
app.delete('/api/print/clients/stale', authMiddleware, async (req, res) => {
  try {
    const staleDays = parseFloat(req.query.days || '0.125'); // default: 3 hours
    const cutoff          = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
    const connectedCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5-min safety window
    const snap = await db.collection(CLIENTS_COL).get();
    const batch = db.batch();
    let removed = 0, skipped = 0;
    snap.docs.forEach(d => {
      const lastSeen = d.data().lastSeen || '';
      if (lastSeen >= connectedCutoff) { skipped++; return; } // currently connected — never touch it
      if (!lastSeen || lastSeen < cutoff) { batch.delete(d.ref); removed++; }
    });
    await batch.commit();
    res.json({ message: `Removed ${removed} disconnected client(s). Skipped ${skipped} connected client(s).` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/print/jobs/unstick — reset jobs stuck in 'printing' for > N minutes back to pending
app.post('/api/print/jobs/unstick', authMiddleware, async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes || '10', 10);
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const snap = await db.collection(JOBS_COL).where('status', '==', 'printing').get();
    const batch = db.batch();
    let reset = 0;
    snap.docs.forEach(d => {
      const claimedAt = d.data().claimedAt || '';
      if (!claimedAt || claimedAt < cutoff) {
        batch.update(d.ref, { status: 'pending', claimedBy: null, claimedAt: null });
        reset++;
      }
    });
    await batch.commit();
    res.json({ message: `Reset ${reset} stuck job(s) back to pending` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/print/printers
app.delete('/api/print/printers', authMiddleware, async (_req, res) => {
  try {
    const snap = await db.collection(PRINTERS_COL).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ message: `Cleared ${snap.size} printers` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/print/printers/all (Print Client compat)
app.delete('/api/print/printers/all', authMiddleware, async (req, res) => {
  req.url = '/api/print/printers';
  req.method = 'DELETE';
  app.handle(req, res);
});

// ═══════════════════════════════════════════════════════════════════
//  CLIENTS
// ═══════════════════════════════════════════════════════════════════

// POST /api/print/clients/register
app.post('/api/print/clients/register', authMiddleware, async (req, res) => {
  try {
    const { clientId, name, description } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const ref = db.collection(CLIENTS_COL).doc(clientId);
    const doc = await ref.get();
    const record = {
      clientId,
      name: name || `Client-${clientId.substring(0, 8)}`,
      description: description || '',
      lastSeen: new Date().toISOString(),
      registeredAt: doc.exists ? doc.data().registeredAt : new Date().toISOString()
    };
    await ref.set(record, { merge: true });
    res.json({ message: 'Client registered', client: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/print/clients
app.get('/api/print/clients', authMiddleware, async (_req, res) => {
  try { res.json(await readAll(CLIENTS_COL)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  PRINT CLIENT COMPAT — misc endpoints
// ═══════════════════════════════════════════════════════════════════

// POST /api/login — Print Client authenticates and gets a token
app.post('/api/login', (req, res) => {
  // Accept any email/password — the Print Client just needs a token back
  // Return the PRINT_CLIENT_TOKEN if set, otherwise API_KEY
  const token = PRINT_CLIENT_TOKEN || API_KEY || 'dev-mode';
  const email = (req.body && req.body.email) || 'unknown';
  console.log(`Login from: ${email}`);
  res.json({
    token,
    message: 'OK',
    user: { email, role: 'PrintClient' }
  });
});

// GET /api/print-client-tokens
app.get('/api/print-client-tokens', authMiddleware, (_req, res) => {
  res.json({ tokens: [] });
});

// ═══════════════════════════════════════════════════════════════════
//  LIVE LOGS  — Print Client pushes log entries, Dashboard reads them
// ═══════════════════════════════════════════════════════════════════
const LOGS_COL = 'printLogs';

// POST /api/print/logs — Print Client pushes log entries
app.post('/api/print/logs', authMiddleware, async (req, res) => {
  try {
    const { clientId, entries } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    // Accept single entry or array
    const logEntries = Array.isArray(entries) ? entries : (req.body.message ? [req.body] : []);
    if (logEntries.length === 0) return res.status(400).json({ error: 'entries[] or message required' });

    const batch = db.batch();
    const now = new Date().toISOString();
    for (const entry of logEntries) {
      const docRef = db.collection(LOGS_COL).doc();
      batch.set(docRef, {
        clientId,
        level: entry.level || 'info',
        message: entry.message || '',
        timestamp: entry.timestamp || now,
        jobId: entry.jobId || null,
        printer: entry.printer || null
      });
    }
    await batch.commit();
    res.json({ message: `${logEntries.length} log(s) stored` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/print/logs — Dashboard reads recent logs
app.get('/api/print/logs', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const snap = await db.collection(LOGS_COL)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/print/logs — Clear old logs
app.delete('/api/print/logs', authMiddleware, async (_req, res) => {
  try {
    const snap = await db.collection(LOGS_COL).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ message: `Cleared ${snap.size} logs` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print/clients/heartbeat — Print Client periodic heartbeat
app.post('/api/print/clients/heartbeat', authMiddleware, async (req, res) => {
  try {
    const { clientId, printerCount, stats, rtdbConnected } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const ref = db.collection(CLIENTS_COL).doc(clientId);
    await ref.set({
      lastSeen: new Date().toISOString(),
      printerCount: printerCount || 0,
      stats: stats || {},
      status: 'online',
      rtdbConnected: rtdbConnected === true
    }, { merge: true });
    res.json({ message: 'heartbeat ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 404 ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message });
});

// ─── Export as Firebase Cloud Function ─────────────────────────────
exports.printApi = functions.https.onRequest(app);
