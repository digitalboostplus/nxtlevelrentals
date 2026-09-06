import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { getStorage } from 'firebase-admin/storage';
import { ref, getBytes, uploadBytes } from 'firebase/storage';
import { createServer } from 'node:http';
import { loadOwnerData, ownerDocumentPath } from '../lib/ownerData';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { activateLease, type LeaseActivationInput } from '../lib/activateLease';
import payRent from '../pages/api/payments/pay-rent';

const projectId = 'demo-nlr-integrity';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const app = initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId,
    firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firestore.rules', 'utf8') },
    storage: { host: '127.0.0.1', port: 9198, rules: readFileSync('storage.rules', 'utf8') }
  });
  await env.clearFirestore();
  for (const [uid, role] of [['tenant', 'tenant'], ['owner', 'landlord'], ['admin', 'admin']]) {
    await db.doc(`users/${uid}`).set({ role });
    await auth.createUser({ uid, email: `${uid}@example.com`, password: 'Emulator-only-123!' });
  }
  await db.doc('properties/one').set({ name: 'One', landlordId: 'owner', status: 'vacant' });
  await db.doc('properties/two').set({ name: 'Two', landlordId: 'different-owner', status: 'vacant' });
});
after(async () => { await env?.cleanup(); await Promise.all(getApps().map(a => deleteApp(a))); });

test('self escalation, self assignment and verification changes are denied; admin writes work', async () => {
  const client = env.authenticatedContext('tenant').firestore();
  for (const data of [{ role: 'admin' }, { propertyIds: ['two'] }, { rentersInsurance: { verified: true } }]) {
    await assertFails(updateDoc(doc(client, 'users/tenant'), data));
  }
  await assertFails(setDoc(doc(env.authenticatedContext('new-user').firestore(), 'users/new-user'), { role: 'admin' }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/tenant')));
  await assertSucceeds(updateDoc(doc(env.authenticatedContext('admin').firestore(), 'users/tenant'), { displayName: 'Resident' }));
  await assertFails(setDoc(doc(env.authenticatedContext('owner').firestore(), 'leases/forged'), { landlordId: 'owner', tenantId: 'tenant', propertyId: 'two', isActive: true }));
});
test('expense ownership and pending approval are enforced', async () => {
  const client = env.authenticatedContext('owner').firestore();
  const data = { landlordId: 'owner', propertyId: 'one', status: 'pending', createdBy: 'owner', amount: 20 };
  await assertSucceeds(setDoc(doc(client, 'landlordExpenses/valid'), data));
  for (const patch of [{ status: 'approved' }, { propertyId: 'two' }, { amount: -1 }, { reviewedBy: 'owner' }]) {
    await assertFails(setDoc(doc(client, 'landlordExpenses/invalid'), { ...data, ...patch }));
  }
  await assertFails(updateDoc(doc(client, 'landlordExpenses/valid'), { status: 'paid' }));
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(), 'landlordExpenses/tenant'), { ...data, landlordId: 'tenant', createdBy: 'tenant' }));
});
const terms: LeaseActivationInput = {
  operationId: 'activate-operation-12345', propertyId: 'one', tenantId: 'tenant',
  startDate: '2026-09-16', endDate: '2027-09-15', monthlyRent: 1500,
  securityDeposit: 1500, paymentDueDay: 1, lateFeeGraceDays: 5, lateFeeAmount: 50
};
test('concurrent retries activate exactly one lease and charge set, with proration', async () => {
  const [first, second] = await Promise.all([activateLease(db, auth, 'admin', terms), activateLease(db, auth, 'admin', terms)]);
  assert.equal(first.leaseId, second.leaseId);
  assert.equal((await db.collection('leases').get()).size, 1);
  const ledger = await db.collection('ledger').get();
  assert.equal(ledger.size, 2);
  assert.equal(ledger.docs.find(d => d.data().category === 'rent')?.data().amount, 750);
  assert.deepEqual((await db.doc('users/tenant').get()).data()?.propertyIds, ['one']);
  assert.equal((await db.doc('properties/one').get()).data()?.status, 'occupied');
  await assert.rejects(activateLease(db, auth, 'admin', { ...terms, monthlyRent: 1800 }), /different terms/);
  await assert.rejects(activateLease(db, auth, 'admin', { ...terms, operationId: 'overlap-operation-12345' }), /active lease/);
  assert.equal((await db.collection('ledger').get()).size, 2);
});
test('units activate independently and new residents use real Auth identities', async () => {
  await db.doc('properties/building').set({ name: 'Building', landlordId: 'owner', units: [{ id: 'a', unitNumber: 'A', status: 'vacant' }, { id: 'b', unitNumber: 'B', status: 'vacant' }] });
  const first = await activateLease(db, auth, 'admin', { ...terms, operationId: 'new-resident-123456', propertyId: 'building', unitId: 'a', tenantId: undefined, newTenant: { email: 'new@example.com', displayName: 'New Resident' } });
  assert.equal((await auth.getUser(first.tenantId)).email, 'new@example.com');
  await activateLease(db, auth, 'admin', { ...terms, operationId: 'other-unit-1234567', propertyId: 'building', unitId: 'b' });
  assert.equal((await db.doc('properties/building').get()).data()?.status, 'occupied');
});
test('validation failure cannot leave operational writes behind', async () => {
  const count = (await db.collection('leases').get()).size;
  await assert.rejects(activateLease(db, auth, 'admin', { ...terms, operationId: 'missing-unit-123456', propertyId: 'two', unitId: 'missing' }));
  assert.equal((await db.collection('leases').get()).size, count);
  assert.equal((await db.doc('properties/two').get()).data()?.status, 'vacant');
});
test('payment endpoint cannot manufacture credits', async () => {
  const count = (await db.collection('ledger').get()).size;
  let status = 0;
  const res = { status(code: number) { status = code; return this; }, json(body: unknown) { return body; } };
  payRent({ method: 'POST', body: { amount: 1000 } } as any, res as any);
  assert.equal(status, 503);
  assert.equal((await db.collection('ledger').get()).size, count);
});

