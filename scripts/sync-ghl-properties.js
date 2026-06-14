// Bulk-sync the GoHighLevel "Properties" custom object into Firestore.
//
// CLI parity with the admin "Sync from GHL" button (pages/api/admin/sync-properties.ts).
// Canonical mapping logic lives in lib/ghl-properties.ts; this is a compact JS
// port for ops use. Writes via Firebase Admin (Application Default Credentials).
//
// Usage:
//   GHL_API_KEY=pit-xxx GHL_LOCATION_ID=loc-xxx node scripts/sync-ghl-properties.js
//   (or `npm run sync:ghl-properties`)

require('./load-env');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rental-tracker-app-2026',
  });
}
const db = admin.firestore();

const BASE = 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID;
const VERSIONS = [process.env.GHL_OBJECTS_API_VERSION, '2021-07-28', '2023-02-21'].filter(Boolean);

if (!TOKEN || !LOCATION_ID) {
  console.error('Missing GHL_API_KEY/GHL_ACCESS_TOKEN or GHL_LOCATION_ID/LOCATION_ID.');
  process.exit(1);
}

let VERSION = VERSIONS[0];

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, json };
}

// ---- compact mapper (mirrors lib/ghl-properties.ts) ----
const CANDIDATES = {
  name: ['name', 'property_name', 'title'],
  address: ['address', 'full_address', 'street_address', 'property_address', 'location'],
  description: ['description', 'details', 'notes'],
  rent: ['rent', 'monthly_rent', 'price', 'rent_amount'],
  bedrooms: ['bedrooms', 'beds', 'bedroom'],
  bathrooms: ['bathrooms', 'baths', 'bathroom'],
  squareFeet: ['square_feet', 'squarefeet', 'sqft', 'sq_ft', 'size', 'area'],
  available: ['available', 'is_available', 'availability', 'vacant', 'status'],
  images: ['images', 'image', 'photos', 'photo'],
  amenities: ['amenities', 'features', 'amenity'],
};
const FIELD_ENV = {
  name: process.env.GHL_PROP_FIELD_NAME,
  address: process.env.GHL_PROP_FIELD_ADDRESS,
  description: process.env.GHL_PROP_FIELD_DESCRIPTION,
  rent: process.env.GHL_PROP_FIELD_RENT,
  bedrooms: process.env.GHL_PROP_FIELD_BEDROOMS,
  bathrooms: process.env.GHL_PROP_FIELD_BATHROOMS,
  squareFeet: process.env.GHL_PROP_FIELD_SQFT,
  available: process.env.GHL_PROP_FIELD_AVAILABLE,
  images: process.env.GHL_PROP_FIELD_IMAGES,
  amenities: process.env.GHL_PROP_FIELD_AMENITIES,
};

const normKey = (k) => {
  const last = k.includes('.') ? k.slice(k.lastIndexOf('.') + 1) : k;
  return last.toLowerCase().replace(/[^a-z0-9]/g, '');
};

function buildLookup(properties) {
  const byId = {};
  const byKey = {};
  if (Array.isArray(properties)) {
    for (const f of properties) {
      if (!f) continue;
      if (f.id != null) byId[String(f.id)] = f.value;
      const k = f.fieldKey || f.key || f.name;
      if (k != null) byKey[normKey(String(k))] = f.value;
    }
  } else if (properties && typeof properties === 'object') {
    for (const [k, v] of Object.entries(properties)) {
      byId[k] = v;
      byKey[normKey(k)] = v;
    }
  }
  return { byId, byKey };
}

function pickVal(lookup, ref, candidates) {
  if (ref) {
    if (lookup.byId[ref] !== undefined) return lookup.byId[ref];
    const nk = normKey(ref);
    if (lookup.byKey[nk] !== undefined) return lookup.byKey[nk];
  }
  for (const c of candidates) {
    const v = lookup.byKey[normKey(c)];
    if (v !== undefined) return v;
  }
  const keys = Object.keys(lookup.byKey);
  for (const c of candidates) {
    const nc = normKey(c);
    const hit = keys.find((k) => k === nc || k.includes(nc));
    if (hit && lookup.byKey[hit] !== undefined) return lookup.byKey[hit];
  }
  return undefined;
}

const toStr = (v) =>
  v == null ? '' : Array.isArray(v) ? v.map(toStr).filter(Boolean).join(', ') : String(v).trim();
const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  // GHL MONETORY/currency fields arrive as { currency, value }.
  if (typeof v === 'object') {
    const inner = v.value != null ? v.value : v.amount;
    return inner != null ? toNum(inner) : 0;
  }
  return 0;
};
const toArr = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((i) => (i && typeof i === 'object' ? toStr(i.url || i.value || i.name) : toStr(i))).filter(Boolean);
  if (typeof v === 'string') return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return [];
};
const toAvailable = (v) => {
  if (v == null) return true;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  const s = String(v).toLowerCase().trim();
  if (['occupied', 'rented', 'unavailable', 'no', 'false', '0', 'inactive', 'leased'].includes(s)) return false;
  return true;
};

