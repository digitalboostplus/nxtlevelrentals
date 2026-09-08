// Approved contractors: roster in Firestore, mirrored to GoHighLevel (CARIV)
// so the office can text, drop voicemails and connect calls. Everything takes
// its dependencies as arguments so tests can inject a fake GoHighLevel port.
import type { Firestore } from 'firebase-admin/firestore';
import {
  addGHLContactNote,
  addGHLContactTags,
  createGHLContact,
  enrollGHLContactInWorkflow,
  getGHLContactByEmail,
  getGHLContactById,
  getGHLContactByPhone,
  ghlThrottle,
  isGHLConfigured,
  sendGHLSMS,
  setGHLContactAssignedUser,
  updateGHLContact,
  upsertGHLContact,
} from './ghl';
import { isE164, normalizePhoneE164 } from './phone';
import { DEFAULT_SMS_TEMPLATES, SMS_MAX_LENGTH } from './contractorTemplates';
import {
  TRADES,
  VOICEMAIL_SITUATIONS,
  type ContactLogEntry,
  type ContactLogStatus,
  type ContactLogType,
  type Contractor,
  type ContractorCommsConfigured,
  type ContractorCommsSettings,
  type ContractorInput,
  type ContractorStatus,
  type SmsTemplate,
  type TemplateVars,
  type Trade,
  type VoicemailSituation,
} from '@/types/contractors';

export { renderTemplate, DEFAULT_SMS_TEMPLATES } from './contractorTemplates';

export class ContractorError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'ContractorError';
  }
}
export class ValidationError extends ContractorError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// GoHighLevel port
// ---------------------------------------------------------------------------

type PortContact = { id: string; email?: string | null; phone?: string | null };
type PortContactInput = { firstName?: string; lastName?: string; phone?: string; email?: string; companyName?: string; tags?: string[] };

export type GhlPort = {
  configured(): boolean;
  getContactById(id: string): Promise<PortContact | null>;
  getContactByEmail(email: string): Promise<PortContact | null>;
  getContactByPhone(phone: string): Promise<PortContact | null>;
  /** Upsert keyed on email; returns the contact id. */
  upsertContact(input: PortContactInput & { email: string }): Promise<string>;
  /** Create without an email; returns the contact id. */
  createContact(input: PortContactInput & { phone: string }): Promise<string>;
  updateContact(id: string, input: PortContactInput): Promise<void>;
  addTags(id: string, tags: string[]): Promise<void>;
  addNote(id: string, body: string): Promise<void>;
  sendSms(id: string, message: string): Promise<{ messageId?: string }>;
  enrollWorkflow(id: string, workflowId: string): Promise<unknown>;
  assignUser(id: string, userId: string): Promise<void>;
  /** CARIV spacing between calls (500 ms in production, nothing in tests). */
  throttle(): Promise<void>;
};

export const liveGhlPort: GhlPort = {
  configured: () => isGHLConfigured(),
  getContactById: async (id) => {
    const c = await getGHLContactById(id);
    return c ? { id: c.id, email: c.email, phone: c.phone } : null;
  },
  getContactByEmail: async (email) => {
    const c = await getGHLContactByEmail(email);
    return c ? { id: c.id, email: c.email, phone: c.phone } : null;
  },
  getContactByPhone: async (phone) => {
    const c = await getGHLContactByPhone(phone);
    return c ? { id: c.id, email: c.email, phone: c.phone } : null;
  },
  upsertContact: (input) => upsertGHLContact(input),
  createContact: (input) => createGHLContact(input),
  updateContact: (id, input) => updateGHLContact(id, input),
  addTags: (id, tags) => addGHLContactTags(id, tags),
  addNote: (id, body) => addGHLContactNote(id, body),
  sendSms: (id, message) => sendGHLSMS(id, message),
  enrollWorkflow: (id, workflowId) => enrollGHLContactInWorkflow(id, workflowId),
  assignUser: (id, userId) => setGHLContactAssignedUser(id, userId),
  throttle: () => ghlThrottle(),
};

