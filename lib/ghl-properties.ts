// GoHighLevel (LeadConnector) v2 Custom Objects client — "Properties".
//
// The contacts client in ./ghl.ts only knows about contacts. GHL stores
// properties as a *custom object*, which lives on a different API surface
// (`/objects/...`). This module discovers the Properties object, reads its
// records, and maps each record onto the app's Firestore `Property` shape.
//
// Two things vary between GHL accounts and are handled defensively:
//   1. The API version header. Contacts use 2021-07-28; some accounts require a
//      newer value for Objects. Override via GHL_OBJECTS_API_VERSION if needed.
//   2. The custom field keys/ids on the object. These are auto-detected by a
//      name heuristic, and can be pinned exactly via GHL_PROP_FIELD_* env vars
//      (run `npm run discover:ghl-properties` to see the real keys).

import { ghlFetch, getCredentials, isGHLConfigured } from './ghl';

export { isGHLConfigured };

// Objects API version — overridable because some accounts require a newer value.
const OBJECTS_API_VERSION = process.env.GHL_OBJECTS_API_VERSION || '2021-07-28';

// The custom object key, e.g. "custom_objects.properties". Blank => auto-discover.
export const GHL_PROPERTY_OBJECT_KEY = process.env.GHL_PROPERTY_OBJECT_KEY || '';

