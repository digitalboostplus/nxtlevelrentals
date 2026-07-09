#!/usr/bin/env node
// Rental communications autopilot — local server.
//
//   npm run autopilot          live mode: reads Firestore, sends via GoHighLevel
//   npm run autopilot:demo     demo mode: sample data, sends land in a local outbox file
//
// Zero new dependencies: demo mode is pure Node; live mode lazily requires
// firebase-admin from this repo's node_modules and calls the GHL REST API with
// Node's built-in fetch. The dashboard is automation/index.html, served at
// http://127.0.0.1:4100 (bound to localhost only — nothing is exposed).
//
// All local state (sent log, settings, demo outbox) lives in automation/state/
// as human-readable JSON. Firestore is only *read*, except for maintenance
// requests you explicitly create/update from the dashboard. Messages are only
// sent when you click Send.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const engine = require('./engine');
const { buildSampleData } = require('./sample-data');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(__dirname, 'state');
const PORT = Number(process.env.PORT || 4100);
const DEMO = process.argv.includes('--demo') || process.env.AUTOPILOT_DEMO === '1';
// Tests can pin the date: AUTOPILOT_TODAY=2026-07-09
const todayStr = () => process.env.AUTOPILOT_TODAY || engine.localDateStr(new Date());

// ---------------------------------------------------------------------------
// Env loading (same behavior as scripts/load-env.js, but anchored to the repo
// root so `node automation/server.js` works from any cwd).
// ---------------------------------------------------------------------------

function loadEnvFile(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return;
  for (const rawLine of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = (line.startsWith('export ') ? line.slice(7) : line).slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

// ---------------------------------------------------------------------------
// Local state (JSON files)
// ---------------------------------------------------------------------------

function stateFile(name) {
  return path.join(STATE_DIR, DEMO ? `demo-${name}` : name);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function readLog() {
  return readJson(stateFile('log.json'), null) || [];
}

function appendLog(entry) {
  const log = readLog();
  log.push({ at: new Date().toISOString(), ...entry });
  writeJson(stateFile('log.json'), log);
  return log;
}

function readSettings() {
  const saved = readJson(stateFile('settings.json'), null);
  if (saved) return engine.mergeSettings(saved);
  if (DEMO) return engine.mergeSettings(buildSampleData(todayStr()).settings);
  return engine.mergeSettings(null);
}

function saveSettings(settings) {
  writeJson(stateFile('settings.json'), settings);
}

// ---------------------------------------------------------------------------
// Data source: Firestore (live) or sample data (demo)
// ---------------------------------------------------------------------------

let cache = { data: null, fetchedAt: null, errors: [] };
let demoStore = null; // in-memory demo dataset (maintenance mutations persist here)

function getDemoStore() {
  if (!demoStore) {
    const sample = buildSampleData(todayStr());
    demoStore = { tenants: sample.tenants, maintenance: sample.maintenance, payments: sample.payments };
    // Seed the demo log once so the dashboard shows pre-existing history.
    if (!fs.existsSync(stateFile('log.json'))) writeJson(stateFile('log.json'), sample.log);
    if (!fs.existsSync(stateFile('settings.json'))) saveSettings(engine.mergeSettings(sample.settings));
  }
  return demoStore;
}

let _db = null;
function db() {
  if (_db) return _db;
  // Lazily require so demo mode never needs node_modules.
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rental-tracker-app-2026';
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
        }),
      });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
    }
  }
  _db = require('firebase-admin').firestore();
  return _db;
}

async function fetchLiveData() {
  const errors = [];
  const tenants = [];
  const maintenance = [];
  let payments = [];

  const usersSnap = await db().collection('users').where('role', '==', 'tenant').get();
  usersSnap.forEach((d) => {
    const u = d.data();
    tenants.push({
      id: d.id,
      displayName: u.displayName || u.email || d.id,
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      ghlContactId: u.ghlContactId || null,
      address: u.address || '',
      unit: u.unit || '',
      monthlyRent: u.monthlyRent != null ? Number(String(u.monthlyRent).replace(/[^0-9.]/g, '')) : null,
      leaseStart: u.leaseStart || null,
      leaseEnd: u.leaseEnd || null,
      isLeaseActive: u.isLeaseActive !== false,
    });
  });

  try {
    const maintSnap = await db().collection('maintenanceRequests').orderBy('createdAt', 'desc').limit(300).get();
    maintSnap.forEach((d) => maintenance.push({ id: d.id, ...d.data() }));
  } catch (err) {
    // Fall back to an unordered read if the orderBy needs an index or field.
    try {
      const maintSnap = await db().collection('maintenanceRequests').limit(300).get();
      maintSnap.forEach((d) => maintenance.push({ id: d.id, ...d.data() }));
    } catch (err2) {
      errors.push(`maintenanceRequests read failed: ${err2.message}`);
    }
  }

  try {
    const paySnap = await db().collection('payments').orderBy('createdAt', 'desc').limit(500).get();
    paySnap.forEach((d) => payments.push({ id: d.id, ...d.data() }));
  } catch (err) {
    try {
      const paySnap = await db().collection('payments').limit(500).get();
      paySnap.forEach((d) => payments.push({ id: d.id, ...d.data() }));
    } catch (err2) {
      payments = [];
      errors.push(`payments read failed (${err2.message}) — rent "paid" detection will rely on Mark paid buttons`);
    }
  }

  return { data: { tenants, maintenance, payments }, errors };
}