export type Dependencies = {
  db: Firestore;
  ghl?: GhlPort;
  now?: () => number;
  /** Delay used by the mirror's retry backoff; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  /** Force or suppress dry-run; defaults to the env rule in isDryRun(). */
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
};

export type Actor = { uid: string; name?: string | null; ghlUserId?: string | null };

const CONTRACTORS = 'contractors';
const CONTACT_LOG = 'contactLog';
const SETTINGS_DOC = 'settings/contractorComms';
export const DRY_RUN_PREFIX = 'dry-run:';
const RETRY_DELAYS_MS = [500, 1500];

function resolve(deps: Dependencies) {
  const env = deps.env ?? process.env;
  const ghl = deps.ghl ?? liveGhlPort;
  const dryRun =
    deps.dryRun ??
    (Boolean(env.FIREBASE_AUTH_EMULATOR_HOST) || env.GHL_DRY_RUN === 'true' || !ghl.configured());
  return {
    db: deps.db,
    ghl,
    env,
    dryRun,
    now: deps.now ?? (() => Date.now()),
    sleep: deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))),
  };
}

/** True when no GoHighLevel call should be made (emulators, GHL_DRY_RUN, or no credentials). */
export function isDryRun(deps: Dependencies): boolean {
  return resolve(deps).dryRun;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanText = (value: unknown, max: number): string => String(value ?? '').trim().slice(0, max);

export type ValidContractorInput = {
  name: string;
  company: string;
  trades: Trade[];
  phone: string;
  email: string;
  notes: string;
  status: ContractorStatus;
  consent: boolean | undefined;
};

export function validateContractorInput(raw: unknown): ValidContractorInput {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<ContractorInput>;
  const name = cleanText(input.name, 120);
  if (!name) throw new ValidationError('Name is required.');
  const company = cleanText(input.company, 120);
  const tradesRaw = Array.isArray(input.trades) ? input.trades : [];
  const trades = Array.from(new Set(tradesRaw.filter((t): t is Trade => TRADES.includes(t as Trade))));
  if (!trades.length) throw new ValidationError('Pick at least one trade.');
  const phone = normalizePhoneE164(String(input.phone ?? ''));
  if (!phone || !isE164(phone)) throw new ValidationError('Enter a valid mobile number.');
  const email = cleanText(input.email, 160).toLowerCase();
  if (email && !EMAIL_RE.test(email)) throw new ValidationError('Enter a valid email address.');
  const notes = cleanText(input.notes, 2000);
  const status: ContractorStatus = input.status === undefined ? 'approved' : input.status;
  if (status !== 'approved' && status !== 'inactive') throw new ValidationError('Status must be approved or inactive.');
  if (input.consent !== undefined && typeof input.consent !== 'boolean') throw new ValidationError('Consent must be true or false.');
  return { name, company, trades, phone, email, notes, status, consent: input.consent };
}

export const searchKeyFor = (c: Pick<Contractor, 'name' | 'company' | 'phone' | 'email'>): string =>
  [c.name, c.company, c.phone, c.phone.replace(/\D/g, ''), c.email].filter(Boolean).join(' ').toLowerCase();

export const contractorTags = (trades: Trade[]): string[] => ['contractor', ...trades.map((t) => `trade:${t}`)];

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

function toContractor(id: string, data: Record<string, any>): Contractor {
  return {
    id,
    name: data.name ?? '',
    company: data.company ?? '',
    trades: Array.isArray(data.trades) ? data.trades : [],
    phone: data.phone ?? '',
    email: data.email ?? '',
    notes: data.notes ?? '',
    status: data.status === 'inactive' ? 'inactive' : 'approved',
    consentAt: data.consentAt ?? null,
    ghlContactId: data.ghlContactId ?? null,
    ghlSyncError: data.ghlSyncError ?? null,
    ghlSyncedAt: data.ghlSyncedAt ?? null,
    searchKey: data.searchKey ?? '',
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? 0,
    createdBy: data.createdBy ?? '',
    updatedBy: data.updatedBy ?? '',
  };
}

export async function listContractors(deps: Dependencies, opts: { status?: ContractorStatus | 'all' } = {}): Promise<Contractor[]> {
  const { db } = resolve(deps);
  let query: FirebaseFirestore.Query = db.collection(CONTRACTORS);
  if (opts.status && opts.status !== 'all') query = query.where('status', '==', opts.status);
  const snap = await query.orderBy('name').get();
  return snap.docs.map((d) => toContractor(d.id, d.data()));
}

export async function getContractor(deps: Dependencies, id: string): Promise<Contractor> {
  const { db } = resolve(deps);
  const doc = await db.collection(CONTRACTORS).doc(id).get();
  if (!doc.exists) throw new ContractorError('Contractor not found.', 404);
  return toContractor(doc.id, doc.data() || {});
}

export async function listContactLog(deps: Dependencies, contractorId: string, limit = 25): Promise<ContactLogEntry[]> {
  const { db } = resolve(deps);
  const snap = await db.collection(CONTRACTORS).doc(contractorId).collection(CONTACT_LOG).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContactLogEntry, 'id'>) }));
}