test('an exception after queued writes rolls back the entire activation', async () => {
  await db.doc('properties/rollback').set({ name: 'Rollback', landlordId: 'owner', status: 'vacant' });
  const beforeCount = (await db.collection('ledger').get()).size;
  const failingDb = new Proxy(db, {
    get(target, key) {
      if (key === 'runTransaction') return (callback: any) => target.runTransaction(tx => callback(new Proxy(tx, {
        get(transaction, method) {
          if (method === 'update') return () => { throw new Error('Injected failure before commit'); };
          const value = Reflect.get(transaction, method);
          return typeof value === 'function' ? value.bind(transaction) : value;
        }
      })));
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  await assert.rejects(activateLease(failingDb, auth, 'admin', { ...terms, operationId: 'rollback-operation-123', propertyId: 'rollback' }), /Injected failure/);
  assert.equal((await db.collection('ledger').get()).size, beforeCount);
  assert.equal((await db.doc('properties/rollback').get()).data()?.status, 'vacant');
});

test('server API denies non-admin activation and prevents insurance self-verification', async () => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  const activation = (await import('../pages/api/admin/activate-lease')).default;
  const profile = (await import('../pages/api/tenant/update-profile')).default;
  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tenant@example.com', password: 'Emulator-only-123!', returnSecureToken: true })
  });
  const { idToken } = await login.json() as { idToken: string };
  assert.ok(idToken);
  let status = 0;
  const res = { status(code: number) { status = code; return this; }, json(body: unknown) { return body; } };
  const headers = { authorization: `Bearer ${idToken}` };
  await activation({ method: 'POST', headers, body: terms } as any, res as any);
  assert.equal(status, 403);
  await profile({ method: 'POST', headers, body: { role: 'admin', rentersInsurance: { provider: 'Example', verified: true } } } as any, res as any);
  assert.equal(status, 200);
  const user = (await db.doc('users/tenant').get()).data();
  assert.equal(user?.role, 'tenant');
  assert.equal(user?.rentersInsurance.verified, false);
  assert.equal(user?.rentersInsurance.status, 'pending');
});


