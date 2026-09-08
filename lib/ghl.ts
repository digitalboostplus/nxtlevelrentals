// GoHighLevel (LeadConnector) v2 API client.
//
// Supports reading and writing contacts so the app can both pull CRM data
// (lease terms, rent, address) and push updates back (new tenants, payment
// status, maintenance activity).
//
// Configuration comes from environment variables only — never hardcode tokens.
// Both the documented (.env.example) names and the older names are accepted so
// existing deployments keep working:
//   GHL_API_KEY      (preferred)  or  GHL_ACCESS_TOKEN
//   GHL_LOCATION_ID  (preferred)  or  LOCATION_ID

export const GHL_API_BASE = 'https://services.leadconnectorhq.com';
export const GHL_API_VERSION = '2021-07-28';

// Custom Field IDs (from the GHL location's contact custom fields).
export const GHL_FIELD_IDS = {
  LEASE_START: 'xflK4edwKFVm1pHLJxew',
  LEASE_END: 'nMzB4QirjN9XP6BQwp0N',
  LEASE_ACTIVE: 'KMpvAs09LKwF1mQoY6LV',
  MONTHLY_RENT: 'r9QRb2yRF9i0CjCDhpNA',
} as const;

export type GHLCustomField = { id: string; value: unknown };

export type GHLContact = {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  // Parsed lease custom fields
  leaseStart?: string | null;
  leaseEnd?: string | null;
  isLeaseActive?: boolean;
  monthlyRent?: string | number | null;
};

export type UpsertContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags?: string[];
  customFields?: GHLCustomField[];
};

export function getCredentials(): { token: string; locationId: string | undefined } {
  const token = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID;
  if (!token) {
    throw new Error(
      'GoHighLevel is not configured: set GHL_API_KEY (or GHL_ACCESS_TOKEN).'
    );
  }
  return { token, locationId };
}

/** True when GHL credentials are present. Lets callers skip sync gracefully. */
export function isGHLConfigured(): boolean {
  return Boolean(process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN);
}

