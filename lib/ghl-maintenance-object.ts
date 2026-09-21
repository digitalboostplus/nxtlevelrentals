// Mirror maintenance tickets into the GoHighLevel "Maintenance Requests"
// custom object (CARIV). Firestore stays the source of truth; every ticket
// carries its GHL record id and sync state so re-runs update rather than
// duplicate. Structure follows lib/contractors.ts: a small port for the GHL
// calls (tests inject a fake), a dry-run rule, and a pure property builder.

import type { Firestore } from 'firebase-admin/firestore';
import { getCredentials, getGHLContactByEmail, getGHLContactByPhone, ghlFetch, ghlThrottle, isGHLConfigured } from './ghl';
import { MAINTENANCE_FIELDS, MAINTENANCE_OBJECT } from './ghlMaintenanceSchema';
import { toIssueType, toPriorityLabel, toSourceLabel, toStatusLabel } from './maintenanceNormalize';
import { isE164, normalizePhoneE164 } from './phone';

export type MaintenanceObjectConfig = {
  objectKey: string;
  tenantAssociationId: string;
  propertyAssociationId: string;
  /** How the location stores SINGLE_OPTIONS values; the setup script's --probe reports it. */
  optionValueMode: 'label' | 'key';
  /** Public base URL of the app, for the record's portal link. */
  portalBase: string;
};

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): MaintenanceObjectConfig {
  return {
    objectKey: env.GHL_MAINTENANCE_OBJECT_KEY || MAINTENANCE_OBJECT.key,
    tenantAssociationId: env.GHL_MAINT_ASSOC_TENANT_ID || '',
    propertyAssociationId: env.GHL_MAINT_ASSOC_PROPERTY_ID || '',
    optionValueMode: env.GHL_MAINT_OPTION_VALUE_MODE === 'label' ? 'label' : 'key',
    portalBase: (env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || 'https://rental-tracker-app-2026.web.app').replace(/\/$/, ''),
  };
}

// ---------------------------------------------------------------------------
// Port
// ---------------------------------------------------------------------------

export type MaintenanceGhlPort = {
  configured(): boolean;
  getRecord(id: string): Promise<{ id: string } | null>;
  createRecord(properties: Record<string, unknown>): Promise<string>;
  updateRecord(id: string, properties: Record<string, unknown>): Promise<void>;
  getContactByEmail(email: string): Promise<{ id: string } | null>;
  getContactByPhone(phone: string): Promise<{ id: string } | null>;
  createRelation(associationId: string, firstRecordId: string, secondRecordId: string): Promise<void>;
  throttle(): Promise<void>;
};

export function liveMaintenanceGhlPort(config: MaintenanceObjectConfig, env: NodeJS.ProcessEnv = process.env): MaintenanceGhlPort {
  const objectsVersion = env.GHL_OBJECTS_API_VERSION || '2021-07-28';
  const associationsVersion = env.GHL_ASSOCIATIONS_API_VERSION || 'v3';
  const key = encodeURIComponent(config.objectKey);
  const location = () => encodeURIComponent(getCredentials().locationId || '');
  return {
    configured: () => isGHLConfigured(),
    getRecord: async (id) => {
      try {
        const data = await ghlFetch(`/objects/${key}/records/${encodeURIComponent(id)}?locationId=${location()}`, { version: objectsVersion });
        const rec = data.record ?? data;
        return rec?.id ? { id: String(rec.id) } : null;
      } catch (err) {
        if (/\((404|400)\)/.test(err instanceof Error ? err.message : '')) return null;
        throw err;
      }
    },
    createRecord: async (properties) => {
      const data = await ghlFetch(`/objects/${key}/records`, { method: 'POST', version: objectsVersion, body: { locationId: getCredentials().locationId, properties } });
      const id = data.record?.id ?? data.id;
      if (!id) throw new Error('GoHighLevel returned no record id');
      return String(id);
    },
    updateRecord: async (id, properties) => {
      await ghlFetch(`/objects/${key}/records/${encodeURIComponent(id)}?locationId=${location()}`, { method: 'PUT', version: objectsVersion, body: { properties } });
    },
    getContactByEmail: async (email) => { const c = await getGHLContactByEmail(email); return c ? { id: c.id } : null; },
    getContactByPhone: async (phone) => { const c = await getGHLContactByPhone(phone); return c ? { id: c.id } : null; },
    createRelation: async (associationId, firstRecordId, secondRecordId) => {
      await ghlFetch('/associations/relations', { method: 'POST', version: associationsVersion, body: { locationId: getCredentials().locationId, associationId, firstRecordId, secondRecordId } });
    },
    throttle: () => ghlThrottle(),
  };
}

