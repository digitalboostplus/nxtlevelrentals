import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { enqueueGhlSync, processGhlSyncJobs } from '../lib/ghlSyncJobs';
import { matchTenantByContact } from '../lib/maintenanceIntake';
import type { MaintenanceGhlPort } from '../lib/ghl-maintenance-object';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const projectId = 'demo-nlr-integrity';
const app = initializeApp({ projectId }, 'ghl-maintenance-tests');
const db = getFirestore(app);
const auth = getAuth(app);
let now = Date.parse('2026-09-18T15:00:00Z');
const noSleep = async () => {};
const password = 'Emulator-only-123!';
const WEBHOOK_SECRET = 'test-webhook-secret-with-at-least-32-chars';
let server: Server;
let base = '';
let webhookRequestId = '';

const routes: Record<string, () => Promise<{ default: any }>> = {
  '/webhook': () => import('../pages/api/ghl/maintenance-webhook'),
  '/resync': () => import('../pages/api/admin/maintenance/[id]/resync'),
  '/resync-all': () => import('../pages/api/admin/maintenance/resync-all'),
};
async function token(uid: string): Promise<string> {
  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.com`, password, returnSecureToken: true }),
  });
  return ((await login.json()) as { idToken: string }).idToken;
}
async function call(path: string, opts: { method?: string; uid?: string; body?: unknown; query?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const url = new URL(`${base}${path}`);
  Object.entries(opts.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.uid) headers.Authorization = `Bearer ${await token(opts.uid)}`;
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}
const sitePayload = {
  contact_id: 'contact-sam', first_name: 'Sam', last_name: 'Tenant', email: 'sam@example.com', phone: '+18165550100',
  'Property Address (Maintenance)': '12 Elm St', 'Maintenance Issue Type': 'Plumbing', 'Maintenance Priority': 'High',
  'Maintenance Description': 'Kitchen sink drain is fully blocked', 'Maintenance Photo/Video': 'https://files.example/sink.jpg',
  customData: { source: 'ghl-site-form' }, workflow: { id: 'wf', name: 'MR01 - Maintenance Request' },
};

function fakePort(overrides: Partial<MaintenanceGhlPort> = {}) {
  const calls: Array<[string, ...unknown[]]> = [];
  const port: MaintenanceGhlPort = {
    configured: () => true,
    getRecord: async (id) => { calls.push(['getRecord', id]); return { id }; },
    createRecord: async (props) => { calls.push(['createRecord', props]); return 'rec-new'; },
    updateRecord: async (id, props) => { calls.push(['updateRecord', id, props]); },
    getContactByEmail: async (email) => { calls.push(['getContactByEmail', email]); return email === 'sam@example.com' ? { id: 'contact-sam' } : null; },
    getContactByPhone: async (phone) => { calls.push(['getContactByPhone', phone]); return null; },
    createRelation: async (a, f, s) => { calls.push(['createRelation', a, f, s]); },
    throttle: async () => {},
    ...overrides,
  };
  return { port, calls };
}
const env = { GHL_MAINT_ASSOC_TENANT_ID: 'assoc-tenant', GHL_MAINT_ASSOC_PROPERTY_ID: 'assoc-property', GHL_MAINT_OPTION_VALUE_MODE: 'key', NEXT_PUBLIC_APP_URL: 'https://app.example' } as unknown as NodeJS.ProcessEnv;

before(async () => {
  process.env.GHL_WEBHOOK_SECRET = WEBHOOK_SECRET;
  await db.doc('users/ghl-tenant').set({ role: 'tenant', email: 'sam@example.com', propertyIds: ['ghl-house'] });
  await db.doc('users/ghl-admin').set({ role: 'admin', displayName: 'GHL Admin' });
  try { await auth.createUser({ uid: 'ghl-admin', email: 'ghl-admin@example.com', password }); } catch (error: any) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
  await db.doc('properties/ghl-house').set({ name: '12 Elm St', address: '12 Elm St, Kansas City, MO', source: 'ghl', ghlObjectId: 'house-12' });
  await db.doc('maintenanceRequests/ghl-ticket-1').set({ tenantId: 'ghl-tenant', propertyId: 'ghl-house', title: 'Furnace out', description: 'No heat since last night', category: 'hvac', priority: 'high', status: 'submitted', createdAt: now, updatedAt: now });
  const handlers = Object.fromEntries(await Promise.all(Object.entries(routes).map(async ([path, load]) => [path, (await load()).default])));
  server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const nextReq = Object.assign(req, { query: Object.fromEntries(url.searchParams), body: raw ? JSON.parse(raw) : undefined });
      const nextRes = Object.assign(res, {
        status(code: number) { res.statusCode = code; return this; },
        json(body: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return this; },
      });
      const handler = handlers[url.pathname];
      if (!handler) { res.statusCode = 404; return res.end(); }
      void handler(nextReq as any, nextRes as any);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  await Promise.all(getApps().map(a => deleteApp(a)));
});

test('matchTenantByContact prefers the GHL contact id, then email, then phone', async () => {
  await db.doc('users/ghl-tenant-2').set({ role: 'tenant', email: 'two@example.com', phoneNumber: '+18165550002', ghlContactId: 'contact-two', propertyIds: ['ghl-house'] });
  assert.equal((await matchTenantByContact(db, { ghlContactId: 'contact-two' })).tenantId, 'ghl-tenant-2');
  assert.equal((await matchTenantByContact(db, { email: 'SAM@example.com' })).tenantId, 'ghl-tenant');
  assert.equal((await matchTenantByContact(db, { phone: '+18165550002' })).tenantId, 'ghl-tenant-2');
  assert.deepEqual(await matchTenantByContact(db, { email: 'nobody@example.com' }), { tenantId: 'public', propertyId: 'unassigned', user: null });
});

test('the MR01 webhook rejects bad secrets and bad payloads', async () => {
  assert.equal((await call('/webhook', { method: 'POST', body: sitePayload })).status, 403);
  assert.equal((await call('/webhook', { method: 'POST', body: sitePayload, query: { token: 'wrong' } })).status, 403);
  assert.equal((await call('/webhook', { method: 'GET', query: { token: WEBHOOK_SECRET } })).status, 405);
  const bad = await call('/webhook', { method: 'POST', body: { email: 'x@y.z' }, query: { token: WEBHOOK_SECRET } });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /description/i);
  const saved = process.env.GHL_WEBHOOK_SECRET;
  process.env.GHL_WEBHOOK_SECRET = '';
  assert.equal((await call('/webhook', { method: 'POST', body: sitePayload, query: { token: WEBHOOK_SECRET } })).status, 503);
  process.env.GHL_WEBHOOK_SECRET = saved;
});

test('the MR01 webhook files a ticket once, matches the tenant, queues the mirror and notifies admins', async () => {
  const first = await call('/webhook', { method: 'POST', body: sitePayload, headers: { 'x-webhook-secret': WEBHOOK_SECRET } });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.match(first.body.requestId, /^ghl-[0-9a-f]{24}$/);
  assert.equal(first.body.matched, true);
  webhookRequestId = first.body.requestId;
  const ticket = (await db.doc(`maintenanceRequests/${first.body.requestId}`).get()).data()!;
  assert.equal(ticket.source, 'ghl-site-form');
  assert.equal(ticket.tenantId, 'ghl-tenant');
  assert.equal(ticket.propertyId, 'ghl-house');
  assert.equal(ticket.category, 'Plumbing');
  assert.equal(ticket.priority, 'high');
  assert.equal(ticket.title, 'Plumbing: Kitchen sink drain is fully blocked');
  assert.deepEqual(ticket.attachmentUrls, ['https://files.example/sink.jpg']);
  assert.equal(ticket.ghlContactId, 'contact-sam');
  // The emulator forces dry-run, so the inline attempt stamps a dry-run id rather than calling GHL.
  assert.equal(ticket.ghlRecordId, `dry-run:${first.body.requestId}`);
  assert.equal((await db.doc(`ghlSyncJobs/${first.body.requestId}`).get()).data()!.status, 'sent');
  assert.ok((await db.doc(`ghlWebhookEvents/${first.body.requestId}`).get()).exists);
  const admins = await db.collection('notificationJobs').where('requestId', '==', first.body.requestId).where('userId', '==', 'ghl-admin').get();
  assert.ok(admins.size >= 1, 'admins are notified like any other new ticket');
  const again = await call('/webhook', { method: 'POST', body: sitePayload, query: { token: WEBHOOK_SECRET } });
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.requestId, first.body.requestId);
});

test('admins can resync one ticket or backfill all of them; tenants cannot', async () => {
  await db.doc('maintenanceRequests/ghl-ticket-1').update({ ghlRecordId: null, ghlSyncError: 'earlier failure' });
  assert.equal((await call('/resync', { method: 'POST', query: { id: 'ghl-ticket-1' } })).status, 401);
  assert.equal((await call('/resync', { method: 'POST', query: { id: 'missing-ticket' }, uid: 'ghl-admin' })).status, 404);
  const one = await call('/resync', { method: 'POST', query: { id: 'ghl-ticket-1' }, uid: 'ghl-admin' });
  assert.equal(one.status, 200, JSON.stringify(one.body));
  assert.equal(one.body.ghlRecordId, 'dry-run:ghl-ticket-1');
  assert.equal(one.body.ghlSyncError, null);
  await db.doc('maintenanceRequests/ghl-ticket-backfill').set({ tenantId: 'ghl-tenant', propertyId: 'ghl-house', title: 'Old ticket', description: 'Filed before the mirror existed', category: 'other', priority: 'low', status: 'completed', createdAt: now, updatedAt: now });
  const all = await call('/resync-all', { method: 'POST', uid: 'ghl-admin' });
  assert.equal(all.status, 200, JSON.stringify(all.body));
  assert.ok(all.body.total >= 3, `total ${all.body.total}`);
  assert.ok(all.body.queued >= 1, 'tickets without a record are queued');
  assert.equal((await db.doc('maintenanceRequests/ghl-ticket-backfill').get()).data()!.ghlRecordId, 'dry-run:ghl-ticket-backfill');
  // Tickets that already have a record are left alone (other suites may add fixtures without one).
  assert.equal((await db.doc('ghlSyncJobs/ghl-ticket-1').get()).data()!.reason, 'resync');
  assert.equal((await db.doc(`ghlSyncJobs/${webhookRequestId}`).get()).data()!.reason, 'created');
});

test('enqueue inside a transaction writes a pending job keyed by the ticket id', async () => {
  await db.runTransaction(async tx => { enqueueGhlSync(tx, db, 'ghl-ticket-1', 'created', now); });
  const job = (await db.doc('ghlSyncJobs/ghl-ticket-1').get()).data()!;
  assert.equal(job.status, 'pending');
  assert.equal(job.reason, 'created');
  assert.equal(job.attempts, 0);
  assert.equal(job.nextAttemptAt, now);
});

test('processing a job mirrors the ticket, links contact and property, and marks the job sent', async () => {
  const { port, calls } = fakePort();
  const counts = await processGhlSyncJobs(db, { db, ghl: port, dryRun: false, env, sleep: noSleep, now: () => now }, { onlyId: 'ghl-ticket-1', now });
  assert.deepEqual(counts, { sent: 1, retry: 0, failed: 0, skipped: 0 });
  const ticket = (await db.doc('maintenanceRequests/ghl-ticket-1').get()).data()!;
  assert.equal(ticket.ghlRecordId, 'rec-new');
  assert.equal(ticket.ghlContactId, 'contact-sam');
  assert.equal(ticket.ghlPropertyRecordId, 'house-12');
  assert.deepEqual(ticket.ghlRelations, { tenant: 'contact-sam', property: 'house-12' });
  assert.equal(ticket.ghlSyncError, null);
  const created = calls.find(c => c[0] === 'createRecord')![1] as Record<string, unknown>;
  assert.equal(created.title, 'HVAC: Furnace out — 12 Elm St, Kansas City, MO');
  assert.equal(created.issue_type, 'hvac');
  assert.equal(created.status, 'submitted');
  assert.equal((await db.doc('ghlSyncJobs/ghl-ticket-1').get()).data()!.status, 'sent');
});

test('a re-enqueued job updates the existing record instead of creating another', async () => {
  await db.doc('maintenanceRequests/ghl-ticket-1').update({ status: 'in_progress', assignedVendorName: 'Pat' });
  await db.runTransaction(async tx => { enqueueGhlSync(tx, db, 'ghl-ticket-1', 'status', now + 1); });
  const { port, calls } = fakePort();
  await processGhlSyncJobs(db, { db, ghl: port, dryRun: false, env, sleep: noSleep, now: () => now + 1 }, { onlyId: 'ghl-ticket-1', now: now + 1 });
  assert.deepEqual(calls.map(c => c[0]), ['getRecord', 'updateRecord']);
  assert.equal((calls[1][2] as Record<string, unknown>).status, 'in_progress');
});

test('a failing mirror leaves the job pending with backoff and records the error on the ticket', async () => {
  await db.doc('maintenanceRequests/ghl-ticket-2').set({ tenantId: 'public', propertyId: 'unassigned', title: 'Door lock', description: 'Front door lock sticks', category: 'Locks/Security', priority: 'low', status: 'submitted', createdAt: now, updatedAt: now, addressText: '12 Elm St' });
  await db.runTransaction(async tx => { enqueueGhlSync(tx, db, 'ghl-ticket-2', 'created', now); });
  const failing = fakePort({ createRecord: async () => { throw new Error('GHL POST /objects failed (422): bad field'); } });
  const counts = await processGhlSyncJobs(db, { db, ghl: failing.port, dryRun: false, env, sleep: noSleep, now: () => now }, { onlyId: 'ghl-ticket-2', now });
  assert.deepEqual(counts, { sent: 0, retry: 1, failed: 0, skipped: 0 });
  const job = (await db.doc('ghlSyncJobs/ghl-ticket-2').get()).data()!;
  assert.equal(job.status, 'pending');
  assert.equal(job.attempts, 1);
  assert.ok(job.nextAttemptAt > now);
  assert.match((await db.doc('maintenanceRequests/ghl-ticket-2').get()).data()!.ghlSyncError, /422/);
  // Not due yet: a normal sweep skips it; a forced retry runs it.
  const idle = await processGhlSyncJobs(db, { db, ghl: failing.port, dryRun: false, env, sleep: noSleep, now: () => now }, { now });
  assert.equal(idle.retry + idle.sent, 0);
  const { port, calls } = fakePort();
  const forced = await processGhlSyncJobs(db, { db, ghl: port, dryRun: false, env, sleep: noSleep, now: () => now }, { onlyId: 'ghl-ticket-2', now, force: true });
  assert.equal(forced.sent, 1);
  const ticket = (await db.doc('maintenanceRequests/ghl-ticket-2').get()).data()!;
  assert.equal(ticket.ghlSyncError, null);
  assert.equal(ticket.ghlPropertyRecordId, 'house-12', 'unassigned public ticket is matched to the property by address');
  assert.equal(calls.find(c => c[0] === 'createRecord')![1] && (calls.find(c => c[0] === 'createRecord')![1] as any).property_address, '12 Elm St, Kansas City, MO');
});

test('dry-run deps never call the port and stamp a dry-run record id', async () => {
  await db.doc('maintenanceRequests/ghl-ticket-3').set({ tenantId: 'ghl-tenant', propertyId: 'ghl-house', title: 'Test', description: 'dry run ticket', category: 'other', priority: 'medium', status: 'submitted', createdAt: now, updatedAt: now });
  await db.runTransaction(async tx => { enqueueGhlSync(tx, db, 'ghl-ticket-3', 'created', now); });
  const { port, calls } = fakePort();
  await processGhlSyncJobs(db, { db, ghl: port, dryRun: true, env, sleep: noSleep, now: () => now }, { onlyId: 'ghl-ticket-3', now });
  assert.equal(calls.length, 0);
  assert.equal((await db.doc('maintenanceRequests/ghl-ticket-3').get()).data()!.ghlRecordId, 'dry-run:ghl-ticket-3');
});
