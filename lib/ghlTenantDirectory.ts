import { createHash } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { tenantEligibility, type TenantSource } from './ghlTenantEligibility';
import { readTenantSource } from './ghlTenantSource';

export type DirectoryRow = {
  contactId: string; name: string; email: string | null; propertyName: string;
  action: 'create' | 'update' | 'unchanged' | 'deactivate' | 'excluded' | 'conflict';
  reasons: string[]; warnings: string[]; hasPortalAccount: boolean;
};
export type DirectoryPreview = {
  previewId: string; expiresAt: string; rows: DirectoryRow[];
  counts: Record<string, number>; appliedContactIds: string[];
};
type Doc = { id: string; data: Record<string, any> };
type Destination = { users: Doc[]; properties: Doc[]; directory: Doc[]; leases: Doc[] };
type PlannedRow = DirectoryRow & { directoryId: string; directoryData: Record<string, any> | null; propertyId: string | null; propertyData: Record<string, any> | null };
type Dependencies = { db: Firestore; auth: Auth; readSource?: () => Promise<TenantSource>; now?: () => number };
type Run = {
  creator: string; locationId: string; sourceHash: string; destinationHash: string;
  expiresAt: string; rows: PlannedRow[]; appliedContactIds: string[];
};

export class DirectoryError extends Error {
  constructor(message: string, public status = 409) { super(message); this.name = 'DirectoryError'; }
}

