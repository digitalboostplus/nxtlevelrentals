import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import {
  dropContractorVoicemail,
  getContractorComms,
  listContactLog,
  requestContractorCall,
  saveContractor,
  saveContractorComms,
  sendContractorSms,
  ticketVars,
} from '../lib/contractors';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const projectId = 'demo-nlr-integrity';
const app = initializeApp({ projectId }, 'contractor-tests');
const db = getFirestore(app);
const auth = getAuth(app);
let env: RulesTestEnvironment;
let now = Date.parse('2026-09-07T15:00:00Z');
// Each read of the clock ticks so log rows sort deterministically.
const deps = { db, now: () => ++now };
const password = 'Emulator-only-123!';
let server: Server;
let base = '';

const routes: Record<string, () => Promise<{ default: any }>> = {
  '/contractors': () => import('../pages/api/admin/contractors/index'),
  '/contractor': () => import('../pages/api/admin/contractors/[id]'),
  '/resync': () => import('../pages/api/admin/contractors/[id]/resync'),
  '/settings': () => import('../pages/api/admin/contractors/settings'),
  '/ticket-vars': () => import('../pages/api/admin/contractors/ticket-vars'),
};

async function token(uid: string): Promise<string> {
  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.com`, password, returnSecureToken: true }),
  });
  return ((await login.json()) as { idToken: string }).idToken;
}
async function call(path: string, opts: { method?: string; uid?: string; body?: unknown; query?: Record<string, string> } = {}) {
  const url = new URL(`${base}${path}`);
  Object.entries(opts.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.uid) headers.Authorization = `Bearer ${await token(opts.uid)}`;
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firestore.rules', 'utf8') } });
  for (const role of ['admin', 'tenant', 'landlord', 'super-admin']) {
    const uid = `contractor-${role}`;
    await db.doc(`users/${uid}`).set({ role, displayName: `Contractor ${role}` });
    try { await auth.createUser({ uid, email: `${uid}@example.com`, password }); } catch (error: any) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
  }
  await db.doc('properties/contractor-house').set({ name: 'Contractor Test House', address: '9 Test Lane' });
  await db.doc('maintenanceRequests/contractor-ticket').set({ title: 'Water heater leak', propertyId: 'contractor-house', scheduledDate: Date.parse('2026-09-10T15:00:00Z'), status: 'in_progress' });
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
  await env.cleanup();
  await Promise.all(getApps().map((a) => deleteApp(a)));
});

test('rules: staff read contractors, logs and settings; nobody writes them from the client', async () => {
  await db.doc('contractors/rules-probe').set({ name: 'Probe', status: 'approved', searchKey: 'probe' });
  await db.doc('contractors/rules-probe/contactLog/one').set({ type: 'sms', status: 'dry-run' });
  await db.doc('settings/contractorComms').set({ smsTemplates: [] });
  const admin = env.authenticatedContext('contractor-admin').firestore();
  const tenant = env.authenticatedContext('contractor-tenant').firestore();
  const landlord = env.authenticatedContext('contractor-landlord').firestore();
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(admin, 'contractors/rules-probe')));
  await assertSucceeds(getDocs(collection(admin, 'contractors/rules-probe/contactLog')));
  await assertSucceeds(getDoc(doc(admin, 'settings/contractorComms')));
  await assertFails(getDoc(doc(tenant, 'contractors/rules-probe')));
  await assertFails(getDoc(doc(landlord, 'contractors/rules-probe')));
  await assertFails(getDoc(doc(anon, 'contractors/rules-probe')));
  await assertFails(getDocs(collection(tenant, 'contractors/rules-probe/contactLog')));
  await assertFails(getDoc(doc(landlord, 'settings/contractorComms')));
  await assertFails(setDoc(doc(admin, 'contractors/rules-probe'), { name: 'Changed' }));
  await assertFails(setDoc(doc(admin, 'contractors/rules-probe/contactLog/forged'), { type: 'sms' }));
  await assertFails(setDoc(doc(admin, 'settings/contractorComms'), { callWorkflowId: 'x' }));
});

test('routes: auth and method guards, create stores a dry-run id, update and resync persist', async () => {
  assert.equal((await call('/contractors')).status, 401);
  assert.equal((await call('/contractors', { uid: 'contractor-tenant' })).status, 403);
  assert.equal((await call('/contractors', { uid: 'contractor-landlord' })).status, 403);
  assert.equal((await call('/contractors', { uid: 'contractor-admin', method: 'DELETE' })).status, 405);
  assert.equal((await call('/settings', { uid: 'contractor-admin', method: 'POST', body: {} })).status, 405);

  const bad = await call('/contractors', { uid: 'contractor-admin', method: 'POST', body: { name: 'No phone', trades: ['hvac'], phone: '12' } });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /valid mobile/);

  const created = await call('/contractors', { uid: 'contractor-admin', method: 'POST', body: { name: 'Pat Plumber', company: 'Pat & Sons', trades: ['plumbing'], phone: '(816) 555-0100', email: 'PAT@example.com' } });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id: string = created.body.contractor.id;
  assert.equal(created.body.contractor.phone, '+18165550100');
  assert.equal(created.body.contractor.email, 'pat@example.com');
  assert.equal(created.body.contractor.ghlContactId, `dry-run:${id}`);
  assert.equal(created.body.contractor.consentAt, null);
  assert.equal(created.body.contractor.createdBy, 'contractor-admin');
  const stored = (await db.doc(`contractors/${id}`).get()).data()!;
  assert.equal(stored.searchKey, 'pat plumber pat & sons +18165550100 18165550100 pat@example.com');
  assert.equal(stored.ghlSyncError, null);

  const list = await call('/contractors', { uid: 'contractor-super-admin', query: { status: 'approved' } });
  assert.equal(list.status, 200);
  assert.ok(list.body.contractors.some((c: any) => c.id === id));
  assert.equal((await call('/contractors', { uid: 'contractor-admin', query: { status: 'inactive' } })).body.contractors.some((c: any) => c.id === id), false);

  now += 60_000;
  const updated = await call('/contractor', { uid: 'contractor-admin', method: 'PUT', query: { id }, body: { name: 'Pat Plumber', trades: ['plumbing', 'hvac'], phone: '8165550100', consent: true, status: 'inactive' } });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.deepEqual(updated.body.contractor.trades, ['plumbing', 'hvac']);
  assert.equal(typeof updated.body.contractor.consentAt, 'number');
  assert.equal(updated.body.contractor.status, 'inactive');
  assert.equal(updated.body.contractor.createdBy, 'contractor-admin');
  const again = await call('/contractor', { uid: 'contractor-admin', method: 'PUT', query: { id }, body: { name: 'Pat Plumber', trades: ['plumbing'], phone: '8165550100', status: 'approved' } });
  assert.equal(again.body.contractor.consentAt, updated.body.contractor.consentAt, 'consent is kept when the form omits it');

  const detail = await call('/contractor', { uid: 'contractor-admin', query: { id } });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.contractor.name, 'Pat Plumber');
  assert.deepEqual(detail.body.log, []);
  assert.equal((await call('/contractor', { uid: 'contractor-admin', query: { id: 'missing' } })).status, 404);
  assert.equal((await call('/contractor', { uid: 'contractor-admin', query: { id: 'not valid!' } })).status, 400);

  await db.doc(`contractors/${id}`).update({ ghlContactId: null, ghlSyncError: 'GHL POST failed (503)' });
  const resynced = await call('/resync', { uid: 'contractor-admin', method: 'POST', query: { id } });
  assert.equal(resynced.status, 200);
  assert.equal(resynced.body.contractor.ghlContactId, `dry-run:${id}`);
  assert.equal(resynced.body.contractor.ghlSyncError, null);
  assert.equal((await call('/resync', { uid: 'contractor-tenant', method: 'POST', query: { id } })).status, 403);
});

test('settings seed defaults once and report what is configured; ticket vars prefill from a request', async () => {
  await db.doc('settings/contractorComms').delete();
  const first = await call('/settings', { uid: 'contractor-admin' });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.settings.smsTemplates.map((t: any) => t.id), ['new-job', 'confirm-visit', 'reschedule', 'invoice-reminder']);
  assert.deepEqual(first.body.configured, { sms: true, voicemail: { newJob: false, confirmVisit: false, urgent: false }, call: false, dryRun: true });
  assert.equal((await db.doc('settings/contractorComms').get()).exists, true);

  const saved = await saveContractorComms(deps, { voicemailWorkflows: { urgent: 'wf-urgent-1' }, callWorkflowId: '', smsTemplates: [{ id: 'only', label: 'Only', body: 'Hi {contractor}' }] }, { uid: 'contractor-super-admin' });
  assert.equal(saved.configured.voicemail.urgent, true);
  assert.equal(saved.settings.updatedBy, 'contractor-super-admin');
  const withEnv = await getContractorComms({ ...deps, env: { ...process.env, GHL_VOICEMAIL_WORKFLOW_NEW_JOB: 'wf-env-new', GHL_CALL_WORKFLOW_ID: 'wf-env-call' } });
  assert.equal(withEnv.settings.voicemailWorkflows.newJob, 'wf-env-new', 'env fills a blank');
  assert.equal(withEnv.settings.voicemailWorkflows.urgent, 'wf-urgent-1', 'stored value wins over env');
  assert.equal(withEnv.configured.call, true);
  assert.deepEqual((await call('/settings', { uid: 'contractor-admin' })).body.settings.smsTemplates.map((t: any) => t.id), ['only'], 'defaults never overwrite a saved doc');

  const vars = await call('/ticket-vars', { uid: 'contractor-admin', query: { ticketId: 'contractor-ticket' } });
  assert.equal(vars.status, 200);
  assert.equal(vars.body.ticket, 'Water heater leak');
  assert.equal(vars.body.property, 'Contractor Test House');
  assert.match(vars.body.date, /Sep 10/);
  assert.equal((await call('/ticket-vars', { uid: 'contractor-admin', query: { ticketId: 'nope' } })).status, 404);
});

test('messaging in dry run logs rows and enforces status, sync, consent and configuration', async () => {
  const actor = { uid: 'contractor-admin', name: 'Contractor admin' };
  const pat = await saveContractor(deps, { input: { name: 'Sam Sparks', trades: ['electrical'], phone: '8165550199' }, actor });
  const sms = await sendContractorSms(deps, { contractorId: pat.id, message: '  Hi Sam, job at 9 Test Lane  ', templateId: 'new-job', ticketId: 'contractor-ticket', actor });
  assert.equal(sms.log.status, 'dry-run');
  assert.equal(sms.log.message, 'Hi Sam, job at 9 Test Lane');
  assert.equal(sms.log.ticketId, 'contractor-ticket');
  assert.equal(sms.log.actorName, 'Contractor admin');
  await assert.rejects(sendContractorSms(deps, { contractorId: pat.id, message: '', actor }), /Type a message/);
  await assert.rejects(sendContractorSms(deps, { contractorId: pat.id, message: 'x', ticketId: 'bad id!', actor }), /Ticket id/);
  await assert.rejects(sendContractorSms(deps, { contractorId: 'missing', message: 'x', actor }), /not found/);

  await assert.rejects(dropContractorVoicemail(deps, { contractorId: pat.id, situation: 'newJob', actor }), /not configured/);
  await saveContractorComms(deps, { voicemailWorkflows: { newJob: 'wf-new-job' }, callWorkflowId: 'wf-call', smsTemplates: [{ id: 'a', label: 'A', body: 'x' }] }, actor);
  await assert.rejects(dropContractorVoicemail(deps, { contractorId: pat.id, situation: 'newJob', actor }), /consent/);
  await assert.rejects(dropContractorVoicemail(deps, { contractorId: pat.id, situation: 'nope', actor }), /Pick a voicemail/);
  await saveContractor(deps, { id: pat.id, input: { name: 'Sam Sparks', trades: ['electrical'], phone: '8165550199', consent: true }, actor });
  const vm = await dropContractorVoicemail(deps, { contractorId: pat.id, situation: 'newJob', actor });
  assert.equal(vm.log.type, 'voicemail');
  assert.equal(vm.log.templateId, 'newJob');
  assert.equal(vm.log.status, 'dry-run');

  const tel = await requestContractorCall(deps, { contractorId: pat.id, actor });
  assert.equal(tel.mode, 'tel');
  assert.equal((tel as any).phone, '+18165550199');
  const bridged = await requestContractorCall(deps, { contractorId: pat.id, actor: { ...actor, ghlUserId: 'ghl-user-1' } });
  assert.equal(bridged.mode, 'workflow');
  assert.equal(bridged.log.templateId, 'wf-call');

  const log = await listContactLog(deps, pat.id);
  assert.deepEqual(log.map((l) => l.type), ['call', 'call', 'voicemail', 'sms']);

  await saveContractor(deps, { id: pat.id, input: { name: 'Sam Sparks', trades: ['electrical'], phone: '8165550199', status: 'inactive' }, actor });
  await assert.rejects(sendContractorSms(deps, { contractorId: pat.id, message: 'x', actor }), /inactive/);
  await db.doc(`contractors/${pat.id}`).update({ status: 'approved', ghlContactId: null });
  await assert.rejects(sendContractorSms(deps, { contractorId: pat.id, message: 'x', actor }), /not synced/);
  assert.equal(await ticketVars(deps, 'contractor-ticket').then((v) => v.ticketId), 'contractor-ticket');
});