test('two owners receive only their own projections and cannot forge fee or document records', async () => {
  for (const owner of ['owner-a', 'owner-b']) {
    await db.doc(`users/${owner}`).set({ role: 'landlord', propertyIds: ['property-a', 'property-b'] });
    await auth.createUser({ uid: owner, email: `${owner}@example.com`, password: 'Emulator-only-123!' });
    const suffix = owner.slice(-1);
    await db.doc(`properties/property-${suffix}`).set({ name: suffix, landlordId: owner, status: 'occupied' });
    await db.doc(`landlords/${owner}`).set({ managementFee: { type: 'percentage', amount: 7 }, bankingInformation: { accountNumber: 'private-bank-data' } });
    await db.doc(`leases/lease-${suffix}`).set({ landlordId: owner, propertyId: `property-${suffix}`, tenantId: `tenant-${suffix}`, tenantName: suffix, isActive: true, status: 'active' });
    await db.doc(`ledger/rent-${suffix}`).set({ propertyId: `property-${suffix}`, tenantId: `tenant-${suffix}`, type: 'payment', category: 'rent', status: 'completed', amount: 1000, date: '2026-08-01' });
    await db.doc(`landlordExpenses/expense-${suffix}`).set({ landlordId: owner, propertyId: `property-${suffix}`, amount: 70, category: 'management_fee', status: 'paid', date: '2026-08-02' });
    await db.doc(`payouts/payout-${suffix}`).set({ landlordId: owner, netAmount: 930, status: 'completed' });
    await db.doc(`landlordDocuments/document-${suffix}`).set({ landlordId: owner, propertyId: `property-${suffix}`, fileName: 'statement.pdf', storagePath: `landlordDocuments/${owner}/statement.pdf`, status: 'approved', documentType: 'agreement' });
  }
  const data = await loadOwnerData(db, 'owner-a');
  assert.deepEqual(data.properties.map((p: any) => p.id), ['property-a']);
  assert.deepEqual(data.leases.map((l: any) => l.tenantId), ['tenant-a']);
  assert.deepEqual(data.ledger.map((l: any) => l.id), ['rent-a']);
  assert.deepEqual(data.payouts.map((p: any) => p.id), ['payout-a']);
  assert.deepEqual(data.documents.map((d: any) => d.id), ['document-a']);
  assert.equal(data.managementFee.amount, 7);
  assert.ok(!JSON.stringify(data).includes('private-bank-data'));
  await assert.rejects(loadOwnerData(db, 'owner-a', 'property-b'), /unavailable/);
  await assert.rejects(loadOwnerData(db, 'tenant'), /Owner access/);
  const client = env.authenticatedContext('owner-a').firestore();
  await assertSucceeds(getDocs(query(collection(client, 'properties'), where('landlordId', '==', 'owner-a'))));
  for (const path of ['properties/property-b', 'leases/lease-b', 'ledger/rent-b', 'landlordExpenses/expense-b', 'payouts/payout-b', 'landlordDocuments/document-b', 'users/tenant']) {
    await assertFails(getDoc(doc(client, path)));
  }
  await assertFails(updateDoc(doc(client, 'landlords/owner-a'), { managementFee: { type: 'percentage', amount: 0 } }));
  await assertFails(setDoc(doc(client, 'landlordDocuments/forged'), { landlordId: 'owner-a', storagePath: 'landlordDocuments/owner-b/statement.pdf' }));
  await assert.rejects(ownerDocumentPath(db, 'owner-a', 'document-b'), /unavailable/);
  await db.doc('landlordDocuments/bad-path').set({ landlordId: 'owner-a', storagePath: 'landlordDocuments/owner-b/statement.pdf' });
  await assert.rejects(ownerDocumentPath(db, 'owner-a', 'bad-path'), /migration/);
  // Stale ownership tags must not override current property ownership.
  await db.doc('leases/stale').set({ landlordId: 'owner-a', propertyId: 'property-b', tenantId: 'private-tenant', isActive: true });
  await assertFails(getDoc(doc(client, 'leases/stale')));
  assert.ok(!(await loadOwnerData(db, 'owner-a')).leases.some((l: any) => l.id === 'stale'));
  await db.doc('users/empty-owner').set({ role: 'landlord' });
  const emptyOwner = await loadOwnerData(db, 'empty-owner');
  for (const field of ['properties', 'leases', 'ledger', 'expenses', 'payouts', 'documents']) assert.deepEqual(emptyOwner[field], []);
});

