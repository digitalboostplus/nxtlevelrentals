import { randomBytes } from 'node:crypto';
import type { Auth, UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { directoryHash, planRows } from './ghlTenantDirectory';
import type { TenantSource } from './ghlTenantEligibility';

type Dependencies = { db: Firestore; auth: Auth };
type AccountRow = { contactId: string; uid: string | null; email: string | null; name: string; propertyId: string | null; action: 'create' | 'ready' | 'resume' | 'blocked'; reason: string; directoryId: string };
const emailKey = (email?: string | null) => (email || '').trim().toLowerCase();
const auditId = (location: string, contact: string) => `account_${directoryHash([location, contact]).slice(0, 40)}`;

async function snapshot({ db, auth }: Dependencies) {
  const snapshots = await Promise.all(['users', 'properties', 'ghlTenantDirectory', 'leases'].map(n => db.collection(n).get()));
  const docs = snapshots.map(s => s.docs.map(d => ({ id: d.id, data: d.data() })));
  const accounts: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    accounts.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return { target: { users: docs[0], properties: docs[1], directory: docs[2], leases: docs[3] }, accounts };
}

/** Preview is read-only. Existing identities are never matched or merged just by email. */
export async function previewTenantAccounts(deps: Dependencies, source: TenantSource): Promise<AccountRow[]> {
  const { target, accounts } = await snapshot(deps);
  const planned = planRows(source, target, new Set(accounts.filter(a => !a.disabled).map(a => a.uid)));
  const rows: AccountRow[] = [];
  for (const row of planned) {
    const contact = source.contacts.find(c => c.id === row.contactId);
    if (!contact) continue;
    const directory = target.directory.find(d => d.id === row.directoryId);
    const users = target.users.filter(u => u.data.ghlContactId === row.contactId);
    const uid = users[0]?.id || `ghl-${row.contactId}`;
    const existing = accounts.find(a => a.uid === uid);
    const sameEmail = accounts.filter(a => emailKey(a.email) === emailKey(contact.email));
    const audit = (await deps.db.doc(`ghlImportRuns/${auditId(source.locationId, contact.id)}`).get()).data();
    let reason = '';
    if (!['create', 'update', 'unchanged'].includes(row.action) || row.reasons.length) reason = row.reasons.join('; ') || 'Contact is not eligible';
    else if (!directory || directory.data.status !== 'active' || directory.data.propertyId !== row.propertyId) reason = 'Apply the directory import first';
    else if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) reason = 'Missing or invalid email';
    else if (users.length > 1) reason = 'Duplicate app profiles';
    else if (target.users.some(u => u.id === uid && u.data.ghlContactId !== contact.id)) reason = 'UID belongs to another app profile';
    else if (sameEmail.some(a => a.uid !== uid)) reason = 'Email belongs to another Firebase account';
    else if (existing && emailKey(existing.email) !== emailKey(contact.email)) reason = 'Existing account email differs';
    else if (existing?.customClaims && Object.entries(existing.customClaims).some(([key, value]) => key !== 'role' || value !== 'tenant')) reason = 'Existing account claims need review';
    else if (existing?.disabled && !(audit?.uid === uid && audit?.email === contact.email && audit?.state === 'prepared')) reason = 'Existing account is disabled';
    const ready = existing && !existing.disabled && users[0]?.data.role === 'tenant' && users[0]?.data.propertyIds?.length === 1 && users[0]?.data.propertyIds[0] === row.propertyId && directory?.data.linkedUserUid === uid;
    rows.push({ contactId: contact.id, uid: reason ? null : uid, email: contact.email, name: contact.name, propertyId: row.propertyId,
      directoryId: row.directoryId, action: reason ? 'blocked' : ready ? 'ready' : existing ? 'resume' : 'create', reason });
  }
  return rows;
}