function canonical(value: any): any {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const directoryHash = (value: unknown): string => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const entryId = (location: string, contact: string) => `${encodeURIComponent(location)}_${encodeURIComponent(contact)}`;
const actionable = (row: DirectoryRow) => ['create', 'update', 'deactivate'].includes(row.action);
const cleanDirectory = (data: Record<string, any>) => {
  const { createdAt, lastSyncedAt, lastImportRunId, ...rest } = data;
  return rest;
};

async function destination(db: Firestore, tx?: Transaction): Promise<Destination> {
  const names = ['users', 'properties', 'ghlTenantDirectory', 'leases'];
  const results = await Promise.all(names.map(name => tx ? tx.get(db.collection(name)) : db.collection(name).get()));
  const docs = results.map(snap => snap.docs.map(d => ({ id: d.id, data: d.data() })).sort((a, b) => a.id.localeCompare(b.id)));
  return { users: docs[0], properties: docs[1], directory: docs[2], leases: docs[3] };
}

async function portalUids(auth: Auth, users: Doc[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let start = 0; start < users.length; start += 100) {
    const result = await auth.getUsers(users.slice(start, start + 100).map(u => ({ uid: u.id })));
    for (const user of result.users) if (!user.disabled) ids.add(user.uid);
  }
  return ids;
}

export function planRows(source: TenantSource, target: Destination, realUids: Set<string>): PlannedRow[] {
  const rows: PlannedRow[] = [];
  const seen = new Set<string>();
  for (const contact of source.contacts) {
    const directoryId = entryId(source.locationId, contact.id);
    seen.add(directoryId);
    const old = target.directory.find(d => d.id === directoryId);
    const eligibility = tenantEligibility(contact, source.properties);
    const reasons = [...eligibility.reasons];
    const linkedUsers = target.users.filter(u => u.data.ghlContactId === contact.id);
    const hasPortalAccount = linkedUsers.some(u => u.data.role === 'tenant' && realUids.has(u.id));
    if (linkedUsers.length > 1) reasons.push('Duplicate app identities');
    if (linkedUsers.some(u => u.data.role !== 'tenant')) reasons.push('Contact is linked to a non-tenant app role');
    if (contact.email && source.contacts.filter(c => c.email === contact.email).length > 1) reasons.push('Email is shared by multiple GHL contacts');
    if (contact.email && target.users.some(u => String(u.data.email || '').trim().toLowerCase() === contact.email && u.data.ghlContactId !== contact.id)) reasons.push('Email matches an unlinked app identity');
    const property = eligibility.property;
    const matches = property ? target.properties.filter(p => p.data.ghlObjectId === property.id || p.id === `ghl-${property.id}`) : [];
    if (matches.length > 1) reasons.push('Duplicate local properties');
    const local = matches[0];
    if (property && (!property.address || !property.name)) reasons.push('Property address is missing');
    if (local?.data.ghlObjectId && local.data.ghlObjectId !== property?.id) reasons.push('Property identity conflict');
    if (local && !local.data.ghlObjectId && local.data.source !== 'ghl') reasons.push('Property ID belongs to a manual record');
    if (local?.data.archived || local?.data.units?.length) reasons.push('Archived or unit-managed property needs review');
    if (local?.data.status === 'maintenance') reasons.push('Property is under maintenance in the app');
    const propertyId = property ? local?.id || `ghl-${property.id}` : null;
    if (propertyId && linkedUsers.some(u => u.data.propertyIds?.some((id: string) => id !== propertyId))) reasons.push('Existing app property assignment differs');
    if (propertyId) {
      const householdContacts = source.contacts.filter(c => {
        const result = tenantEligibility(c, source.properties);
        return result.eligible && result.property?.id === property?.id;
      }).map(c => c.id);
      const householdUsers = target.users.filter(u => householdContacts.includes(u.data.ghlContactId)).map(u => u.id);
      if (target.leases.some(l => l.data.propertyId === propertyId && (l.data.isActive || l.data.status === 'active') && !householdUsers.includes(l.data.tenantId))) reasons.push('Active app lease has a different tenant');
    }
    const row: PlannedRow = { contactId: contact.id, name: contact.name, email: contact.email,
      propertyName: property?.name || old?.data.propertyName || '', action: 'excluded',
      reasons, warnings: eligibility.warnings, hasPortalAccount, directoryId, directoryData: null, propertyId, propertyData: null };
    if (reasons.length) {
      const certainIneligible = reasons.every(reason => ['Missing active tag', 'Missing Tenant relationship', 'No occupied property'].includes(reason));
      if (old && certainIneligible) {
        row.action = old.data.status === 'inactive' ? 'unchanged' : 'deactivate';
        row.directoryData = { ...cleanDirectory(old.data), status: 'inactive', reasons, warnings: eligibility.warnings };
      } else row.action = certainIneligible ? 'excluded' : 'conflict';
    } else if (property) {
      row.directoryData = { locationId: source.locationId, ghlContactId: contact.id, name: contact.name,
        email: contact.email, phone: contact.phone, ghlPropertyId: property.id, propertyId, propertyName: property.name,
        status: 'active', warnings: eligibility.warnings, reasons: [], legacyUserIds: linkedUsers.map(u => u.id).sort(),
        linkedUserUid: linkedUsers.find(u => realUids.has(u.id))?.id || null };
      // Only directory-owned property metadata is written. Ownership, units and money stay app-managed.
      row.propertyData = { name: property.name, address: property.address, ghlObjectId: property.id,
        ghlObjectKey: source.objectKey, source: 'ghl', status: 'occupied', available: false };
      const propertyUnchanged = local && Object.entries(row.propertyData).every(([key, value]) => directoryHash(local.data[key] ?? null) === directoryHash(value));
      row.action = !old ? 'create' : directoryHash(cleanDirectory(old.data)) === directoryHash(row.directoryData) && propertyUnchanged ? 'unchanged' : 'update';
    }
    rows.push(row);
  }
  for (const old of target.directory.filter(d => d.data.locationId === source.locationId && !seen.has(d.id))) {
    const reasons = ['Missing active tag'];
    rows.push({ contactId: old.data.ghlContactId, directoryId: old.id, name: old.data.name, email: old.data.email || null,
      propertyName: old.data.propertyName || '', action: old.data.status === 'inactive' ? 'unchanged' : 'deactivate',
      reasons, warnings: [], hasPortalAccount: !!old.data.linkedUserUid && realUids.has(old.data.linkedUserUid),
      directoryData: { ...cleanDirectory(old.data), status: 'inactive', reasons }, propertyId: null, propertyData: null });
  }
  return rows.sort((a, b) => a.contactId.localeCompare(b.contactId));
}

function publicPreview(id: string, run: Run): DirectoryPreview {
  const rows = run.rows.map(({ directoryId, directoryData, propertyId, propertyData, ...row }) => row);
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.action] = (counts[row.action] || 0) + 1;
  return { previewId: id, expiresAt: run.expiresAt, rows, counts, appliedContactIds: run.appliedContactIds };
}

export async function previewTenantDirectory(deps: Dependencies, creator: string): Promise<DirectoryPreview> {
  const source = await (deps.readSource || readTenantSource)();
  const target = await destination(deps.db);
  const uids = await portalUids(deps.auth, target.users);
  const run: Run = { creator, locationId: source.locationId, sourceHash: directoryHash(source), destinationHash: directoryHash(target),
    expiresAt: new Date((deps.now?.() ?? Date.now()) + 15 * 60_000).toISOString(), rows: planRows(source, target, uids), appliedContactIds: [] };
  if (Buffer.byteLength(JSON.stringify(run)) > 800_000) throw new DirectoryError('Preview is too large; narrow the configured location before importing', 422);
  const ref = deps.db.collection('ghlImportRuns').doc();
  await ref.set(run);
  return publicPreview(ref.id, run);
}