test('owner files download through authenticated API; wrong-owner and anonymous access fail', async () => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  const bucketName = `${projectId}.appspot.com`;
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = bucketName;
  const payload = Buffer.from('Owner A statement evidence');
  await getStorage(app).bucket(bucketName).file('landlordDocuments/owner-a/statement.pdf').save(payload);
  const storageA = env.authenticatedContext('owner-a').storage(`gs://${bucketName}`);
  const storageB = env.authenticatedContext('owner-b').storage(`gs://${bucketName}`);
  await assertSucceeds(getBytes(ref(storageA, 'landlordDocuments/owner-a/statement.pdf')));
  await assertFails(getBytes(ref(storageB, 'landlordDocuments/owner-a/statement.pdf')));
  await assertFails(uploadBytes(ref(storageA, 'landlordDocuments/owner-a/forged.pdf'), payload));
  const handler = (await import('../pages/api/landlord/document')).default;
  const dataHandler = (await import('../pages/api/landlord/data')).default;
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const nextReq = Object.assign(req, { query: Object.fromEntries(url.searchParams) });
    const nextRes = Object.assign(res, { status(code: number) { res.statusCode = code; return this; }, json(body: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return this; } });
    void (url.pathname === '/data' ? dataHandler(nextReq as any, nextRes as any) : handler(nextReq as any, nextRes as any));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner-a@example.com', password: 'Emulator-only-123!', returnSecureToken: true })
    });
    const { idToken } = await login.json() as { idToken: string };
    const headers = { Authorization: `Bearer ${idToken}` };
    const response = await fetch(`${base}/document?id=document-a`, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await fetch(`${base}/document?id=document-b`, { headers })).status, 403);
    assert.equal((await fetch(`${base}/document?id=document-a`)).status, 401);
    assert.equal((await fetch(`${base}/data?propertyId=property-b`, { headers })).status, 403);
    const data = await (await fetch(`${base}/data?landlordId=owner-b`, { headers })).json() as any;
    assert.deepEqual(data.properties.map((p: any) => p.id), ['property-a']);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});


test('property editing preserves unit identity, blocks occupied archives and outstanding balances', async () => {
  const { editProperty } = await import('../lib/propertyOperations');
  const base = { name: 'Archive test', rent: 1200, status: 'vacant', units: [], landlordId: 'owner', address: 'Test street' };
  await db.doc('properties/archive-test').set(base);
  await assert.rejects(editProperty(db, 'tenant', 'archive-test', base), /Admin/);
  const unit = { id: 'stable-unit', unitNumber: 'A', rent: 1200, status: 'vacant' };
  await editProperty(db, 'admin', 'archive-test', { ...base, units: [unit] });
  await assert.rejects(editProperty(db, 'admin', 'archive-test', base), /instead of deleting/);
  await db.doc('ledger/archive-debt').set({ propertyId: 'archive-test', tenantId: 'a', amount: 10, type: 'charge', status: 'pending' });
  await db.doc('ledger/archive-credit').set({ propertyId: 'archive-test', tenantId: 'b', amount: 10, type: 'credit', status: 'completed' });
  await assert.rejects(editProperty(db, 'admin', 'archive-test', { ...base, units: [unit], archived: true }), /financial/);
  await db.doc('ledger/archive-credit').update({ tenantId: 'a' });
  await db.doc('maintenanceRequests/archive-open').set({ propertyId: 'archive-test', status: 'in_progress' });
  await assert.rejects(editProperty(db, 'admin', 'archive-test', { ...base, units: [unit], archived: true }), /maintenance/);
  await db.doc('maintenanceRequests/archive-open').update({ status: 'completed' });
  await editProperty(db, 'admin', 'archive-test', { ...base, units: [{ ...unit, archived: true }], archived: true });
  const saved = (await db.doc('properties/archive-test').get()).data()!;
  assert.equal(saved.available, false); assert.equal(saved.units[0].id, 'stable-unit');
  await assert.rejects(activateLease(db, auth, 'admin', { ...terms, operationId: 'archived-lease-12345', propertyId: 'archive-test', unitId: 'stable-unit' }), /Archived/);
  await editProperty(db, 'admin', 'archive-test', { ...base, units: [unit], archived: false });
  assert.equal((await db.doc('properties/archive-test').get()).data()?.available, true);
  await assert.rejects(editProperty(db, 'admin', 'one', { ...base, archived: true }), /Leased|leases/);
});