/** Creates a disabled account first; grants access only after the profile transaction succeeds. */
export async function provisionTenantAccount(deps: Dependencies, source: TenantSource, contactId: string, operator: string) {
  const row = (await previewTenantAccounts(deps, source)).find(r => r.contactId === contactId);
  if (!row || row.action === 'blocked' || !row.uid || !row.email || !row.propertyId) throw new Error(row?.reason || 'Contact is not eligible');
  if (row.action === 'ready') return { contactId, uid: row.uid, status: 'ready' };
  const { db, auth } = deps;
  const uid = row.uid;
  const auditRef = db.doc(`ghlImportRuns/${auditId(source.locationId, contactId)}`);
  const userRef = db.doc(`users/${uid}`);
  const directoryRef = db.doc(`ghlTenantDirectory/${row.directoryId}`);
  let account: UserRecord | undefined;
  try { account = await auth.getUser(uid); } catch (error: any) { if (error.code !== 'auth/user-not-found') throw error; }
  const created = !account;
  if (!account) {
    await auditRef.set({ state: 'prepared', uid, email: row.email, contactId, operator, preparedAt: new Date().toISOString() });
    // A unique, unrecorded password avoids shared credentials. Tenant sets their own via reset.
    account = await auth.createUser({ uid, email: row.email, displayName: row.name, disabled: true, emailVerified: false, password: randomBytes(48).toString('base64url') });
  }
  try {
    await db.runTransaction(async tx => {
      const [user, directory, property, userMatches] = await Promise.all([
        tx.get(userRef), tx.get(directoryRef), tx.get(db.doc(`properties/${row.propertyId}`)),
        tx.get(db.collection('users')),
      ]);
      const old = user.data();
      const entry = directory.data();
      if (!entry || entry.status !== 'active' || entry.ghlContactId !== contactId || entry.email !== row.email || entry.propertyId !== row.propertyId) throw new Error('Directory changed; preview again');
      if (!property.exists || property.data()?.status !== 'occupied' || property.data()?.archived || property.data()?.units?.length) throw new Error('Property changed; preview again');
      if (old && (old.role !== 'tenant' || old.ghlContactId !== contactId || (old.propertyIds || []).some((id: string) => id !== row.propertyId))) throw new Error('App identity changed; preview again');
      if (userMatches.docs.some(d => d.id !== uid && (d.data().ghlContactId === contactId || emailKey(d.data().email) === row.email))) throw new Error('Duplicate app identity; preview again');
      const now = new Date().toISOString();
      tx.set(userRef, { role: 'tenant', email: row.email, displayName: row.name, ghlContactId: contactId,
        propertyIds: [row.propertyId], updatedAt: now, ...(user.exists ? {} : { createdAt: now, source: 'ghl' }) }, { merge: true });
      tx.update(directoryRef, { linkedUserUid: uid, legacyUserIds: [uid] });
      // Keep prepared until Auth is enabled; a failed enable is safely resumable.
      tx.set(auditRef, { state: 'prepared', uid, email: row.email, contactId, operator, profileWrittenAt: now }, { merge: true });
    });
    if (account.disabled) await auth.updateUser(uid, { disabled: false });
    await auditRef.set({ state: 'ready', completedAt: new Date().toISOString() }, { merge: true });
    return { contactId, uid, status: created ? 'created' : 'linked' };
  } catch (error) {
    // Newly created accounts stay disabled if assignment fails. Do not delete identities or reset existing credentials.
    throw error;
  }
}

/** Pull identity and occupancy for all properties; retain app-owned financial and ownership data. */
export async function syncPropertyDirectory(db: Firestore, source: TenantSource, apply = false) {
  return db.runTransaction(async tx => {
    const current = await tx.get(db.collection('properties'));
    const plans = source.properties.map(property => {
      if (!property.name || !property.address || !['occupied', 'vacant', 'maintenance'].includes(property.status)) throw new Error('Unknown property identity or occupancy');
      const matches = current.docs.filter(d => d.data().ghlObjectId === property.id || d.id === `ghl-${property.id}`);
      if (matches.length > 1) throw new Error('Duplicate GHL property');
      const old = matches[0];
      if (old && ((!old.data().ghlObjectId && old.data().source !== 'ghl') || old.data().archived || old.data().units?.length || (old.data().status === 'maintenance' && property.status !== 'maintenance'))) throw new Error('Property needs manual review');
      const data = { name: property.name, address: property.address, ghlObjectId: property.id, ghlObjectKey: source.objectKey,
        source: 'ghl', status: property.status, available: property.status === 'vacant' };
      const changed = !old || Object.entries(data).some(([key, value]) => old.data()[key] !== value);
      return { id: old?.id || `ghl-${property.id}`, data, changed, exists: !!old };
    });
    if (apply) for (const plan of plans.filter(p => p.changed)) tx.set(db.doc(`properties/${plan.id}`), {
      ...plan.data, updatedAt: new Date().toISOString(), ...(plan.exists ? {} : { createdAt: new Date().toISOString() }),
    }, { merge: true });
    return { total: plans.length, changed: plans.filter(p => p.changed).length, applied: apply };
  });
}