// ---------------------------------------------------------------------------
// Property builder (pure)
// ---------------------------------------------------------------------------

export const DRY_RUN_PREFIX = 'dry-run:';
const RETRY_DELAYS_MS = [500, 1500];

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const text = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function toMillis(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof (v as any).toMillis === 'function') return (v as any).toMillis();
  if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return Date.parse(v);
  return null;
}
const isoDate = (v: unknown): string | undefined => { const ms = toMillis(v); return ms === null ? undefined : new Date(ms).toISOString().slice(0, 10); };

export function portalUrlFor(ticketId: string, config: MaintenanceObjectConfig): string {
  return `${config.portalBase}/admin/maintenance?request=${encodeURIComponent(ticketId)}`;
}

/** Map a Firestore ticket onto the custom object's short field keys. */
export function buildRecordProperties(ticket: any, ctx: { propertyAddress?: string; config: MaintenanceObjectConfig }): Record<string, unknown> {
  const { config } = ctx;
  const option = (label: string) => (config.optionValueMode === 'key' ? slug(label) : label);
  const address = text(ctx.propertyAddress) || text(ticket.addressText, 240);
  const issueType = toIssueType(ticket.category);
  // Intake titles already read "Plumbing: ..."; do not prefix the category twice.
  const rawTitle = text(ticket.title, 160) || text(ticket.description, 60);
  const baseTitle = rawTitle.replace(new RegExp(`^${issueType.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:\\s*`, 'i'), '');
  const portal = portalUrlFor(String(ticket.id), config);
  const urls = Array.isArray(ticket.attachmentUrls) ? ticket.attachmentUrls.filter((u: unknown) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, 10) : [];
  const hasPortalOnlyPhotos = (Array.isArray(ticket.images) && ticket.images.length > 0) || (Array.isArray(ticket.fileIds) && ticket.fileIds.length > 0);
  const completed = toStatusLabel(ticket.status) === 'Completed';
  const props: Record<string, unknown> = {
    title: `${issueType}: ${baseTitle}${address ? ` — ${address}` : ''}`.slice(0, 250),
    ticket_id: String(ticket.id),
    issue_type: option(issueType),
    priority: option(toPriorityLabel(ticket.priority)),
    issue_description: text(ticket.description),
    property_address: address,
    permission_to_enter: option(ticket.permissionToEnter ? 'Yes' : 'No'),
    has_pets: option(ticket.hasPets ? 'Yes' : 'No'),
    preferred_time: text(ticket.preferredTime, 300),
    photo_links: urls.length ? urls.join('\n') : hasPortalOnlyPhotos ? portal : '',
    status: option(toStatusLabel(ticket.status)),
    scheduled_date: typeof ticket.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ticket.scheduledDate) ? ticket.scheduledDate : isoDate(ticket.scheduledDate),
    scheduled_time: [text(ticket.scheduledTime, 20), text(ticket.timeZone, 60)].filter(Boolean).join(' '),
    vendor_name: text(ticket.assignedVendorName, 200),
    // GHL validates PHONE fields strictly: E.164 or nothing.
    vendor_phone: (() => { const p = normalizePhoneE164(text(ticket.assignedVendorPhone, 50)); return isE164(p) ? p : ''; })(),
    actual_cost: typeof ticket.actualCost === 'number' ? { currency: 'default', value: ticket.actualCost } : undefined,
    admin_notes: text(ticket.adminNotes),
    completed_at: completed ? isoDate(ticket.completedAt) ?? isoDate(ticket.updatedAt) : undefined,
    source: option(toSourceLabel(ticket.source)),
    submitted_at: isoDate(ticket.createdAt),
    submitter_name: text(ticket.tenantName, 120),
    portal_url: portal,
  };
  // GHL rejects empty strings on typed fields (PHONE, DATE), so blanks are left
  // out entirely. A value cleared in the app therefore keeps its last GHL value.
  for (const k of Object.keys(props)) if (props[k] === undefined || props[k] === '') delete props[k];
  return props;
}