/**
 * Create or update a contractor. Firestore is written first so the roster
 * survives a GoHighLevel outage; the mirror result is written back after.
 */
export async function saveContractor(
  deps: Dependencies,
  args: { id?: string; input: unknown; actor: Actor; mirror?: boolean }
): Promise<Contractor> {
  const r = resolve(deps);
  const input = validateContractorInput(args.input);
  const now = r.now();
  const col = r.db.collection(CONTRACTORS);
  const existing = args.id ? await getContractor(deps, args.id) : null;
  const ref = existing ? col.doc(existing.id) : col.doc();

  const consentAt =
    input.consent === true ? existing?.consentAt ?? now : input.consent === false ? null : existing?.consentAt ?? null;

  const base = {
    name: input.name,
    company: input.company,
    trades: input.trades,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    status: input.status,
    consentAt,
    updatedAt: now,
    updatedBy: args.actor.uid,
  };
  const searchKey = searchKeyFor(base);
  if (existing) {
    await ref.update({ ...base, searchKey });
  } else {
    await ref.set({
      ...base,
      searchKey,
      ghlContactId: null,
      ghlSyncError: null,
      ghlSyncedAt: null,
      createdAt: now,
      createdBy: args.actor.uid,
    });
  }

  let contractor = toContractor(ref.id, {
    ...(existing || {}),
    ...base,
    searchKey,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? args.actor.uid,
  });
  if (args.mirror !== false) contractor = await resyncContractor(deps, contractor);
  return contractor;
}

/** Re-run the GoHighLevel mirror for one contractor and persist the outcome. */
export async function resyncContractor(deps: Dependencies, contractor: Contractor): Promise<Contractor> {
  const r = resolve(deps);
  const result = await mirrorToGHL(contractor, r.ghl, { dryRun: r.dryRun, sleep: r.sleep });
  const patch = result.ok
    ? { ghlContactId: result.ghlContactId, ghlSyncError: null, ghlSyncedAt: r.now() }
    : { ghlSyncError: result.error };
  await r.db.collection(CONTRACTORS).doc(contractor.id).update(patch);
  return { ...contractor, ...patch };
}

export type MirrorResult = { ok: true; ghlContactId: string } | { ok: false; error: string };

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || name, lastName: parts.slice(1).join(' ') || undefined };
};

const isRetryable = (err: unknown) => /\((429|5\d\d)\)/.test(err instanceof Error ? err.message : String(err));

/**
 * Find or create the CARIV contact for a contractor: stored id, then email,
 * then phone; never creates a second contact for a known one. Tags are added,
 * never replaced, so a contractor who is also a tenant keeps their tags.
 * Retries twice (500 ms, 1500 ms) on 429 and 5xx responses.
 */
