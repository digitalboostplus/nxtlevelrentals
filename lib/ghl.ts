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

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

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

function getCredentials(): { token: string; locationId: string | undefined } {
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

async function ghlFetch(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<any> {
  const { token } = getCredentials();
  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
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
