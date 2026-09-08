import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { applyTenantDirectory, previewTenantDirectory, listTenantDirectory } from '../lib/ghlTenantDirectory';
import type { TenantSource } from '../lib/ghlTenantEligibility';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const projectId = 'demo-nlr-integrity';
const app = initializeApp({ projectId }, 'directory-tests');
const db = getFirestore(app);
const auth = getAuth(app);
let env: RulesTestEnvironment;
let now = Date.parse('2026-09-07T15:00:00Z');
const original: TenantSource = { locationId: 'loc', objectKey: 'custom_objects.houses', properties: [
  { id: 'house', name: 'One Test Home', address: '1 Test Street', status: 'occupied' }
], contacts: [
  { id: 'c1', name: 'Resident One', email: 'directory-one@example.com', phone: null, active: true, leaseChecked: true, propertyIds: ['house'] },
  { id: 'c2', name: 'Resident Two', email: null, phone: null, active: true, leaseChecked: false, propertyIds: ['house'] },
  { id: 'excluded', name: 'Not a tenant', email: null, phone: null, active: true, leaseChecked: false, propertyIds: [] }
] };
let source = structuredClone(original);
const deps = { db, auth, readSource: async () => structuredClone(source), now: () => now };

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firestore.rules', 'utf8') } });
  await env.clearFirestore();
  for (const role of ['admin', 'tenant', 'landlord']) {
    await db.doc(`users/directory-${role}`).set({ role });
    try { await auth.createUser({ uid: `directory-${role}`, email: `directory-${role}@example.com`, password: 'Emulator-only-123!' }); } catch (error: any) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
  }
  await db.doc('users/ghl-c1').set({ role: 'tenant', ghlContactId: 'c1', email: original.contacts[0].email, propertyIds: ['existing-house'] });
  await db.doc('properties/existing-house').set({ name: 'Original', ghlObjectId: 'house', landlordId: 'keep-owner', rent: 1700, images: ['keep-image'] });
  await db.doc('ledger/keep').set({ tenantId: 'ghl-c1', amount: 25 });
  await db.doc('leases/keep').set({ propertyId: 'existing-house', tenantId: 'ghl-c1', isActive: true, status: 'active' });
});
after(async () => { await env.cleanup(); await Promise.all(getApps().map(a => deleteApp(a))); });