export async function mirrorToGHL(
  contractor: Contractor,
  ghl: GhlPort,
  opts: { dryRun?: boolean; sleep?: (ms: number) => Promise<void> } = {}
): Promise<MirrorResult> {
  if (opts.dryRun) return { ok: true, ghlContactId: `${DRY_RUN_PREFIX}${contractor.id}` };
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const stored = contractor.ghlContactId && !contractor.ghlContactId.startsWith(DRY_RUN_PREFIX) ? contractor.ghlContactId : null;
  const { firstName, lastName } = splitName(contractor.name);
  const tags = contractorTags(contractor.trades);

  for (let attempt = 0; ; attempt += 1) {
    try {
      let id: string | null = null;
      if (stored) id = (await ghl.getContactById(stored))?.id ?? null;
      if (!id && contractor.email) {
        await ghl.throttle();
        id = (await ghl.getContactByEmail(contractor.email))?.id ?? null;
      }
      if (!id) {
        await ghl.throttle();
        id = (await ghl.getContactByPhone(contractor.phone))?.id ?? null;
      }
      await ghl.throttle();
      if (id) {
        await ghl.updateContact(id, {
          firstName,
          lastName,
          phone: contractor.phone,
          email: contractor.email || undefined,
          companyName: contractor.company || undefined,
        });
      } else if (contractor.email) {
        id = await ghl.upsertContact({
          email: contractor.email,
          firstName,
          lastName,
          phone: contractor.phone,
          companyName: contractor.company || undefined,
          tags,
        });
      } else {
        id = await ghl.createContact({ phone: contractor.phone, firstName, lastName, companyName: contractor.company || undefined, tags });
      }
      if (!id) throw new Error('GoHighLevel returned no contact id');
      await ghl.throttle();
      await ghl.addTags(id, tags);
      return { ok: true, ghlContactId: id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < RETRY_DELAYS_MS.length && isRetryable(err)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return { ok: false, error: message.slice(0, 500) };
    }
  }
}

// ---------------------------------------------------------------------------
// Comms settings
// ---------------------------------------------------------------------------

const ENV_VOICEMAIL: Record<VoicemailSituation, string> = {
  newJob: 'GHL_VOICEMAIL_WORKFLOW_NEW_JOB',
  confirmVisit: 'GHL_VOICEMAIL_WORKFLOW_CONFIRM_VISIT',
  urgent: 'GHL_VOICEMAIL_WORKFLOW_URGENT',
};
const WORKFLOW_ID_RE = /^[\w-]{5,64}$/;

export type CommsView = { settings: ContractorCommsSettings; configured: ContractorCommsConfigured };

/** Stored settings with env fallbacks and default templates. Seeds the doc on first read. */
export async function getContractorComms(deps: Dependencies): Promise<CommsView> {
  const r = resolve(deps);
  const ref = r.db.doc(SETTINGS_DOC);
  const doc = await ref.get();
  let data = (doc.data() || {}) as Partial<ContractorCommsSettings>;
  if (!doc.exists) {
    data = { voicemailWorkflows: {}, callWorkflowId: '', smsTemplates: DEFAULT_SMS_TEMPLATES, updatedAt: null, updatedBy: null };
    await ref.set(data);
  }
  const voicemailWorkflows: Partial<Record<VoicemailSituation, string>> = {};
  for (const s of VOICEMAIL_SITUATIONS) {
    const stored = data.voicemailWorkflows?.[s]?.trim();
    const fromEnv = r.env[ENV_VOICEMAIL[s]]?.trim();
    if (stored || fromEnv) voicemailWorkflows[s] = stored || fromEnv || '';
  }
  const callWorkflowId = (data.callWorkflowId || '').trim() || (r.env.GHL_CALL_WORKFLOW_ID || '').trim();
  const smsTemplates = Array.isArray(data.smsTemplates) && data.smsTemplates.length ? data.smsTemplates : DEFAULT_SMS_TEMPLATES;
  const settings: ContractorCommsSettings = {
    voicemailWorkflows,
    callWorkflowId,
    smsTemplates,
    updatedAt: data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
  const configured: ContractorCommsConfigured = {
    sms: true,
    voicemail: {
      newJob: Boolean(voicemailWorkflows.newJob),
      confirmVisit: Boolean(voicemailWorkflows.confirmVisit),
      urgent: Boolean(voicemailWorkflows.urgent),
    },
    call: Boolean(callWorkflowId),
    dryRun: r.dryRun,
  };
  return { settings, configured };
}

export function validateCommsInput(raw: unknown): Pick<ContractorCommsSettings, 'voicemailWorkflows' | 'callWorkflowId' | 'smsTemplates'> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const voicemailWorkflows: Partial<Record<VoicemailSituation, string>> = {};
  for (const s of VOICEMAIL_SITUATIONS) {
    const value = cleanText(input.voicemailWorkflows?.[s], 64);
    if (!value) continue;
    if (!WORKFLOW_ID_RE.test(value)) throw new ValidationError(`Voicemail workflow id for ${s} is not valid.`);
    voicemailWorkflows[s] = value;
  }
  const callWorkflowId = cleanText(input.callWorkflowId, 64);
  if (callWorkflowId && !WORKFLOW_ID_RE.test(callWorkflowId)) throw new ValidationError('Call workflow id is not valid.');
  const templatesRaw = Array.isArray(input.smsTemplates) ? input.smsTemplates : [];
  if (templatesRaw.length > 20) throw new ValidationError('Keep it to 20 templates.');
  const seen = new Set<string>();
  const smsTemplates: SmsTemplate[] = templatesRaw.map((t: any, i: number) => {
    const id = cleanText(t?.id, 64) || `template-${i + 1}`;
    if (!/^[\w-]{1,64}$/.test(id) || seen.has(id)) throw new ValidationError(`Template id "${id}" is not valid or repeats.`);
    seen.add(id);
    const label = cleanText(t?.label, 60);
    const body = cleanText(t?.body, SMS_MAX_LENGTH);
    if (!label || !body) throw new ValidationError('Every template needs a label and a message.');
    return { id, label, body };
  });
  return { voicemailWorkflows, callWorkflowId, smsTemplates };
}

export async function saveContractorComms(deps: Dependencies, raw: unknown, actor: Actor): Promise<CommsView> {
  const r = resolve(deps);
  const clean = validateCommsInput(raw);
  await r.db.doc(SETTINGS_DOC).set({ ...clean, updatedAt: r.now(), updatedBy: actor.uid });
  return getContractorComms(deps);
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

type LogInput = {
  type: ContactLogType;
  status: ContactLogStatus;
  templateId?: string | null;
  message?: string | null;
  ticketId?: string | null;
  ghlResponseId?: string | null;
  ghlError?: string | null;
};

/** Write a log row and, when the contact is real, a best-effort note in GoHighLevel. */
export async function logContact(deps: Dependencies, contractor: Contractor, actor: Actor, entry: LogInput): Promise<ContactLogEntry> {
  const r = resolve(deps);
  const row: Omit<ContactLogEntry, 'id'> = {
    type: entry.type,
    templateId: entry.templateId ?? null,
    message: entry.message ?? null,
    ticketId: entry.ticketId ?? null,
    status: entry.status,
    actorUid: actor.uid,
    actorName: actor.name ?? null,
    ghlResponseId: entry.ghlResponseId ?? null,
    ghlError: entry.ghlError ?? null,
    createdAt: r.now(),
  };
  const ref = await r.db.collection(CONTRACTORS).doc(contractor.id).collection(CONTACT_LOG).add(row);
  const contactId = contractor.ghlContactId;
  if (!r.dryRun && contactId && !contactId.startsWith(DRY_RUN_PREFIX)) {
    const who = actor.name || actor.uid;
    const what =
      entry.type === 'sms'
        ? `SMS: ${entry.message || ''}`
        : entry.type === 'voicemail'
          ? `Voicemail drop (${entry.templateId || 'unspecified'})`
          : 'Call requested';
    const note = `[App] ${what} by ${who}${entry.ticketId ? ` · ticket ${entry.ticketId}` : ''} · ${entry.status}${entry.ghlError ? ` · ${entry.ghlError}` : ''}`;
    try {
      await r.ghl.throttle();
      await r.ghl.addNote(contactId, note.slice(0, 2000));
    } catch (err) {
      console.warn('Contractor note failed', err instanceof Error ? err.message : err);
    }
  }
  return { id: ref.id, ...row };
}

async function loadForAction(deps: Dependencies, contractorId: string, opts: { consent: boolean }): Promise<Contractor> {
  const contractor = await getContractor(deps, contractorId);
  if (contractor.status !== 'approved') throw new ContractorError('This contractor is inactive. Mark them approved to message them.', 400);
  if (!contractor.ghlContactId) throw new ContractorError('This contractor is not synced to GoHighLevel yet. Retry the sync first.', 400);
  if (opts.consent && !contractor.consentAt) {
    throw new ContractorError('Record the contractor consent to automated texts and voicemail before using this.', 400);
  }
  return contractor;
}

const cleanTicketId = (value: unknown): string | null => {
  const id = cleanText(value, 128);
  if (!id) return null;
  if (!/^[\w-]{1,128}$/.test(id)) throw new ValidationError('Ticket id is not valid.');
  return id;
};

export type SendResult = { contractor: Contractor; log: ContactLogEntry };

export async function sendContractorSms(
  deps: Dependencies,
  args: { contractorId: string; message: unknown; templateId?: unknown; ticketId?: unknown; actor: Actor }
): Promise<SendResult> {
  const r = resolve(deps);
  const message = cleanText(args.message, SMS_MAX_LENGTH + 1);
  if (!message) throw new ValidationError('Type a message first.');
  if (message.length > SMS_MAX_LENGTH) throw new ValidationError(`Keep the message under ${SMS_MAX_LENGTH} characters.`);
  const templateId = cleanText(args.templateId, 64) || null;
  const ticketId = cleanTicketId(args.ticketId);
  const contractor = await loadForAction(deps, args.contractorId, { consent: false });

  if (r.dryRun) {
    const log = await logContact(deps, contractor, args.actor, { type: 'sms', status: 'dry-run', message, templateId, ticketId });
    return { contractor, log };
  }
  try {
    const res = await r.ghl.sendSms(contractor.ghlContactId!, message);
    const log = await logContact(deps, contractor, args.actor, {
      type: 'sms',
      status: 'sent',
      message,
      templateId,
      ticketId,
      ghlResponseId: res.messageId ?? null,
    });
    return { contractor, log };
  } catch (err) {
    const ghlError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await logContact(deps, contractor, args.actor, { type: 'sms', status: 'failed', message, templateId, ticketId, ghlError });
    throw new ContractorError(`GoHighLevel did not accept the text: ${ghlError}`, 502);
  }
}

export async function dropContractorVoicemail(
  deps: Dependencies,
  args: { contractorId: string; situation: unknown; ticketId?: unknown; actor: Actor }
): Promise<SendResult> {
  const r = resolve(deps);
  const situation = String(args.situation ?? '') as VoicemailSituation;
  if (!VOICEMAIL_SITUATIONS.includes(situation)) throw new ValidationError('Pick a voicemail to send.');
  const ticketId = cleanTicketId(args.ticketId);
  const { settings } = await getContractorComms(deps);
  const workflowId = settings.voicemailWorkflows[situation];
  if (!workflowId) throw new ContractorError(`Voicemail workflow for ${situation} is not configured.`, 400);
  const contractor = await loadForAction(deps, args.contractorId, { consent: true });

  if (r.dryRun) {
    const log = await logContact(deps, contractor, args.actor, { type: 'voicemail', status: 'dry-run', templateId: situation, ticketId });
    return { contractor, log };
  }
  try {
    await r.ghl.enrollWorkflow(contractor.ghlContactId!, workflowId);
    const log = await logContact(deps, contractor, args.actor, {
      type: 'voicemail',
      status: 'sent',
      templateId: situation,
      ticketId,
      ghlResponseId: workflowId,
    });
    return { contractor, log };
  } catch (err) {
    const ghlError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await logContact(deps, contractor, args.actor, { type: 'voicemail', status: 'failed', templateId: situation, ticketId, ghlError });
    throw new ContractorError(`GoHighLevel did not start the voicemail: ${ghlError}`, 502);
  }
}

export type CallResult = SendResult & ({ mode: 'workflow' } | { mode: 'tel'; phone: string });

/**
 * Ask GoHighLevel to ring the clicking admin, then bridge to the contractor.
 * Without a mapped GoHighLevel user the caller gets a tel: fallback instead.
 */
export async function requestContractorCall(
  deps: Dependencies,
  args: { contractorId: string; ticketId?: unknown; actor: Actor }
): Promise<CallResult> {
  const r = resolve(deps);
  const ticketId = cleanTicketId(args.ticketId);
  const { settings } = await getContractorComms(deps);
  const contractor = await loadForAction(deps, args.contractorId, { consent: true });

  if (!args.actor.ghlUserId || !settings.callWorkflowId) {
    const log = await logContact(deps, contractor, args.actor, {
      type: 'call',
      status: r.dryRun ? 'dry-run' : 'sent',
      message: 'Dialed directly (tel link)',
      ticketId,
    });
    return { contractor, log, mode: 'tel', phone: contractor.phone };
  }
  if (r.dryRun) {
    const log = await logContact(deps, contractor, args.actor, { type: 'call', status: 'dry-run', ticketId, templateId: settings.callWorkflowId });
    return { contractor, log, mode: 'workflow' };
  }
  try {
    await r.ghl.assignUser(contractor.ghlContactId!, args.actor.ghlUserId);
    await r.ghl.throttle();
    await r.ghl.enrollWorkflow(contractor.ghlContactId!, settings.callWorkflowId);
    const log = await logContact(deps, contractor, args.actor, {
      type: 'call',
      status: 'sent',
      ticketId,
      templateId: settings.callWorkflowId,
      ghlResponseId: settings.callWorkflowId,
    });
    return { contractor, log, mode: 'workflow' };
  } catch (err) {
    const ghlError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await logContact(deps, contractor, args.actor, { type: 'call', status: 'failed', ticketId, ghlError });
    throw new ContractorError(`GoHighLevel did not start the call: ${ghlError}`, 502);
  }
}

// ---------------------------------------------------------------------------
// Ticket prefill
// ---------------------------------------------------------------------------

const dateLabel = (value: unknown): string => {
  const d =
    typeof value === 'number' ? new Date(value) : typeof value === 'string' ? new Date(value) : ((value as any)?.toDate?.() ?? null);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/** Values for {ticket} {property} {date} taken from a maintenance request. */
export async function ticketVars(deps: Dependencies, ticketId: string): Promise<TemplateVars & { ticketId: string }> {
  const r = resolve(deps);
  const id = cleanTicketId(ticketId);
  if (!id) throw new ValidationError('Ticket id is required.');
  const doc = await r.db.collection('maintenanceRequests').doc(id).get();
  if (!doc.exists) throw new ContractorError('Ticket not found.', 404);
  const data = doc.data() || {};
  let property = data.propertyName || data.propertyAddress || '';
  if (!property && data.propertyId) {
    const prop = await r.db.collection('properties').doc(String(data.propertyId)).get();
    const p = prop.data() || {};
    property = p.name || p.address || p.title || '';
  }
  return {
    ticketId: id,
    ticket: data.title || '',
    property,
    date: dateLabel(data.scheduledDate) || dateLabel(r.now()),
  };
}