test('work orders persist scheduling and bind invoices exactly once without treating them as paid', async () => {
  const { updateWorkOrder } = await import('../lib/maintenanceOperations');
  await db.doc('maintenanceRequests/work-order').set({ propertyId: 'one', tenantId: 'tenant', title: 'Repair leak', status: 'submitted', fileIds: [] });
  const input = { requestId: 'work-order', operationId: 'schedule-work-order-123', status: 'in_progress', technicianName: 'Test Vendor', vendorPhone: '555-0100', scheduledDate: '2026-09-20', scheduledTime: '10:30', timeZone: 'America/Chicago' };
  await assert.rejects(updateWorkOrder(db, 'owner', input), /Admin/);
  await updateWorkOrder(db, 'admin', input);
  const saved = (await db.doc('maintenanceRequests/work-order').get()).data()!;
  assert.equal(saved.scheduledTime, '10:30'); assert.equal(saved.assignedVendorName, 'Test Vendor');
  await db.doc('fileAttachments/invoice-test').set({ createdBy: 'admin', propertyId: 'one', kind: 'expense', boundTo: null });
  const complete = { ...input, operationId: 'complete-work-order-123', status: 'completed', actualCost: 125.50, adminNotes: 'Repaired', fileIds: ['invoice-test'] };
  const results = await Promise.all([updateWorkOrder(db, 'admin', complete), updateWorkOrder(db, 'admin', complete)]);
  assert.equal(results.filter(r => r.changed).length, 1);
  const expense = (await db.doc('landlordExpenses/maintenance-work-order').get()).data()!;
  assert.equal(expense.amount, 125.50); assert.equal(expense.status, 'approved');
  assert.equal((await db.doc('fileAttachments/invoice-test').get()).data()?.boundTo, 'landlordExpenses/maintenance-work-order');
  await assert.rejects(updateWorkOrder(db, 'admin', { ...complete, operationId: 'change-cost-work-order', actualCost: 130 }), /Reconcile/);
  assert.equal((await db.doc('maintenanceRequests/work-order').get()).data()?.adminNotes, 'Repaired');
});

test('attachment bindings enforce uploader, purpose, record and current ownership', async () => {
  const { attachmentRefs, readableAttachment, authorizeUpload } = await import('../lib/attachments');
  await db.doc('fileAttachments/private-test').set({ createdBy: 'tenant', propertyId: 'one', kind: 'maintenance', boundTo: null });
  await authorizeUpload(db, 'tenant', 'maintenance', 'one');
  await assert.rejects(authorizeUpload(db, 'tenant', 'lease', 'one'), /denied/);
  await assert.rejects(authorizeUpload(db, 'owner', 'expense', 'two'), /denied/);
  await assert.rejects(readableAttachment(db, 'owner', 'private-test'), /denied/);
  const bind = (uid: string, kind: any, propertyId: string, path: string) => db.runTransaction(async tx => {
    const refs = await attachmentRefs(tx, db, ['private-test'], uid, kind, propertyId, path);
    for (const ref of refs) tx.update(ref, { boundTo: path });
  });
  await assert.rejects(bind('owner', 'maintenance', 'one', 'maintenanceRequests/private-ticket'));
  await assert.rejects(bind('tenant', 'expense', 'one', 'maintenanceRequests/private-ticket'));
  await assert.rejects(bind('tenant', 'maintenance', 'two', 'maintenanceRequests/private-ticket'));
  await db.doc('maintenanceRequests/private-ticket').set({ propertyId: 'one', tenantId: 'tenant', status: 'submitted', fileIds: ['private-test'] });
  await bind('tenant', 'maintenance', 'one', 'maintenanceRequests/private-ticket');
  await readableAttachment(db, 'tenant', 'private-test'); await readableAttachment(db, 'owner', 'private-test');
  await assert.rejects(bind('tenant', 'maintenance', 'one', 'maintenanceRequests/other'));
  await assert.rejects(readableAttachment(db, 'owner-b', 'private-test'));
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(), 'fileAttachments/forged'), { createdBy: 'tenant' }));
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(), 'maintenanceRequests/forged-direct'), { tenantId: 'tenant', propertyId: 'one' }));
});