// ---------------------------------------------------------------------------
// Sync (port only; no Firestore)
// ---------------------------------------------------------------------------

export type SyncResult =
  | { ok: true; ghlRecordId: string; ghlContactId: string | null; ghlPropertyRecordId: string | null; ghlRelations: { tenant?: string; property?: string } }
  /** `ghlRecordId` is present when the record was written before a later step failed, so a retry updates it. */
  | { ok: false; error: string; ghlRecordId?: string };

const isRetryable = (err: unknown) => /\((403|429|5\d\d)\)/.test(err instanceof Error ? err.message : String(err));
const isAlreadyLinked = (err: unknown) => /already (exists|linked|associated)|duplicate/i.test(err instanceof Error ? err.message : String(err));
/** GHL refuses to link a record id it does not know (e.g. a stale contact id): drop the link, keep the record. */
const isInvalidTarget = (err: unknown) => /invalid record id/i.test(err instanceof Error ? err.message : String(err));

async function withRetry<T>(fn: () => Promise<T>, sleep: (ms: number) => Promise<void>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await fn(); } catch (err) {
      if (attempt < RETRY_DELAYS_MS.length && isRetryable(err)) { await sleep(RETRY_DELAYS_MS[attempt]); continue; }
      throw err;
    }
  }
}

/**
 * Create or update the ticket's record and make sure it is linked to the
 * tenant contact and the property record. Never creates a second record for a
 * ticket that already has one; a stale stored id falls back to create.
 */
export async function syncRecord(
  port: MaintenanceGhlPort,
  input: { ticket: any; contactId: string | null; propertyRecordId: string | null; propertyAddress?: string; config: MaintenanceObjectConfig; sleep?: (ms: number) => Promise<void> }
): Promise<SyncResult> {
  const { ticket, config } = input;
  let { contactId, propertyRecordId } = input;
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  const properties = buildRecordProperties(ticket, { propertyAddress: input.propertyAddress, config });
  let recordId: string | null = null;
  try {
    const stored = typeof ticket.ghlRecordId === 'string' && ticket.ghlRecordId && !ticket.ghlRecordId.startsWith(DRY_RUN_PREFIX) ? ticket.ghlRecordId : null;
    if (stored) {
      recordId = (await withRetry(() => port.getRecord(stored), sleep))?.id ?? null;
      await port.throttle();
    }
    if (recordId) await withRetry(() => port.updateRecord(recordId!, properties), sleep);
    else recordId = await withRetry(() => port.createRecord(properties), sleep);
    const relations: { tenant?: string; property?: string } = { ...(ticket.ghlRelations || {}) };
    const link = async (kind: 'tenant' | 'property', associationId: string, targetId: string | null): Promise<boolean> => {
      if (!targetId || !associationId || relations[kind] === targetId) return true;
      await port.throttle();
      try { await withRetry(() => port.createRelation(associationId, targetId, recordId!), sleep); }
      catch (err) {
        if (isInvalidTarget(err)) return false;
        if (!isAlreadyLinked(err)) throw err;
      }
      relations[kind] = targetId;
      return true;
    };
    if (!(await link('tenant', config.tenantAssociationId, contactId))) contactId = null;
    if (!(await link('property', config.propertyAssociationId, propertyRecordId))) propertyRecordId = null;
    return { ok: true, ghlRecordId: recordId, ghlContactId: contactId, ghlPropertyRecordId: propertyRecordId, ghlRelations: relations };
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    return recordId ? { ok: false, error, ghlRecordId: recordId } : { ok: false, error };
  }
}

// ---------------------------------------------------------------------------
// Firestore orchestration
// ---------------------------------------------------------------------------

export type Dependencies = {
  db: Firestore;
  ghl?: MaintenanceGhlPort;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
};

export type MirrorResult = { ok: true; ghlRecordId: string; dryRun: boolean } | { ok: false; error: string };

function resolve(deps: Dependencies) {
  const env = deps.env ?? process.env;
  const config = configFromEnv(env);
  const ghl = deps.ghl ?? liveMaintenanceGhlPort(config, env);
  const dryRun = deps.dryRun ?? (Boolean(env.FIREBASE_AUTH_EMULATOR_HOST) || env.GHL_DRY_RUN === 'true' || !ghl.configured());
  return { db: deps.db, ghl, env, config, dryRun, now: deps.now ?? (() => Date.now()), sleep: deps.sleep };
}