export async function ghlFetch(
  path: string,
  init: { method?: string; body?: unknown; version?: string } = {}
): Promise<any> {
  const { token } = getCredentials();
  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method: init.method || 'GET',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${token}`,
      Version: init.version || GHL_API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`GHL ${init.method || 'GET'} ${path} failed (${res.status}): ${errorText}`);
  }

  // Some endpoints (e.g. tags) may return empty bodies.
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

function getFieldVal(fields: GHLCustomField[] | undefined, id: string): unknown {
  return (fields || []).find((f) => f.id === id)?.value;
}

function coerceLeaseActive(raw: unknown): boolean {
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw === '1';
  return Boolean(raw);
}

function parseGHLContact(raw: any): GHLContact {
  const fields: GHLCustomField[] = raw.customFields || raw.customField || [];
  const monthlyRentRaw = getFieldVal(fields, GHL_FIELD_IDS.MONTHLY_RENT);

  return {
    id: raw.id,
    email: raw.email,
    name: raw.contactName || [raw.firstName, raw.lastName].filter(Boolean).join(' ') || undefined,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    address: raw.address1 || raw.address,
    city: raw.city,
    state: raw.state,
    postalCode: raw.postalCode,
    leaseStart: (getFieldVal(fields, GHL_FIELD_IDS.LEASE_START) as string) || null,
    leaseEnd: (getFieldVal(fields, GHL_FIELD_IDS.LEASE_END) as string) || null,
    isLeaseActive: coerceLeaseActive(getFieldVal(fields, GHL_FIELD_IDS.LEASE_ACTIVE)),
    monthlyRent: (monthlyRentRaw as string | number) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getGHLContactByEmail(email: string): Promise<GHLContact | null> {
  const { locationId } = getCredentials();
  const data = await ghlFetch('/contacts/search', {
    method: 'POST',
    body: { locationId, query: email },
  });

  const contact = data.contacts?.find(
    (c: any) => c.email?.toLowerCase() === email.toLowerCase()
  );
  return contact ? parseGHLContact(contact) : null;
}

export async function getGHLContactById(contactId: string): Promise<GHLContact | null> {
  try {
    const data = await ghlFetch(`/contacts/${contactId}`);
    return data.contact ? parseGHLContact(data.contact) : null;
  } catch (err) {
    console.error(`GHL getContactById(${contactId}) failed:`, err);
    return null;
  }
}

/**
 * Search all contacts carrying a given tag (e.g. "active"), paginating through
 * the v2 search API. Used to import an "active tenants" smart-list equivalent.
 */
export async function searchGHLContactsByTag(tag: string): Promise<GHLContact[]> {
  const { locationId } = getCredentials();
  const pageLimit = 100;
  const MAX_PAGES = 50; // safety backstop (~5k contacts)
  const all: GHLContact[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const data = await ghlFetch('/contacts/search', {
      method: 'POST',
      body: {
        locationId,
        page,
        pageLimit,
        filters: [{ field: 'tags', operator: 'contains', value: tag }],
      },
    });

    const contacts: any[] = data.contacts || [];
    all.push(...contacts.map(parseGHLContact));

    const total = data.total ?? all.length;
    if (contacts.length < pageLimit) break;
    if (total && all.length >= total) break;

    page += 1;
    // CARIV throttles ~11 rapid calls -> space requests out.
    await new Promise((r) => setTimeout(r, 500));
  }

  return all;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Create or update a contact, matched by email within the location.
 * Returns the resulting GHL contact id.
 */
export async function upsertGHLContact(input: UpsertContactInput): Promise<string> {
  const { locationId } = getCredentials();

  const body: Record<string, unknown> = {
    locationId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    address1: input.address,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    tags: input.tags,
    customFields: input.customFields,
  };

  // Strip undefined so we don't overwrite existing GHL values with blanks.
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const data = await ghlFetch('/contacts/upsert', { method: 'POST', body });
  return data.contact?.id || data.id;
}

/** Update specific custom fields on an existing contact. */
export async function updateGHLContactCustomFields(
  contactId: string,
  customFields: GHLCustomField[]
): Promise<void> {
  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: { customFields },
  });
}

/** Append a note to a contact's timeline. */
export async function addGHLContactNote(contactId: string, body: string): Promise<void> {
  await ghlFetch(`/contacts/${contactId}/notes`, {
    method: 'POST',
    body: { body },
  });
}

/** Add one or more tags to a contact. */
export async function addGHLContactTags(contactId: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  await ghlFetch(`/contacts/${contactId}/tags`, {
    method: 'POST',
    body: { tags },
  });
}

/**
 * Send an email to a contact via the GHL Conversations API.
 * Requires a sending email/domain to be configured in the GHL location.
 */
export async function sendGHLEmail(
  contactId: string,
  subject: string,
  html: string
): Promise<void> {
  await ghlFetch('/conversations/messages', {
    method: 'POST',
    body: { type: 'Email', contactId, subject, html },
  });
}

// ---------------------------------------------------------------------------
// Contractor messaging: SMS, workflow enrollment (voicemail drops and calls),
// contact assignment, and the lookups the setup screen needs.
// ---------------------------------------------------------------------------

/** CARIV rejects bursts with 403s; every multi-call flow waits this long between calls. */
export const GHL_THROTTLE_MS = 500;

export function ghlThrottle(ms: number = GHL_THROTTLE_MS): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Send an SMS to a contact from the location's default number. */
export async function sendGHLSMS(
  contactId: string,
  message: string
): Promise<{ messageId?: string; conversationId?: string }> {
  const data = await ghlFetch('/conversations/messages', {
    method: 'POST',
    body: { type: 'SMS', contactId, message },
  });
  return { messageId: data.messageId || data.msg || data.id, conversationId: data.conversationId };
}

/**
 * Enroll a contact in a published workflow. This is how the app triggers the
 * Voicemail and Call actions, which are not reachable as plain API messages.
 */
export async function enrollGHLContactInWorkflow(
  contactId: string,
  workflowId: string,
  eventStartTime: string = new Date().toISOString()
): Promise<any> {
  return ghlFetch(`/contacts/${contactId}/workflow/${workflowId}`, {
    method: 'POST',
    body: { eventStartTime },
  });
}

/** Point a contact at a GHL user; the workflow Call action rings that user first. */
export async function setGHLContactAssignedUser(contactId: string, userId: string): Promise<void> {
  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: { assignedTo: userId },
  });
}

/** Update basic fields on an existing contact. Undefined keys are left alone. */
export async function updateGHLContact(
  contactId: string,
  input: { firstName?: string; lastName?: string; phone?: string; email?: string; companyName?: string }
): Promise<void> {
  const body: Record<string, unknown> = { ...input };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  if (!Object.keys(body).length) return;
  await ghlFetch(`/contacts/${contactId}`, { method: 'PUT', body });
}

/** Create a contact that has no email (upsert needs one). Returns the id. */
export async function createGHLContact(input: {
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  companyName?: string;
  tags?: string[];
}): Promise<string> {
  const { locationId } = getCredentials();
  const body: Record<string, unknown> = { locationId, ...input };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const data = await ghlFetch('/contacts/', { method: 'POST', body });
  return data.contact?.id || data.id;
}

/** Find a contact by exact E.164 phone. */
export async function getGHLContactByPhone(phone: string): Promise<GHLContact | null> {
  const { locationId } = getCredentials();
  const data = await ghlFetch('/contacts/search', {
    method: 'POST',
    body: { locationId, query: phone },
  });
  const digits = phone.replace(/\D/g, '');
  const contact = data.contacts?.find((c: any) => String(c.phone || '').replace(/\D/g, '') === digits);
  return contact ? parseGHLContact(contact) : null;
}

export type GHLWorkflowSummary = { id: string; name: string; status: string };
export type GHLUserSummary = { id: string; name: string; email: string };

export async function listGHLWorkflows(): Promise<GHLWorkflowSummary[]> {
  const { locationId } = getCredentials();
  const data = await ghlFetch(`/workflows/?locationId=${encodeURIComponent(locationId || '')}`);
  return (data.workflows || []).map((w: any) => ({ id: w.id, name: w.name, status: w.status || '' }));
}

export async function listGHLUsers(): Promise<GHLUserSummary[]> {
  const { locationId } = getCredentials();
  const data = await ghlFetch(`/users/?locationId=${encodeURIComponent(locationId || '')}`);
  return (data.users || []).map((u: any) => ({
    id: u.id,
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '),
    email: u.email || '',
  }));
}