test('private upload HTTP, downloads, discard and preference saves work with emulator authentication', async () => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  const bucketName = `${projectId}.appspot.com`; process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = bucketName;
  const upload = (await import('../pages/api/files/upload')).default;
  const file = (await import('../pages/api/files/[id]')).default;
  const preferences = (await import('../pages/api/notifications/preferences')).default;
  const { shouldSendNotification } = await import('../lib/notifications');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const nextReq = Object.assign(req, { query: Object.fromEntries(url.searchParams), body: {} });
    if (url.pathname === '/preferences' && req.method === 'PUT') { const chunks = []; for await (const chunk of req) chunks.push(chunk); nextReq.body = JSON.parse(Buffer.concat(chunks).toString()); }
    const nextRes = Object.assign(res, { status(code: number) { res.statusCode = code; return this; }, json(body: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return this; } });
    await (url.pathname === '/upload' ? upload : url.pathname === '/preferences' ? preferences : file)(nextReq as any, nextRes as any);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const login = async (uid: string) => {
      const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.com`, password: 'Emulator-only-123!', returnSecureToken: true }) });
      const body = await response.json() as any; return { Authorization: `Bearer ${body.idToken}` };
    };
    const tenant = await login('tenant'); const owner = await login('owner');
    const payload = Buffer.from('%PDF-1.4 Insurance evidence');
    const response = await fetch(`${base}/upload?kind=insurance&name=policy.pdf`, { method: 'POST', headers: { ...tenant, 'Content-Type': 'application/pdf' }, body: payload });
    assert.equal(response.status, 201, await response.clone().text());
    const { id } = await response.json() as any;
    assert.deepEqual(Buffer.from(await (await fetch(`${base}/file?id=${id}`, { headers: tenant })).arrayBuffer()), payload);
    assert.equal((await fetch(`${base}/file?id=${id}`, { headers: owner })).status, 403);
    const metadata = (await db.doc(`fileAttachments/${id}`).get()).data()!;
    await assertFails(getBytes(ref(env.authenticatedContext('tenant').storage(`gs://${bucketName}`), metadata.storagePath)));
    assert.equal((await fetch(`${base}/upload?kind=insurance`, { method: 'POST', headers: { ...tenant, 'Content-Type': 'application/pdf' }, body: '<script>' })).status, 400);
    const saved = await fetch(`${base}/preferences`, { method: 'PUT', headers: { ...tenant, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: { notesAdded: false }, push: { enabled: false } }) });
    assert.equal(saved.status, 200);
    const prefs = (await (await fetch(`${base}/preferences`, { headers: tenant })).json() as any).preferences;
    assert.equal(shouldSendNotification(prefs, 'email', 'notesAdded'), false);
    assert.equal(shouldSendNotification(prefs, 'email', 'statusChanges'), true);
    assert.equal(shouldSendNotification(prefs, 'push', 'statusChanges'), false);
    assert.equal((await fetch(`${base}/preferences`, { method: 'PUT', headers: { ...tenant, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: { rentReminders: false } }) })).status, 400);
    assert.equal((await fetch(`${base}/file?id=${id}`, { method: 'DELETE', headers: tenant })).status, 200);
    assert.equal((await db.doc(`fileAttachments/${id}`).get()).exists, false);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});