export function isDryRun(deps: Dependencies): boolean {
  return resolve(deps).dryRun;
}

const normAddress = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Find the GHL property record for a ticket: linked property doc first, then an address match. */
async function resolvePropertyRecord(db: Firestore, ticket: any): Promise<{ id: string | null; address: string }> {
  if (ticket.propertyId && ticket.propertyId !== 'unassigned') {
    const property = (await db.doc(`properties/${ticket.propertyId}`).get()).data();
    if (property) return { id: typeof property.ghlObjectId === 'string' ? property.ghlObjectId : null, address: String(property.address || property.name || '') };
  }
  const wanted = normAddress(ticket.addressText);
  if (wanted.length < 6) return { id: null, address: '' };
  const candidates = await db.collection('properties').where('source', '==', 'ghl').get();
  for (const doc of candidates.docs) {
    const property = doc.data();
    const have = normAddress(property.address).replace(/kansascity.*$/, '');
    if (have.length >= 6 && (wanted.startsWith(have) || have.startsWith(wanted))) {
      return { id: typeof property.ghlObjectId === 'string' ? property.ghlObjectId : null, address: String(property.address || '') };
    }
  }
  return { id: null, address: '' };
}

async function resolveContact(r: ReturnType<typeof resolve>, ticket: any): Promise<string | null> {
  if (typeof ticket.ghlContactId === 'string' && ticket.ghlContactId) return ticket.ghlContactId;
  let email = typeof ticket.contactEmail === 'string' ? ticket.contactEmail : '';
  let phone = typeof ticket.tenantPhone === 'string' ? ticket.tenantPhone : '';
  if (ticket.tenantId && ticket.tenantId !== 'public') {
    const user = (await r.db.doc(`users/${ticket.tenantId}`).get()).data();
    if (typeof user?.ghlContactId === 'string' && user.ghlContactId) return user.ghlContactId;
    email = email || (typeof user?.email === 'string' ? user.email : '');
    phone = phone || (typeof user?.phoneNumber === 'string' ? user.phoneNumber : '');
  }
  if (email) { await r.ghl.throttle(); const c = await r.ghl.getContactByEmail(email); if (c) return c.id; }
  if (phone) { await r.ghl.throttle(); const c = await r.ghl.getContactByPhone(phone); if (c) return c.id; }
  return null;
}

/** Reconcile one ticket to GHL and persist the outcome on the ticket document. */
export async function mirrorMaintenanceToGHL(deps: Dependencies, ticketId: string): Promise<MirrorResult> {
  const r = resolve(deps);
  const ref = r.db.doc(`maintenanceRequests/${ticketId}`);
  const ticket = (await ref.get()).data();
  if (!ticket) return { ok: false, error: 'Ticket not found' };
  const now = r.now();
  if (r.dryRun) {
    const ghlRecordId = `${DRY_RUN_PREFIX}${ticketId}`;
    await ref.set({ ghlRecordId, ghlSyncedAt: now, ghlSyncError: null }, { merge: true });
    return { ok: true, ghlRecordId, dryRun: true };
  }
  let result: SyncResult;
  try {
    const [contactId, property] = [await resolveContact(r, ticket), await resolvePropertyRecord(r.db, ticket)];
    result = await syncRecord(r.ghl, { ticket: { ...ticket, id: ticketId }, contactId, propertyRecordId: property.id, propertyAddress: property.address, config: r.config, sleep: r.sleep });
  } catch (err) {
    result = { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 500) };
  }
  if (result.ok) {
    await ref.set({ ghlRecordId: result.ghlRecordId, ghlContactId: result.ghlContactId, ghlPropertyRecordId: result.ghlPropertyRecordId, ghlRelations: result.ghlRelations, ghlSyncedAt: now, ghlSyncError: null }, { merge: true });
    return { ok: true, ghlRecordId: result.ghlRecordId, dryRun: false };
  }
  // Keep a record id that was written before the failure so the retry updates instead of duplicating.
  await ref.set({ ghlSyncError: result.error, ghlSyncAttemptedAt: now, ...(result.ghlRecordId ? { ghlRecordId: result.ghlRecordId } : {}) }, { merge: true });
  return { ok: false, error: result.error };
}

/** Field keys the record writes, for anyone checking the schema stays in step. */
export const RECORD_FIELD_KEYS = ['title', ...MAINTENANCE_FIELDS.map(f => f.key)];