// Field references. Each may be a GHL field id OR fieldKey. Blank values fall
// back to a name heuristic in the mapper (see CANDIDATES below).
export const GHL_PROPERTY_FIELD_IDS = {
  NAME: process.env.GHL_PROP_FIELD_NAME || '',
  ADDRESS: process.env.GHL_PROP_FIELD_ADDRESS || '',
  DESCRIPTION: process.env.GHL_PROP_FIELD_DESCRIPTION || '',
  RENT: process.env.GHL_PROP_FIELD_RENT || '',
  BEDROOMS: process.env.GHL_PROP_FIELD_BEDROOMS || '',
  BATHROOMS: process.env.GHL_PROP_FIELD_BATHROOMS || '',
  SQUARE_FEET: process.env.GHL_PROP_FIELD_SQFT || '',
  AVAILABLE: process.env.GHL_PROP_FIELD_AVAILABLE || '',
  IMAGES: process.env.GHL_PROP_FIELD_IMAGES || '',
  AMENITIES: process.env.GHL_PROP_FIELD_AMENITIES || '',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GHLObjectSummary = {
  id?: string;
  key: string;
  labels?: { singular?: string; plural?: string };
};

export type GHLObjectField = {
  id?: string;
  fieldKey?: string;
  name?: string;
  dataType?: string;
};

export type GHLObjectSchema = {
  id?: string;
  key: string;
  labels?: { singular?: string; plural?: string };
  fields: GHLObjectField[];
};

// A record normalized to a stable shape regardless of GHL's response variant.
export type GHLPropertyField = { id?: string; fieldKey?: string; key?: string; name?: string; value: unknown };

export type GHLPropertyRecord = {
  id: string;
  properties: Record<string, unknown> | GHLPropertyField[];
  raw: any;
};

export type MappedProperty = {
  ghlObjectId: string;
  name: string;
  address: string;
  description: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  available: boolean;
  images: string[];
  amenities: string[];
};

// ---------------------------------------------------------------------------
// Low-level requests
// ---------------------------------------------------------------------------

function objectsFetch(path: string, init: { method?: string; body?: unknown } = {}) {
  return ghlFetch(path, { ...init, version: OBJECTS_API_VERSION });
}

/** List every object (standard + custom) configured for the location. */
export async function listGHLObjects(): Promise<GHLObjectSummary[]> {
  const { locationId } = getCredentials();
  const data = await objectsFetch(`/objects/?locationId=${encodeURIComponent(locationId || '')}`);
  const objects = data.objects || data.customObjects || data.data || [];
  return (objects as any[]).map((o) => ({
    id: o.id,
    key: o.key,
    labels: o.labels,
  }));
}

/** Fetch an object's schema (including its fields) by key. */
export async function getGHLObjectSchema(key: string): Promise<GHLObjectSchema | null> {
  const { locationId } = getCredentials();
  try {
    const data = await objectsFetch(
      `/objects/${encodeURIComponent(key)}?locationId=${encodeURIComponent(locationId || '')}&fetchProperties=true`
    );
    const obj = data.object || data;
    const fields = data.fields || obj.fields || obj.properties || [];
    return { id: obj.id, key: obj.key || key, labels: obj.labels, fields };
  } catch (err) {
    console.error(`GHL getObjectSchema(${key}) failed:`, err);
    return null;
  }
}

/**
 * Resolve the Properties custom-object key: explicit env override wins,
 * otherwise find an object whose key/labels look like "propert…". Returns null
 * if none can be found.
 */
export async function discoverPropertyObjectKey(): Promise<string | null> {
  if (GHL_PROPERTY_OBJECT_KEY) return GHL_PROPERTY_OBJECT_KEY;
  const objects = await listGHLObjects();
  const looksLikeProperty = (s?: string) => !!s && /propert/i.test(s);
  const match = objects.find(
    (o) =>
      looksLikeProperty(o.key) ||
      looksLikeProperty(o.labels?.singular) ||
      looksLikeProperty(o.labels?.plural)
  );
  return match?.key || null;
}

/** Like discoverPropertyObjectKey but throws a helpful error when not found. */
export async function resolvePropertyObjectKey(): Promise<string> {
  const key = await discoverPropertyObjectKey();
  if (!key) {
    throw new Error(
      'Could not find a GHL "Properties" custom object. Set GHL_PROPERTY_OBJECT_KEY ' +
        'in your environment, or run `npm run discover:ghl-properties` to list available objects.'
    );
  }
  return key;
}

function normalizeRecord(raw: any): GHLPropertyRecord {
  const rec = raw?.record ?? raw ?? {};
  const id = rec.id ?? rec._id ?? rec.recordId ?? '';
  const properties = rec.properties ?? rec.customFields ?? rec.data ?? rec.values ?? {};
  return { id: String(id), properties, raw: rec };
}

/** Search a single page of property records. */
export async function searchGHLPropertyRecords(opts: {
  page?: number;
  pageLimit?: number;
  searchAfter?: unknown[];
} = {}): Promise<{ records: GHLPropertyRecord[]; total: number; searchAfter?: unknown[] }> {
  const { locationId } = getCredentials();
  const key = await resolvePropertyObjectKey();
  const body: Record<string, unknown> = {
    locationId,
    page: opts.page ?? 1,
    pageLimit: opts.pageLimit ?? 100,
  };
  if (opts.searchAfter) body.searchAfter = opts.searchAfter;

  const data = await objectsFetch(`/objects/${encodeURIComponent(key)}/records/search`, {
    method: 'POST',
    body,
  });

  const rawRecords = data.records || data.data || [];
  const records = (rawRecords as any[]).map(normalizeRecord);
  const total = data.total ?? data.pageInfo?.total ?? records.length;
  const lastRaw = (rawRecords as any[])[rawRecords.length - 1];
  const searchAfter = lastRaw?.searchAfter ?? data.pageInfo?.searchAfter;
  return { records, total, searchAfter };
}

/** Fetch ALL property records, paginating with a small throttle. */
export async function getAllGHLPropertyRecords(): Promise<GHLPropertyRecord[]> {
  const pageLimit = 100;
  const all: GHLPropertyRecord[] = [];
  let page = 1;
  let searchAfter: unknown[] | undefined;
  const MAX_PAGES = 100; // safety backstop (~10k records)

  while (page <= MAX_PAGES) {
    const { records, total, searchAfter: next } = await searchGHLPropertyRecords({
      page,
      pageLimit,
      searchAfter,
    });
    all.push(...records);

    if (records.length < pageLimit) break;
    if (total && all.length >= total) break;

    searchAfter = next as unknown[] | undefined;
    page += 1;
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

/** Fetch a single property record by id. */
export async function getGHLPropertyRecord(id: string): Promise<GHLPropertyRecord | null> {
  const { locationId } = getCredentials();
  const key = await resolvePropertyObjectKey();
  try {
    const data = await objectsFetch(
      `/objects/${encodeURIComponent(key)}/records/${encodeURIComponent(id)}?locationId=${encodeURIComponent(
        locationId || ''
      )}`
    );
    return normalizeRecord(data);
  } catch (err) {
    console.error(`GHL getPropertyRecord(${id}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mapping: GHL record -> Firestore Property
// ---------------------------------------------------------------------------

// Fallback field-name candidates used when no explicit id/key is configured.
const CANDIDATES = {
  name: ['name', 'property_name', 'title', 'property_title'],
  address: ['address', 'full_address', 'street_address', 'property_address', 'location'],
  description: ['description', 'details', 'notes', 'about'],
  rent: ['rent', 'monthly_rent', 'price', 'rent_amount', 'monthlyrent'],
  bedrooms: ['bedrooms', 'beds', 'bedroom', 'num_bedrooms'],
  bathrooms: ['bathrooms', 'baths', 'bathroom', 'num_bathrooms'],
  squareFeet: ['square_feet', 'squarefeet', 'sqft', 'sq_ft', 'size', 'area'],
  available: ['available', 'is_available', 'availability', 'vacant', 'status'],
  images: ['images', 'image', 'photos', 'photo', 'image_url', 'image_urls'],
  amenities: ['amenities', 'features', 'amenity'],
} as const;

/** Normalize a field key/name to bare alphanumerics (last dotted segment). */
function normKey(k: string): string {
  const last = k.includes('.') ? k.slice(k.lastIndexOf('.') + 1) : k;
  return last.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type Lookup = { byId: Record<string, unknown>; byKey: Record<string, unknown> };

function buildLookup(properties: GHLPropertyRecord['properties']): Lookup {
  const byId: Record<string, unknown> = {};
  const byKey: Record<string, unknown> = {};
  if (Array.isArray(properties)) {
    for (const f of properties) {
      if (!f) continue;
      if (f.id != null) byId[String(f.id)] = f.value;
      const k = f.fieldKey ?? f.key ?? f.name;
      if (k != null) byKey[normKey(String(k))] = f.value;
    }
  } else if (properties && typeof properties === 'object') {
    for (const [k, v] of Object.entries(properties)) {
      byId[k] = v; // a flat object's keys may already be field ids
      byKey[normKey(k)] = v;
    }
  }
  return { byId, byKey };
}

function pickVal(lookup: Lookup, configuredRef: string, candidates: readonly string[]): unknown {
  // 1. Explicit configuration (treat as either a field id or a field key).
  if (configuredRef) {
    if (lookup.byId[configuredRef] !== undefined) return lookup.byId[configuredRef];
    const nk = normKey(configuredRef);
    if (lookup.byKey[nk] !== undefined) return lookup.byKey[nk];
  }
  // 2. Exact normalized candidate match.
  for (const c of candidates) {
    const v = lookup.byKey[normKey(c)];
    if (v !== undefined) return v;
  }
  // 3. Loose "contains" match as a last resort.
  const keys = Object.keys(lookup.byKey);
  for (const c of candidates) {
    const nc = normKey(c);
    const hit = keys.find((k) => k === nc || k.includes(nc));
    if (hit && lookup.byKey[hit] !== undefined) return lookup.byKey[hit];
  }
  return undefined;
}

function toStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(toStr).filter(Boolean).join(', ');
  return String(v);
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  // GHL MONETORY/currency fields arrive as { currency, value }.
  if (typeof v === 'object') {
    const inner = (v as any).value ?? (v as any).amount;
    return inner != null ? toNum(inner) : 0;
  }
  return 0;
}

function toArr(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((item) =>
        item && typeof item === 'object'
          ? toStr((item as any).url ?? (item as any).value ?? (item as any).name)
          : toStr(item)
      )
      .filter(Boolean);
  }
  if (typeof v === 'string') {
    return v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Coerce an "available" value; defaults to true when the field is absent. */
function toAvailable(v: unknown): boolean {
  if (v == null) return true; // default per spec
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).toLowerCase().trim();
  if (['occupied', 'rented', 'unavailable', 'no', 'false', '0', 'inactive', 'leased'].includes(s)) {
    return false;
  }
  if (['available', 'vacant', 'yes', 'true', '1', 'active', 'for rent', 'for_rent', 'open'].includes(s)) {
    return true;
  }
  return true; // unknown string -> default available
}

/** Pure, testable mapping from a GHL record to the app's Property fields. */
export function mapGHLRecordToProperty(record: GHLPropertyRecord): MappedProperty {
  const lookup = buildLookup(record.properties);
  const F = GHL_PROPERTY_FIELD_IDS;

  const name = toStr(pickVal(lookup, F.NAME, CANDIDATES.name));
  const address = toStr(pickVal(lookup, F.ADDRESS, CANDIDATES.address));

  return {
    ghlObjectId: record.id,
    name,
    address,
    description: toStr(pickVal(lookup, F.DESCRIPTION, CANDIDATES.description)),
    rent: toNum(pickVal(lookup, F.RENT, CANDIDATES.rent)),
    bedrooms: toNum(pickVal(lookup, F.BEDROOMS, CANDIDATES.bedrooms)),
    bathrooms: toNum(pickVal(lookup, F.BATHROOMS, CANDIDATES.bathrooms)),
    squareFeet: toNum(pickVal(lookup, F.SQUARE_FEET, CANDIDATES.squareFeet)),
    available: toAvailable(pickVal(lookup, F.AVAILABLE, CANDIDATES.available)),
    images: toArr(pickVal(lookup, F.IMAGES, CANDIDATES.images)),
    amenities: toArr(pickVal(lookup, F.AMENITIES, CANDIDATES.amenities)),
  };
}
