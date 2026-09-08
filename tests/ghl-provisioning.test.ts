import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { previewTenantAccounts, provisionTenantAccount, syncPropertyDirectory } from '../lib/ghlTenantProvisioning';
import type { TenantSource } from '../lib/ghlTenantEligibility';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required');
const app = initializeApp({ projectId: 'demo-nlr-integrity' }, 'provision-tests');
const db = getFirestore(app), auth = getAuth(app);
const deps = { db, auth };
after(() => deleteApp(app));

async function fixture(id: string) {
  const source: TenantSource = { locationId: 'provision', objectKey: 'custom_objects.houses', properties: [{ id, name: id, address: `${id} Test Street`, status: 'occupied' }], contacts: [{ id, name: id, email: `${id}@example.com`, phone: null, active: true, leaseChecked: true, propertyIds: [id] }] };
  await db.doc(`properties/ghl-${id}`).set({ ghlObjectId: id, source: 'ghl', name: id, address: `${id} Test Street`, status: 'occupied', available: false, landlordId: 'keep-owner', rent: 1900, images: ['keep'] });
  await db.doc(`ghlTenantDirectory/provision_${id}`).set({ ghlContactId: id, propertyId: `ghl-${id}`, status: 'active', email: `${id}@example.com` });
  return source;
}

test('provision legacy UID, preserve history, and replay without duplicate accounts', async () => {
  const source = await fixture('provision-legacy');
  const uid = 'ghl-provision-legacy';
  await db.doc(`users/${uid}`).set({ role: 'tenant', ghlContactId: 'provision-legacy', balance: 123, propertyIds: [], phone: 'keep' });
  const before = await auth.listUsers();
  assert.equal((await previewTenantAccounts(deps, source))[0].action, 'create');
  assert.equal((await auth.listUsers()).users.length, before.users.length);
  await provisionTenantAccount(deps, source, 'provision-legacy', 'test-admin');
  const user = await auth.getUser(uid);
  assert.equal(user.disabled, false);
  assert.equal(user.emailVerified, false);
  assert.equal(user.email, 'provision-legacy@example.com');
  const profile = (await db.doc(`users/${uid}`).get()).data()!;
  assert.equal(profile.balance, 123); assert.equal(profile.phone, 'keep');
  assert.deepEqual(profile.propertyIds, ['ghl-provision-legacy']);
  assert.equal((await provisionTenantAccount(deps, source, 'provision-legacy', 'test-admin')).status, 'ready');
  assert.equal((await auth.listUsers()).users.length, before.users.length + 1);
});

test('email collision, missing email, and disabled pre-existing account are blocked', async () => {
  const source = await fixture('provision-collision');
  await auth.createUser({ uid: 'unrelated-existing', email: 'provision-collision@example.com' });
  assert.match((await previewTenantAccounts(deps, source))[0].reason, /another Firebase account/);
  await assert.rejects(provisionTenantAccount(deps, source, 'provision-collision', 'admin'), /another Firebase account/);
  source.contacts[0].email = null;
  assert.match((await previewTenantAccounts(deps, source))[0].reason, /email/);
  const disabled = await fixture('provision-disabled');
  await auth.createUser({ uid: 'ghl-provision-disabled', email: 'provision-disabled@example.com', disabled: true });
  assert.match((await previewTenantAccounts(deps, disabled))[0].reason, /disabled/);
});

test('profile transaction failure leaves account disabled and allows safe recovery', async () => {
  const source = await fixture('provision-retry');
  const failingDb = new Proxy(db, { get(target, key) {
    if (key === 'runTransaction') return async () => { throw new Error('Injected transaction failure'); };
    const value = (target as any)[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  await assert.rejects(provisionTenantAccount({ db: failingDb, auth }, source, 'provision-retry', 'admin'), /Injected/);
  assert.equal((await auth.getUser('ghl-provision-retry')).disabled, true);
  assert.equal((await db.doc('users/ghl-provision-retry').get()).exists, false);
  await provisionTenantAccount(deps, source, 'provision-retry', 'admin');
  assert.equal((await auth.getUser('ghl-provision-retry')).disabled, false);
  assert.equal((await previewTenantAccounts(deps, source))[0].action, 'ready');
});

test('property sync preserves ownership, money and images; unknown occupancy aborts all writes', async () => {
  const source = await fixture('provision-property');
  source.properties[0].status = 'vacant';
  await syncPropertyDirectory(db, source, false);
  assert.equal((await db.doc('properties/ghl-provision-property').get()).data()?.status, 'occupied');
  await syncPropertyDirectory(db, source, true);
  const property = (await db.doc('properties/ghl-provision-property').get()).data()!;
  assert.equal(property.status, 'vacant'); assert.equal(property.available, true);
  assert.equal(property.rent, 1900); assert.equal(property.landlordId, 'keep-owner'); assert.deepEqual(property.images, ['keep']);
  assert.equal((await syncPropertyDirectory(db, source, true)).changed, 0);
  source.properties.push({ id: 'bad', name: 'Bad', address: 'Bad Street', status: 'unknown' });
  source.properties[0].status = 'occupied';
  await assert.rejects(syncPropertyDirectory(db, source, true), /Unknown/);
  assert.equal((await db.doc('properties/ghl-provision-property').get()).data()?.status, 'vacant');
});