test('notification queue retries failures, suppresses opt-outs, survives leases and deduplicates in-app delivery', async () => {
  const { processNotifications } = await import('../lib/notificationQueue');
  const now = Date.now() + 1000000;
  // Isolate worker candidates from earlier workflow fixtures.
  for (const row of (await db.collection('notificationJobs').get()).docs) await row.ref.delete();
  await db.doc('notificationPreferences/tenant').set({ email: { enabled: true }, push: { enabled: false }, inApp: { enabled: true } });
  const base = { userId: 'tenant', event: 'statusChanges', requestId: 'work-order', title: 'Test update', message: 'Updated', type: 'status_change', attempts: 0, status: 'pending', nextAttemptAt: now };
  await db.doc('notificationJobs/retry-test').set({ ...base, channel: 'email' });
  await db.doc('notificationJobs/suppressed-test').set({ ...base, channel: 'push' });
  await db.doc('notificationJobs/inapp-test').set({ ...base, channel: 'inApp' });
  let sends = 0;
  const first = await processNotifications(db, async () => { sends++; return false; }, now);
  assert.deepEqual(first, { sent: 1, skipped: 1, retry: 1, failed: 0 }); assert.equal(sends, 1);
  await processNotifications(db, async () => { sends++; return true; }, now + 29999); assert.equal(sends, 1);
  const competing = await Promise.all([processNotifications(db, async () => { sends++; return true; }, now + 30000), processNotifications(db, async () => { sends++; return true; }, now + 30000)]);
  assert.equal(sends, 2); assert.equal(competing.reduce((sum, r) => sum + r.sent, 0), 1);
  await db.doc('notifications/inapp-test').update({ read: true });
  await db.doc('notificationJobs/inapp-test').update({ status: 'processing', nextAttemptAt: now, claimId: 'crashed-worker' });
  await processNotifications(db, async () => true, now + 50000);
  assert.equal((await db.doc('notifications/inapp-test').get()).data()?.read, true);
  await db.doc('notificationJobs/exhausted-test').set({ ...base, channel: 'email', attempts: 7 });
  await processNotifications(db, async () => false, now + 50000);
  assert.equal((await db.doc('notificationJobs/exhausted-test').get()).data()?.status, 'failed');
  assert.equal((await db.doc('notificationJobs/exhausted-test').get()).data()?.nextAttemptAt, undefined);
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(), 'notificationJobs/forged'), base));
});

test('seven-day staged-upload cleanup is dry-run by default and retries failed deletes without allowing binding', async () => {
  const { cleanupUploads, UPLOAD_RETENTION_MS } = await import('../lib/uploadCleanup');
  const { attachmentRefs } = await import('../lib/attachments');
  const now = Date.now(); const old = { createdBy: 'tenant', kind: 'maintenance', propertyId: 'one', createdAt: now - UPLOAD_RETENTION_MS - 1, boundTo: null };
  await db.doc('fileAttachments/cleanup-old').set({ ...old, storagePath: 'privateAttachments/tenant/cleanup-old' });
  await db.doc('fileAttachments/cleanup-bound').set({ ...old, boundTo: 'maintenanceRequests/private-ticket', storagePath: 'privateAttachments/tenant/cleanup-bound' });
  await db.doc('fileAttachments/cleanup-new').set({ ...old, createdAt: now, storagePath: 'privateAttachments/tenant/cleanup-new' });
  let deletes = 0;
  assert.equal((await cleanupUploads(db, async () => { deletes++; }, false, now)).candidates, 1); assert.equal(deletes, 0);
  assert.equal((await cleanupUploads(db, async () => { throw new Error('Unavailable'); }, true, now)).failed, 1);
  await assert.rejects(db.runTransaction(tx => attachmentRefs(tx, db, ['cleanup-old'], 'tenant', 'maintenance', 'one', 'maintenanceRequests/new')));
  assert.equal((await cleanupUploads(db, async () => { deletes++; }, true, now)).deleted, 1);
  assert.equal(deletes, 1); assert.equal((await db.doc('fileAttachments/cleanup-bound').get()).exists, true);
  assert.equal((await db.doc('fileAttachments/cleanup-new').get()).exists, true);
});

