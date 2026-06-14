// Import active tenants from GoHighLevel into Firestore `users` (role: tenant).
//
// CLI parity with the admin "Import active from GHL" button
// (pages/api/admin/import-tenants.ts). Canonical logic lives in
// lib/ghl-sync.ts (importActiveTenantsFromGHL); this is a compact JS port for
// ops/seed use. Records only — no Firebase Auth accounts are created.
//
// Usage:
//   node scripts/import-active-tenants.js            # writes
//   node scripts/import-active-tenants.js --dry      # preview, no writes
//   TENANT_TAG=active node scripts/import-active-tenants.js

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

const TOKEN = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID;
const TAG = process.env.TENANT_TAG || 'active';
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run');

if (!TOKEN || !LOC) {
  console.error('Missing GHL_API_KEY/GHL_ACCESS_TOKEN or GHL_LOCATION_ID/LOCATION_ID.');
  process.exit(1);
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function searchTag(tag) {
  let page = 1;
  const all = [];
  while (page <= 50) {
    const r = await fetch('https://services.leadconnectorhq.com/contacts/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ locationId: LOC, page, pageLimit: 100, filters: [{ field: 'tags', operator: 'contains', value: tag }] }),
    });
    const d = await r.json();
    const cs = d.contacts || [];
    all.push(...cs);
    const total = d.total != null ? d.total : all.length;
    if (cs.length < 100) break;
    if (total && all.length >= total) break;
    page++;
    await new Promise((res) => setTimeout(res, 500));
  }
  return all;
}

async function main() {
  console.log(`--- Importing '${TAG}' tenants -> Firestore ${DRY ? '(DRY RUN — no writes)' : ''} ---`);
  const contacts = await searchTag(TAG);
  console.log(`Found ${contacts.length} '${TAG}' contacts.`);

  const props = (await db.collection('properties').get()).docs
    .map((d) => ({ id: d.id, name: d.data().name || '', addr: norm(d.data().address) }))
    .filter((p) => p.addr);

  let created = 0, updated = 0, skipped = 0, matched = 0, unmatched = 0;

  for (const c of contacts) {
    if (!c.email) { skipped++; continue; }

    const ex = await db.collection('users').where('email', '==', c.email).limit(1).get();
    const isUpdate = !ex.empty;
    const existing = isUpdate ? ex.docs[0].data() : null;
    if (existing && (existing.role === 'admin' || existing.role === 'super-admin')) { skipped++; continue; }

    const ref = isUpdate ? ex.docs[0].ref : db.collection('users').doc(`ghl-${c.id}`);

    const ta = norm(c.address1 || c.address);
    let match;
    if (ta && ta.length >= 5) {
      const hit = props.find((p) => p.addr === ta || p.addr.startsWith(ta) || ta.startsWith(p.addr));
      if (hit) { match = hit; matched++; } else { unmatched++; }
    }

    const displayName = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
    const getCF = (id) => (c.customFields || []).find((f) => f.id === id)?.value;
    const FIELD = { LEASE_START: 'xflK4edwKFVm1pHLJxew', LEASE_END: 'nMzB4QirjN9XP6BQwp0N', LEASE_ACTIVE: 'KMpvAs09LKwF1mQoY6LV', MONTHLY_RENT: 'r9QRb2yRF9i0CjCDhpNA' };
    const activeRaw = getCF(FIELD.LEASE_ACTIVE);

    const data = {
      email: c.email,
      displayName,
      role: 'tenant',
      ghlContactId: c.id,
      phoneNumber: c.phone || null,
      address: c.address1 || c.address || null,
      city: c.city || null,
      state: c.state || null,
      zip: c.postalCode || null,
      monthlyRent: getCF(FIELD.MONTHLY_RENT) ?? null,
      leaseStart: getCF(FIELD.LEASE_START) || null,
      leaseEnd: getCF(FIELD.LEASE_END) || null,
      isLeaseActive: Array.isArray(activeRaw) ? activeRaw.length > 0 : Boolean(activeRaw),
      source: 'ghl',
      lastSyncedAt: new Date().toISOString(),
    };
    if (match && !(existing && existing.propertyIds && existing.propertyIds.length)) {
      data.propertyIds = [match.id];
      data.unit = (existing && existing.unit) || match.name;
    }
    if (!isUpdate) data.createdAt = new Date().toISOString();

    if (!DRY) await ref.set(data, { merge: true });
    if (isUpdate) updated++; else created++;
    if (!DRY) await new Promise((res) => setTimeout(res, 100));
  }

  console.log(`\n${DRY ? 'DRY RUN complete' : 'Done'}. created ${created}, updated ${updated}, skipped ${skipped} (no-email/admin) · matched ${matched}, unmatched ${unmatched}.`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