function mapRecord(rec) {
  const id = String(rec.id || rec._id || rec.recordId || '');
  const props = rec.properties || rec.customFields || rec.data || rec.values || {};
  const lookup = buildLookup(props);
  return {
    id,
    name: toStr(pickVal(lookup, FIELD_ENV.name, CANDIDATES.name)),
    address: toStr(pickVal(lookup, FIELD_ENV.address, CANDIDATES.address)),
    description: toStr(pickVal(lookup, FIELD_ENV.description, CANDIDATES.description)),
    rent: toNum(pickVal(lookup, FIELD_ENV.rent, CANDIDATES.rent)),
    bedrooms: toNum(pickVal(lookup, FIELD_ENV.bedrooms, CANDIDATES.bedrooms)),
    bathrooms: toNum(pickVal(lookup, FIELD_ENV.bathrooms, CANDIDATES.bathrooms)),
    squareFeet: toNum(pickVal(lookup, FIELD_ENV.squareFeet, CANDIDATES.squareFeet)),
    available: toAvailable(pickVal(lookup, FIELD_ENV.available, CANDIDATES.available)),
    images: toArr(pickVal(lookup, FIELD_ENV.images, CANDIDATES.images)),
    amenities: toArr(pickVal(lookup, FIELD_ENV.amenities, CANDIDATES.amenities)),
  };
}

async function resolveVersionAndKey() {
  for (const v of VERSIONS) {
    VERSION = v;
    const r = await call(`/objects/?locationId=${encodeURIComponent(LOCATION_ID)}`);
    if (!r.ok) continue;
    if (process.env.GHL_PROPERTY_OBJECT_KEY) return process.env.GHL_PROPERTY_OBJECT_KEY;
    const objects = r.json.objects || r.json.customObjects || r.json.data || [];
    const isProp = (s) => !!s && /propert/i.test(s);
    const match = objects.find(
      (o) => isProp(o.key) || isProp(o.labels && o.labels.singular) || isProp(o.labels && o.labels.plural)
    );
    if (match) return match.key;
  }
  return process.env.GHL_PROPERTY_OBJECT_KEY || null;
}

async function fetchAll(key) {
  const all = [];
  let page = 1;
  const pageLimit = 100;
  while (page <= 100) {
    const r = await call(`/objects/${encodeURIComponent(key)}/records/search`, {
      method: 'POST',
      body: { locationId: LOCATION_ID, page, pageLimit },
    });
    if (!r.ok) break;
    const recs = (r.json.records || r.json.data || []).map((x) => x.record || x);
    all.push(...recs);
    const total = r.json.total != null ? r.json.total : (r.json.pageInfo && r.json.pageInfo.total);
    if (recs.length < pageLimit) break;
    if (total && all.length >= total) break;
    page += 1;
    await new Promise((res) => setTimeout(res, 200));
  }
  return all;
}

async function main() {
  const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run');
  console.log(`--- Syncing GHL Properties -> Firestore ${DRY ? '(DRY RUN — no writes)' : ''} ---`);
  const key = await resolveVersionAndKey();
  if (!key) {
    console.error('Could not resolve a Properties object key. Run: npm run discover:ghl-properties');
    process.exit(1);
  }
  console.log(`Object key: ${key} (Version ${VERSION})`);

  const records = await fetchAll(key);
  console.log(`Fetched ${records.length} record(s).`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const rec of records) {
    const m = mapRecord(rec);
    if (!m.name && !m.address) {
      skipped++;
      continue;
    }
    const ref = db.collection('properties').doc(`ghl-${m.id}`);
    const existing = await ref.get();
    const data = {
      name: m.name || m.address,
      address: m.address,
      description: m.description,
      rent: m.rent,
      bedrooms: m.bedrooms,
      bathrooms: m.bathrooms,
      squareFeet: m.squareFeet,
      available: m.available,
      amenities: m.amenities,
      ghlObjectId: m.id,
      ghlObjectKey: key,
      source: 'ghl',
      lastSyncedAt: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (m.images.length) data.images = m.images;
    else if (!existing.exists) data.images = [];
    if (!existing.exists) data.createdAt = admin.firestore.FieldValue.serverTimestamp();

    if (!DRY) await ref.set(data, { merge: true });
    if (existing.exists) updated++;
    else created++;
    if (!DRY) await new Promise((res) => setTimeout(res, 200));
  }

  console.log(`\n${DRY ? 'DRY RUN complete' : 'Done'}. ${created} new, ${updated} updated, ${skipped} skipped.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
}

module.exports = { mapRecord };