export async function applyTenantDirectory(deps: Dependencies, creator: string, previewId: string, contactIds: string[]) {
  if (typeof previewId !== 'string' || !/^[\w-]{1,128}$/.test(previewId) || !Array.isArray(contactIds) || !contactIds.length || contactIds.length > 200 || contactIds.some(id => typeof id !== 'string' || !id || id.includes('/')) || new Set(contactIds).size !== contactIds.length) {
    throw new DirectoryError('Provide a preview ID and 1–200 distinct contact IDs', 400);
  }
  const ref = deps.db.collection('ghlImportRuns').doc(previewId);
  const saved = (await ref.get()).data() as Run | undefined;
  if (!saved || saved.creator !== creator) throw new DirectoryError('Preview not found for this operator', 404);
  if (contactIds.some(id => !saved.rows.some(row => row.contactId === id && actionable(row)))) throw new DirectoryError('Selection contains a non-actionable contact', 400);
  if (contactIds.every(id => saved.appliedContactIds.includes(id))) return { results: contactIds.map(contactId => ({ contactId, status: 'applied' })) };
  if (Date.parse(saved.expiresAt) <= (deps.now?.() ?? Date.now())) throw new DirectoryError('Preview expired; preview again');
  const source = await (deps.readSource || readTenantSource)();
  if (directoryHash(source) !== saved.sourceHash) throw new DirectoryError('GHL data changed; preview again');
  const targetBefore = await destination(deps.db);
  const uids = await portalUids(deps.auth, targetBefore.users);
  // Auth availability is also part of review; no accounts are created or modified here.
  if (directoryHash(planRows(source, targetBefore, uids).map(r => [r.contactId, r.hasPortalAccount])) !== directoryHash(saved.rows.map(r => [r.contactId, r.hasPortalAccount]))) throw new DirectoryError('Portal accounts changed; preview again');
  const now = new Date(deps.now?.() ?? Date.now()).toISOString();
  const attempt = ref.collection('attempts').doc();
  try {
    await deps.db.runTransaction(async tx => {
      const run = (await tx.get(ref)).data() as Run;
      if (!run || run.creator !== creator || run.sourceHash !== saved.sourceHash) throw new DirectoryError('Preview changed; preview again');
      if (Date.parse(run.expiresAt) <= (deps.now?.() ?? Date.now())) throw new DirectoryError('Preview expired; preview again');
      const target = await destination(deps.db, tx);
      if (directoryHash(target) !== run.destinationHash) throw new DirectoryError('App data changed; preview again');
      const replace = (docs: Doc[], id: string, data: Record<string, any>) => {
        const old = docs.find(d => d.id === id);
        if (old) old.data = data; else docs.push({ id, data });
        docs.sort((a, b) => a.id.localeCompare(b.id));
      };
      for (const id of contactIds) {
        if (run.appliedContactIds.includes(id)) continue;
        const row = run.rows.find(r => r.contactId === id)!;
        const existing = target.directory.find(d => d.id === row.directoryId);
        const directoryData = { ...row.directoryData, createdAt: existing?.data.createdAt || now, lastSyncedAt: now, lastImportRunId: previewId };
        tx.set(deps.db.collection('ghlTenantDirectory').doc(row.directoryId), directoryData);
        replace(target.directory, row.directoryId, directoryData);
        if (row.propertyId && row.propertyData && row.action !== 'deactivate') {
          const property = target.properties.find(p => p.id === row.propertyId);
          const propertyData = { ...property?.data, ...row.propertyData, createdAt: property?.data.createdAt || now, updatedAt: now, lastSyncedAt: now };
          tx.set(deps.db.collection('properties').doc(row.propertyId), propertyData);
          replace(target.properties, row.propertyId, propertyData);
        }
        run.appliedContactIds.push(id);
      }
      tx.update(ref, { appliedContactIds: run.appliedContactIds, destinationHash: directoryHash(target), lastAppliedAt: now });
      tx.set(attempt, { at: now, results: contactIds.map(contactId => ({ contactId, status: 'applied' })) });
    });
  } catch (error) {
    await attempt.set({ at: now, results: contactIds.map(contactId => ({ contactId, status: 'unconfirmed' })),
      reason: error instanceof DirectoryError ? error.message : 'Apply did not return success; retries are idempotent' }).catch(() => undefined);
    throw error;
  }
  return { results: contactIds.map(contactId => ({ contactId, status: 'applied' })) };
}

export async function listTenantDirectory(deps: Dependencies) {
  const target = await destination(deps.db);
  const uids = await portalUids(deps.auth, target.users);
  const represented = new Set(target.directory.map(d => d.data.ghlContactId));
  return {
    entries: target.directory.map(d => ({ id: d.id, ...d.data, hasPortalAccount: !!d.data.linkedUserUid && uids.has(d.data.linkedUserUid) })),
    // Preserve unmatched legacy profiles, but never label them active or as login accounts by default.
    legacy: target.users.filter(u => u.data.ghlContactId && !represented.has(u.data.ghlContactId)).map(u => ({ id: u.id, name: u.data.displayName || 'Unnamed contact', email: u.data.email || null, status: 'Legacy import — needs review', hasPortalAccount: uids.has(u.id) }))
  };
}