test('legacy migration verifies private copies, updates references and rejects external sources', async () => {
  const { migrateAttachment, legacyStoragePath } = await import('../lib/attachmentMigration');
  const bucket = getStorage(app).bucket(`${projectId}.appspot.com`);
  assert.throws(() => legacyStoragePath('https://example.com/document.pdf', bucket.name));
  assert.throws(() => legacyStoragePath('https://storage.googleapis.com/other-bucket/doc.pdf', bucket.name));
  const source = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 Policy evidence').toString('base64');
  await db.doc('users/migrate-tenant').set({ role: 'tenant', rentersInsurance: { provider: 'Test', verified: false, documentUrl: source } });
  const dry = await migrateAttachment(db, bucket, 'admin', 'users/migrate-tenant');
  assert.equal(dry.applied, false); assert.equal((await db.doc(`fileAttachments/${dry.id}`).get()).exists, false);
  const applied = await migrateAttachment(db, bucket, 'admin', 'users/migrate-tenant', 0, true);
  assert.equal(applied.sha256, dry.sha256);
  const record = (await db.doc('users/migrate-tenant').get()).data()!;
  assert.deepEqual(record.rentersInsurance.fileIds, [applied.id]); assert.equal(record.rentersInsurance.verified, false);
  assert.equal(record.rentersInsurance.documentUrl, '');
  const { readableAttachment } = await import('../lib/attachments');
  await readableAttachment(db, 'migrate-tenant', applied.id);
  await assert.rejects(readableAttachment(db, 'owner', applied.id));
});

test('notification APIs use named Admin services and enforce recipient isolation', async () => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  const unread = (await import('../pages/api/notifications/get-unread')).default;
  const markRead = (await import('../pages/api/notifications/mark-read')).default;
  const register = (await import('../pages/api/notifications/register-fcm-token')).default;
  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tenant@example.com', password: 'Emulator-only-123!', returnSecureToken: true })
  });
  const { idToken } = await login.json() as { idToken: string };
  assert.ok(idToken);
  await db.doc('notifications/api-own').set({ userId: 'tenant', read: false, createdAt: Date.now(), title: 'Own' });
  await db.doc('notifications/api-other').set({ userId: 'owner', read: false, createdAt: Date.now(), title: 'Other' });
  let status = 0; let body: any;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { body = value; return this; } };
  const headers = { authorization: `Bearer ${idToken}` };
  await unread({ method: 'GET', headers: {}, query: {} } as any, res as any);
  assert.equal(status, 401);
  await unread({ method: 'GET', headers, query: {} } as any, res as any);
  assert.equal(status, 200); assert.ok(body.notifications.some((n: any) => n.id === 'api-own'));
  assert.ok(body.notifications.every((n: any) => n.userId === 'tenant'));
  await unread({ method: 'GET', headers, query: { limit: '-1' } } as any, res as any);
  assert.equal(status, 400);
  await markRead({ method: 'POST', headers, body: { notificationId: 'api-other' } } as any, res as any);
  assert.equal(status, 403); assert.equal((await db.doc('notifications/api-other').get()).data()?.read, false);
  await markRead({ method: 'POST', headers, body: { notificationId: 'api-own' } } as any, res as any);
  assert.equal(status, 200); assert.equal(body.markedCount, 1);
  assert.equal((await db.doc('notifications/api-own').get()).data()?.read, true);
  await register({ method: 'POST', headers, body: { token: 'emulator-token', deviceInfo: 'Test device', userId: 'owner' } } as any, res as any);
  assert.equal(status, 200); assert.equal((await db.doc('fcmTokens/tenant').get()).data()?.token, 'emulator-token');
  assert.equal((await db.doc('fcmTokens/owner').get()).exists, false);
});