test('preview, selected atomic apply, retry and legacy reconciliation preserve operational records', async () => {
  const beforeUsers = (await db.collection('users').get()).docs.map(d => d.data());
  const beforeAuth = (await auth.listUsers()).users.map(u => u.uid);
  const preview = await previewTenantDirectory(deps, 'directory-admin');
  assert.equal(preview.counts.create, 2);
  assert.equal(preview.counts.excluded, 1);
  assert.equal(preview.rows.find(r => r.contactId === 'c2')?.warnings.length, 2);
  assert.equal((await db.collection('ghlTenantDirectory').get()).size, 0);
  assert.equal((await db.doc('properties/existing-house').get()).data()?.status, undefined);
  await assert.rejects(applyTenantDirectory(deps, 'directory-tenant', preview.previewId, ['c1']), /not found/);
  await assert.rejects(applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['excluded']), /non-actionable/);
  const failingDb = new Proxy(db, { get(target, key) {
    if (key === 'runTransaction') return (callback: any) => target.runTransaction(tx => {
      let writes = 0;
      const failingTx = new Proxy(tx, { get(transaction, method) {
        if (method === 'set') return (...args: any[]) => { if (++writes === 2) throw new Error('Injected write failure'); return (transaction.set as any)(...args); };
        const value = (transaction as any)[method]; return typeof value === 'function' ? value.bind(transaction) : value;
      } });
      return callback(failingTx);
    });
    const value = (target as any)[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  await assert.rejects(applyTenantDirectory({ ...deps, db: failingDb }, 'directory-admin', preview.previewId, ['c1']), /Injected/);
  assert.equal((await db.collection('ghlTenantDirectory').get()).size, 0);
  assert.equal((await db.doc('properties/existing-house').get()).data()?.status, undefined);
  await applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c1']);
  await Promise.all([applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c2']), applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c2'])]);
  assert.equal((await db.collection('ghlTenantDirectory').get()).size, 2);
  const property = (await db.doc('properties/existing-house').get()).data()!;
  assert.equal(property.status, 'occupied'); assert.equal(property.available, false);
  assert.equal(property.rent, 1700); assert.equal(property.landlordId, 'keep-owner'); assert.deepEqual(property.images, ['keep-image']);
  assert.deepEqual((await db.collection('users').get()).docs.map(d => d.data()), beforeUsers);
  assert.deepEqual((await auth.listUsers()).users.map(u => u.uid), beforeAuth);
  assert.equal((await db.collection('ledger').get()).size, 1); assert.equal((await db.collection('leases').get()).size, 1);
  const directory = await listTenantDirectory(deps);
  assert.equal(directory.legacy.length, 0);
  assert.equal(directory.entries.every((e: any) => !e.hasPortalAccount), true);
  assert.equal((await previewTenantDirectory(deps, 'directory-admin')).counts.unchanged, 2);
});

test('expired previews, source changes, local edits and incomplete reads cannot apply or deactivate', async () => {
  source.contacts[0].name = 'Updated Name';
  let preview = await previewTenantDirectory(deps, 'directory-admin');
  now += 16 * 60_000;
  await assert.rejects(applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c1']), /expired/);
  preview = await previewTenantDirectory(deps, 'directory-admin');
  source.contacts[0].name = 'Changed Again';
  await assert.rejects(applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c1']), /GHL data changed/);
  preview = await previewTenantDirectory(deps, 'directory-admin');
  await db.doc('properties/existing-house').update({ rent: 1800 });
  await assert.rejects(applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c1']), /App data changed/);
  const runs = (await db.collection('ghlImportRuns').get()).size;
  await assert.rejects(previewTenantDirectory({ ...deps, readSource: async () => { throw new Error('Incomplete relations'); } }, 'directory-admin'), /Incomplete/);
  assert.equal((await db.collection('ghlImportRuns').get()).size, runs);
  assert.equal((await db.doc('ghlTenantDirectory/loc_c1').get()).data()?.name, 'Resident One');
});

test('role, email, multiple properties and app assignment conflicts block import', async () => {
  await db.doc('users/role-conflict').set({ role: 'landlord', ghlContactId: 'c2' });
  let preview = await previewTenantDirectory(deps, 'directory-admin');
  assert.equal(preview.rows.find(r => r.contactId === 'c2')?.action, 'conflict');
  await db.doc('users/role-conflict').delete();
  source.contacts[1].email = source.contacts[0].email;
  preview = await previewTenantDirectory(deps, 'directory-admin');
  assert.equal(preview.counts.conflict, 2);
  source.contacts[1].email = null;
  await db.doc('users/ghl-c1').update({ propertyIds: ['different-property'] });
  preview = await previewTenantDirectory(deps, 'directory-admin');
  assert.equal(preview.rows.find(r => r.contactId === 'c1')?.action, 'conflict');
  await db.doc('users/ghl-c1').update({ propertyIds: ['existing-house'] });
});

test('complete removal deactivates only selected directory entries and preserves property access', async () => {
  source.contacts = source.contacts.filter(c => c.id !== 'c1');
  const preview = await previewTenantDirectory(deps, 'directory-admin');
  assert.equal(preview.rows.find(r => r.contactId === 'c1')?.action, 'deactivate');
  await applyTenantDirectory(deps, 'directory-admin', preview.previewId, ['c1']);
  assert.equal((await db.doc('ghlTenantDirectory/loc_c1').get()).data()?.status, 'inactive');
  assert.deepEqual((await db.doc('users/ghl-c1').get()).data()?.propertyIds, ['existing-house']);
  assert.equal((await db.doc('properties/existing-house').get()).data()?.status, 'occupied');
});

test('directory and review snapshots are private; direct writes are denied even for admins', async () => {
  for (const client of [env.unauthenticatedContext().firestore(), env.authenticatedContext('directory-tenant').firestore(), env.authenticatedContext('directory-landlord').firestore()]) {
    await assertFails(getDoc(doc(client, 'ghlTenantDirectory/loc_c1')));
    await assertFails(setDoc(doc(client, 'ghlTenantDirectory/forged'), { status: 'active' }));
  }
  const admin = env.authenticatedContext('directory-admin').firestore();
  await assertSucceeds(getDoc(doc(admin, 'ghlTenantDirectory/loc_c1')));
  await assertFails(setDoc(doc(admin, 'ghlTenantDirectory/forged'), { status: 'active' }));
  await assertFails(getDoc(doc(admin, 'ghlImportRuns/private')));
});

test('API denies anonymous, invalid tokens, non-admins and bypass parameters before GHL reads', async () => {
  const handler = (await import('../pages/api/admin/import-tenants')).default;
  const invoke = async (authorization?: string, body: unknown = {}) => {
    let status = 0;
    const res = { setHeader() {}, status(code: number) { status = code; return this; }, json(data: unknown) { return data; } };
    await handler({ method: 'POST', headers: { authorization }, body } as any, res as any);
    return status;
  };
  assert.equal(await invoke(), 401); assert.equal(await invoke('Bearer invalid'), 401);
  async function tokenFor(uid: string) {
    const customToken = await auth.createCustomToken(uid);
    const result = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
    return `Bearer ${(await result.json()).idToken}`;
  }
  assert.equal(await invoke(await tokenFor('directory-tenant')), 403);
  assert.equal(await invoke(await tokenFor('directory-admin'), { tag: 'anything' }), 400);
  assert.equal(await invoke(await tokenFor('directory-admin'), { action: 'apply', previewId: '../bad', contactIds: [] }), 400);
});