async function getData(forceRefresh) {
  if (DEMO) return { data: getDemoStore(), errors: [], fetchedAt: new Date().toISOString() };
  const STALE_MS = 10 * 60 * 1000;
  const fresh = cache.data && cache.fetchedAt && Date.now() - Date.parse(cache.fetchedAt) < STALE_MS;
  if (!fresh || forceRefresh) {
    const { data, errors } = await fetchLiveData();
    cache = { data, errors, fetchedAt: new Date().toISOString() };
  }
  return cache;
}

// ---------------------------------------------------------------------------
// Sending (GHL Conversations API in live mode, outbox file in demo mode)
// ---------------------------------------------------------------------------

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

function ghlCreds() {
  const token = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID;
  if (!token) throw new Error('GoHighLevel is not configured: set GHL_API_KEY in .env');
  return { token, locationId };
}

async function ghlFetch(pathName, body) {
  const { token } = ghlCreds();
  const res = await fetch(`${GHL_BASE}${pathName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GHL ${pathName} failed (${res.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function resolveGHLContactId(item) {
  if (item.ghlContactId) return item.ghlContactId;
  if (!item.recipient.email) throw new Error('No GHL contact id and no email to look one up with');
  const { locationId } = ghlCreds();
  const data = await ghlFetch('/contacts/search', { locationId, query: item.recipient.email });
  const hit = (data.contacts || []).find(
    (c) => c.email && c.email.toLowerCase() === item.recipient.email.toLowerCase()
  );
  if (!hit) throw new Error(`No GHL contact found for ${item.recipient.email} — create the contact in GHL first`);
  return hit.id;
}

async function sendMessage(item, channels, edited) {
  const subject = (edited && edited.subject) || item.subject;
  const sms = (edited && edited.sms) || item.sms;
  // If the body text was edited, re-wrap it in the branded shell; otherwise
  // use the original rendered HTML.
  let html = item.html;
  if (edited && edited.text && edited.text.trim() !== item.text.trim()) {
    html = engine.customEmailHtml(readSettings(), subject, edited.text);
  }

  if (DEMO) {
    const outbox = readJson(stateFile('outbox.json'), []);
    for (const ch of channels) {
      if (ch === 'email' && !item.recipient.email) throw new Error('Recipient has no email address');
      if (ch === 'sms' && !item.recipient.phone) throw new Error('Recipient has no phone number');
      outbox.push({
        at: new Date().toISOString(), channel: ch, to: ch === 'email' ? item.recipient.email : item.recipient.phone,
        recipientName: item.recipient.name, subject, body: ch === 'email' ? html : sms, itemId: item.id,
      });
    }
    writeJson(stateFile('outbox.json'), outbox);
    return { demo: true };
  }

  const contactId = await resolveGHLContactId(item);
  for (const ch of channels) {
    if (ch === 'email') {
      await ghlFetch('/conversations/messages', { type: 'Email', contactId, subject, html });
    } else if (ch === 'sms') {
      if (!item.recipient.phone) throw new Error('Recipient has no phone number for SMS');
      await ghlFetch('/conversations/messages', { type: 'SMS', contactId, message: sms });
    }
  }
  return { contactId };
}

// ---------------------------------------------------------------------------
// Maintenance mutations
// ---------------------------------------------------------------------------

async function createMaintenance({ tenantId, title, description, priority, category }) {
  const now = new Date();
  if (DEMO) {
    const store = getDemoStore();
    const id = `m-${Date.now() % 100000}`;
    store.maintenance.unshift({
      id, tenantId, title, description, priority: priority || 'medium',
      category: category || 'general', status: 'submitted',
      createdAt: engine.localDateStr(now), updatedAt: engine.localDateStr(now),
    });
    return id;
  }
  const admin = require('firebase-admin');
  const ref = await db().collection('maintenanceRequests').add({
    tenantId, title, description,
    priority: priority || 'medium', category: category || 'general',
    status: 'submitted',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  cache.fetchedAt = null; // force refresh on next read
  return ref.id;
}

async function updateMaintenanceStatus(id, status, note) {
  if (DEMO) {
    const store = getDemoStore();
    const r = store.maintenance.find((m) => m.id === id);
    if (!r) throw new Error(`Request ${id} not found`);
    r.status = status;
    if (note) r.adminNotes = note;
    r.updatedAt = todayStr();
    return;
  }
  const admin = require('firebase-admin');
  const update = { status, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (note) update.adminNotes = note;
  await db().collection('maintenanceRequests').doc(id).update(update);
  cache.fetchedAt = null;
}

// ---------------------------------------------------------------------------
// State assembly for the dashboard
// ---------------------------------------------------------------------------

async function buildState(forceRefresh) {
  const today = todayStr();
  const settings = readSettings();
  const log = readLog();
  const { data, errors, fetchedAt } = await getData(forceRefresh);
  const queue = engine.computeQueue(data, log, settings, today);

  const paidMarks = new Set(log.filter((e) => e.action === 'paid').map((e) => e.key.replace(/^paid\|/, '')));
  const period = engine.periodOf(today);
  const tenants = data.tenants.map((t) => {
    const ov = settings.tenantOverrides[t.id] || {};
    return {
      id: t.id,
      displayName: t.displayName,
      email: t.email,
      phoneNumber: t.phoneNumber,
      unit: t.unit || t.address || '',
      monthlyRent: t.monthlyRent,
      leaseStart: engine.toDateStr(t.leaseStart),
      leaseEnd: engine.toDateStr(t.leaseEnd),
      isLeaseActive: t.isLeaseActive !== false,
      ghlContactId: t.ghlContactId || null,
      dueDay: ov.dueDay || settings.defaultDueDay,
      rentPaused: Boolean(ov.rentPaused),
      paidThisPeriod: engine.isRentCovered(t, period, data.payments, paidMarks),
    };
  });
  tenants.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));

  const maintenance = (data.maintenance || [])
    .map((r) => ({
      id: r.id, tenantId: r.tenantId,
      tenantName: (data.tenants.find((t) => t.id === r.tenantId) || {}).displayName || r.tenantId,
      title: r.title, description: r.description, priority: r.priority,
      status: r.status, category: r.category || '',
      createdAt: engine.toDateStr(r.createdAt), updatedAt: engine.toDateStr(r.updatedAt),
    }))
    .filter((r) => r.status !== 'cancelled')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const history = log.slice(-300).reverse();
  const outbox = DEMO ? readJson(stateFile('outbox.json'), []).slice(-100).reverse() : [];

  return {
    mode: DEMO ? 'demo' : 'live',
    today,
    fetchedAt,
    errors,
    queue,
    tenants,
    maintenance,
    history,
    outbox,
    settings,
    period,
  };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 2e6) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function handleAction(body) {
  const { type, id } = body;
  const today = todayStr();

  // Recompute the queue server-side so we act on the authoritative item (the
  // client may hold a stale copy).
  const settings = readSettings();
  const log = readLog();
  const { data } = await getData(false);
  const queue = engine.computeQueue(data, log, settings, today);
  const item = queue.find((q) => q.id === id);

  switch (type) {
    case 'send': {
      if (!item) throw new Error('That message is no longer in the queue (already handled?). Refresh.');
      const channels = Array.isArray(body.channels) && body.channels.length ? body.channels : ['email'];
      const result = await sendMessage(item, channels, body.edited);
      appendLog({
        key: item.id, action: 'sent', channels,
        workflow: item.workflow, kind: item.kind,
        tenantName: item.tenantName, recipient: item.recipient.email || item.recipient.phone,
        subject: (body.edited && body.edited.subject) || item.subject,
        demo: DEMO || undefined, contactId: result.contactId || undefined,
      });
      return { ok: true };
    }
    case 'copy-done': {
      if (!item) throw new Error('That message is no longer in the queue. Refresh.');
      appendLog({
        key: item.id, action: 'sent', channels: ['manual'],
        workflow: item.workflow, kind: item.kind,
        tenantName: item.tenantName, recipient: item.recipient.email || item.recipient.phone || item.recipient.name,
        subject: item.subject,
      });
      return { ok: true };
    }
    case 'skip': {
      if (!item) throw new Error('That message is no longer in the queue. Refresh.');
      appendLog({
        key: item.id, action: 'skipped', workflow: item.workflow, kind: item.kind,
        tenantName: item.tenantName, subject: item.subject, reason: body.reason || '',
      });
      return { ok: true };
    }
    case 'mark-paid': {
      const tenantId = body.tenantId || (item && item.tenantId);
      const period = body.period || (item && item.period) || engine.periodOf(today);
      if (!tenantId) throw new Error('mark-paid needs a tenantId');
      const t = data.tenants.find((x) => x.id === tenantId);
      appendLog({
        key: `paid|${tenantId}|${period}`, action: 'paid',
        tenantName: t ? t.displayName : tenantId, subject: `Rent marked paid for ${period}`,
      });
      return { ok: true };
    }
    case 'mark-renewed': {
      const tenantId = body.tenantId || (item && item.tenantId);
      const leaseEnd = body.leaseEnd || (item && item.leaseEnd);
      if (!tenantId || !leaseEnd) throw new Error('mark-renewed needs tenantId and leaseEnd');
      const t = data.tenants.find((x) => x.id === tenantId);
      appendLog({
        key: `renewed|${tenantId}|${leaseEnd}`, action: 'renewed',
        tenantName: t ? t.displayName : tenantId, subject: `Marked renewed (lease ending ${leaseEnd})`,
      });
      return { ok: true };
    }
    case 'undo': {
      const all = readLog();
      const idx = all.findIndex((e) => e.key === body.key && e.at === body.at && e.action === body.action);
      if (idx === -1) throw new Error('Log entry not found');
      all.splice(idx, 1);
      writeJson(stateFile('log.json'), all);
      return { ok: true };
    }
    default:
      throw new Error(`Unknown action: ${type}`);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🏠</text></svg>');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, 200, await buildState(url.searchParams.get('refresh') === '1'));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      json(res, 200, await handleAction(await readBody(req)));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/maintenance') {
      const body = await readBody(req);
      if (!body.tenantId || !body.title) throw new Error('tenantId and title are required');
      const id = await createMaintenance(body);
      json(res, 200, { ok: true, id });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/maintenance-status') {
      const body = await readBody(req);
      if (!body.id || !body.status) throw new Error('id and status are required');
      await updateMaintenanceStatus(body.id, body.status, body.note);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      const body = await readBody(req);
      const merged = engine.mergeSettings({ ...readSettings(), ...body });
      saveSettings(merged);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/tenant-override') {
      const body = await readBody(req);
      if (!body.tenantId) throw new Error('tenantId required');
      const settings = readSettings();
      const ov = { ...(settings.tenantOverrides[body.tenantId] || {}) };
      if (body.dueDay !== undefined) ov.dueDay = Number(body.dueDay) || undefined;
      if (body.rentPaused !== undefined) ov.rentPaused = Boolean(body.rentPaused);
      settings.tenantOverrides[body.tenantId] = ov;
      saveSettings(settings);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 404, { error: 'Not found' });
  } catch (err) {
    json(res, 400, { error: err.message || String(err) });
  }
});

// Startup sanity check for live mode: fail fast with a helpful message.
async function start() {
  if (!DEMO) {
    const haveFirebase =
      (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!haveFirebase) {
      console.error(
        '\nLive mode needs Firebase Admin credentials in .env (FIREBASE_CLIENT_EMAIL +\n' +
        'FIREBASE_PRIVATE_KEY) or GOOGLE_APPLICATION_CREDENTIALS — the same setup the\n' +
        'portal already uses.\n\n' +
        'To try the app with sample data instead:  npm run autopilot:demo\n'
      );
      process.exit(1);
    }
    if (!(process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN)) {
      console.warn('Warning: GHL_API_KEY not set — the queue will build, but Send will fail until it is configured.');
    }
    try {
      require.resolve('firebase-admin');
    } catch {
      console.error('\nfirebase-admin is not installed. Run `npm install` in the project first.\n');
      process.exit(1);
    }
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  Rental autopilot ${DEMO ? '(DEMO — sample data, sends go to a local outbox)' : '(LIVE)'}`);
    console.log(`  Open  http://127.0.0.1:${PORT}\n`);
  });
}

start();
