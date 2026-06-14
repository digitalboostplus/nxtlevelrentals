// Read-only discovery for the GoHighLevel "Properties" custom object.
//
// Lists the location's custom objects, prints the Properties schema (field
// ids/keys/types) and one sample record, and emits a ready-to-paste env block.
// It also resolves which API "Version" header your account accepts.
//
// Usage:
//   GHL_API_KEY=pit-xxx GHL_LOCATION_ID=loc-xxx node scripts/discover-ghl-properties.js
//   (or `npm run discover:ghl-properties` with those vars in your environment)

require('./load-env');
const fetch = require('node-fetch');

const BASE = 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID;

// Try the configured version first, then known alternates.
const VERSIONS = [
  process.env.GHL_OBJECTS_API_VERSION,
  '2021-07-28',
  '2023-02-21',
].filter(Boolean);

if (!TOKEN) {
  console.error('Missing GHL_API_KEY (or GHL_ACCESS_TOKEN).');
  process.exit(1);
}
if (!LOCATION_ID) {
  console.error('Missing GHL_LOCATION_ID (or LOCATION_ID).');
  process.exit(1);
}

async function call(version, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: version,
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
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function resolveVersion() {
  for (const v of VERSIONS) {
    const r = await call(v, `/objects/?locationId=${encodeURIComponent(LOCATION_ID)}`);
    console.log(`  Version ${v} -> HTTP ${r.status}`);
    if (r.ok) return { version: v, objectsResponse: r.json };
  }
  return null;
}

function looksLikeProperty(s) {
  return !!s && /propert/i.test(s);
}

async function main() {
  console.log('=== GHL Custom Objects discovery ===');
  console.log('Resolving API Version header...');
  const resolved = await resolveVersion();
  if (!resolved) {
    console.error('\nNo Version header succeeded. Check token/location id and GHL custom-objects access.');
    process.exit(1);
  }
  const { version, objectsResponse } = resolved;
  console.log(`\n✅ Using Version: ${version}\n`);

  const objects = objectsResponse.objects || objectsResponse.customObjects || objectsResponse.data || [];
  console.log(`Found ${objects.length} object(s):`);
  for (const o of objects) {
    const flag = looksLikeProperty(o.key) || looksLikeProperty(o.labels?.singular) || looksLikeProperty(o.labels?.plural)
      ? '  <-- looks like Properties'
      : '';
    console.log(`  • key=${o.key}  labels=${JSON.stringify(o.labels)}${flag}`);
  }

  const prop = objects.find(
    (o) => looksLikeProperty(o.key) || looksLikeProperty(o.labels?.singular) || looksLikeProperty(o.labels?.plural)
  );
  const key = process.env.GHL_PROPERTY_OBJECT_KEY || prop?.key;
  if (!key) {
    console.error('\nCould not auto-detect a Properties object. Set GHL_PROPERTY_OBJECT_KEY to one of the keys above.');
    process.exit(1);
  }
  console.log(`\nUsing object key: ${key}`);

  // Schema
  const schema = await call(
    version,
    `/objects/${encodeURIComponent(key)}?locationId=${encodeURIComponent(LOCATION_ID)}&fetchProperties=true`
  );
  const schemaObj = schema.json.object || schema.json;
  const fields = schema.json.fields || schemaObj.fields || schemaObj.properties || [];
  console.log(`\n--- Schema fields (${fields.length}) ---`);
  for (const f of fields) {
    console.log(`  id=${f.id}  fieldKey=${f.fieldKey || f.key}  name=${f.name}  type=${f.dataType}`);
  }

  // One sample record
  const search = await call(version, `/objects/${encodeURIComponent(key)}/records/search`, {
    method: 'POST',
    body: { locationId: LOCATION_ID, page: 1, pageLimit: 1 },
  });
  const records = search.json.records || search.json.data || [];
  console.log(`\n--- Sample record (total=${search.json.total ?? records.length}) ---`);
  console.log(JSON.stringify(records[0] || {}, null, 2));

  console.log('\n--- Suggested .env block ---');
  console.log(`GHL_OBJECTS_API_VERSION=${version}`);
  console.log(`GHL_PROPERTY_OBJECT_KEY=${key}`);
  console.log(
    '# Optionally pin fields (else they are auto-detected by name):\n' +
      '# GHL_PROP_FIELD_NAME=\n# GHL_PROP_FIELD_ADDRESS=\n# GHL_PROP_FIELD_DESCRIPTION=\n' +
      '# GHL_PROP_FIELD_RENT=\n# GHL_PROP_FIELD_BEDROOMS=\n# GHL_PROP_FIELD_BATHROOMS=\n' +
      '# GHL_PROP_FIELD_SQFT=\n# GHL_PROP_FIELD_AVAILABLE=\n# GHL_PROP_FIELD_IMAGES=\n# GHL_PROP_FIELD_AMENITIES='
  );
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
