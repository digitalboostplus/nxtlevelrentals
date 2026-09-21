// Idempotent setup for the GoHighLevel "Maintenance Requests" custom object.
//
// Creates the object, its fields and the Contact/Property associations when
// they are missing, merges missing option values, and prints the .env block
// the app needs. Safe to re-run; the second run reports nothing to create.
//
// Usage:
//   npm run setup:ghl-maintenance-object -- --dry-run   # show the diff, write nothing
//   npm run setup:ghl-maintenance-object                # apply
//   npm run setup:ghl-maintenance-object -- --probe     # also write+read+delete one record
//                                                       # to learn how option values round-trip

import './load-env';
import { ASSOCIATIONS, MAINTENANCE_FIELDS, MAINTENANCE_OBJECT, diffMaintenanceSchema, fullFieldKey, type ExistingField, type FieldSpec } from '../lib/ghlMaintenanceSchema';

const BASE = 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.LOCATION_ID || '';
const OBJECT_KEY = process.env.GHL_MAINTENANCE_OBJECT_KEY || MAINTENANCE_OBJECT.key;
const DRY_RUN = process.argv.includes('--dry-run');
const PROBE = process.argv.includes('--probe');
const VERSIONS = Array.from(new Set([process.env.GHL_OBJECTS_API_VERSION, '2021-07-28', 'v3'].filter(Boolean))) as string[];
const ASSOC_VERSIONS = Array.from(new Set([process.env.GHL_ASSOCIATIONS_API_VERSION, 'v3', '2021-07-28'].filter(Boolean))) as string[];
const THROTTLE_MS = 500; // CARIV rejects bursts with 403s.

if (!TOKEN || !LOCATION_ID) { console.error('Set GHL_API_KEY and GHL_LOCATION_ID in .env'); process.exit(1); }

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const q = (params: Record<string, string>) => new URLSearchParams(params).toString();

async function call(version: string, path: string, init: { method?: string; body?: unknown } = {}) {
  await sleep(THROTTLE_MS);
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${TOKEN}`, Version: version, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function write(version: string, path: string, body: unknown, method = 'POST') {
  if (DRY_RUN) { console.log(`  [dry-run] ${method} ${path}`, JSON.stringify(body)); return Promise.resolve({ ok: true, status: 0, json: {} }); }
  return call(version, path, { method, body });
}

async function resolveVersion(): Promise<string> {
  for (const v of VERSIONS) {
    const r = await call(v, `/objects/?${q({ locationId: LOCATION_ID })}`);
    console.log(`Objects API Version ${v} -> HTTP ${r.status}`);
    if (r.ok) return v;
  }
  throw new Error('No Objects API version accepted; set GHL_OBJECTS_API_VERSION');
}

async function ensureObject(version: string) {
  const r = await call(version, `/objects/${encodeURIComponent(OBJECT_KEY)}?${q({ locationId: LOCATION_ID, fetchProperties: 'true' })}`);
  if (r.ok && (r.json.object || r.json.key)) { console.log(`Object ${OBJECT_KEY} exists`); return; }
  console.log(`Object ${OBJECT_KEY} missing (HTTP ${r.status}); creating`);
  const created = await write(version, '/objects/', {
    labels: MAINTENANCE_OBJECT.labels,
    key: OBJECT_KEY,
    description: MAINTENANCE_OBJECT.description,
    locationId: LOCATION_ID,
    primaryDisplayPropertyDetails: { key: fullFieldKey(MAINTENANCE_OBJECT.primary.key, OBJECT_KEY), name: MAINTENANCE_OBJECT.primary.name, dataType: MAINTENANCE_OBJECT.primary.dataType },
  });
  if (!created.ok) throw new Error(`Create object failed (${created.status}): ${JSON.stringify(created.json)}`);
}

async function listFields(version: string): Promise<{ fields: ExistingField[]; folders: Array<{ id: string; name?: string }> }> {
  const r = await call(version, `/custom-fields/object-key/${encodeURIComponent(OBJECT_KEY)}?${q({ locationId: LOCATION_ID })}`);
  if (!r.ok) { if (DRY_RUN) return { fields: [], folders: [] }; throw new Error(`List fields failed (${r.status}): ${JSON.stringify(r.json)}`); }
  return { fields: r.json.fields || r.json.customFields || [], folders: r.json.folders || [] };
}

function fieldBody(spec: FieldSpec, parentId?: string) {
  return {
    locationId: LOCATION_ID,
    objectKey: OBJECT_KEY,
    fieldKey: fullFieldKey(spec.key, OBJECT_KEY),
    name: spec.name,
    dataType: spec.dataType,
    showInForms: true,
    ...(spec.options ? { options: spec.options.map(label => ({ key: slug(label), label })) } : {}),
    ...(parentId ? { parentId } : {}),
  };
}

async function ensureFields(version: string) {
  const { fields, folders } = await listFields(version);
  const plan = diffMaintenanceSchema(fields);
  console.log(`Fields: ${fields.length} present, ${plan.create.length} to create, ${plan.updateOptions.length} option merges, ${plan.typeMismatch.length} type mismatches`);
  for (const m of plan.typeMismatch) console.warn(`  ! ${m.key} is ${m.actual} in GHL but the app expects ${m.expected}; fix by hand`);
  let parentId: string | undefined = folders[0]?.id;
  for (const spec of plan.create) {
    let r = await write(version, '/custom-fields/', fieldBody(spec, parentId));
    if (!r.ok && /parentId/i.test(JSON.stringify(r.json)) && !parentId) {
      const folder = await write(version, '/custom-fields/folder', { objectKey: OBJECT_KEY, name: 'Maintenance', locationId: LOCATION_ID });
      parentId = folder.json?.id || folder.json?.folder?.id;
      console.log(`  created folder ${parentId}`);
      r = await write(version, '/custom-fields/', fieldBody(spec, parentId));
    }
    if (!r.ok) throw new Error(`Create field ${spec.key} failed (${r.status}): ${JSON.stringify(r.json)}`);
    console.log(`  + ${spec.key}`);
  }
  for (const u of plan.updateOptions) {
    const r = await write(version, `/custom-fields/${u.id}`, { locationId: LOCATION_ID, showInForms: true, options: u.options.map(label => ({ key: slug(label), label })) }, 'PUT');
    if (!r.ok) throw new Error(`Update options ${u.key} failed (${r.status}): ${JSON.stringify(r.json)}`);
    console.log(`  ~ ${u.key} options -> ${u.options.join(', ')}`);
  }
}

async function ensureAssociation(spec: { key: string; firstObjectKey: string; firstObjectLabel: string; secondObjectLabel: string }): Promise<{ id: string; version: string }> {
  for (const v of ASSOC_VERSIONS) {
    const r = await call(v, `/associations/key/${encodeURIComponent(spec.key)}?${q({ locationId: LOCATION_ID })}`);
    if (r.ok && r.json.id) { console.log(`Association ${spec.key} exists (${r.json.id}, Version ${v})`); return { id: r.json.id, version: v }; }
    if (r.status === 404 || r.status === 400) {
      console.log(`Association ${spec.key} missing; creating`);
      const c = await write(v, '/associations/', {
        locationId: LOCATION_ID, key: spec.key,
        firstObjectLabel: spec.firstObjectLabel, firstObjectKey: spec.firstObjectKey,
        secondObjectLabel: spec.secondObjectLabel, secondObjectKey: OBJECT_KEY,
      });
      if (c.ok) return { id: c.json.id || '(dry-run)', version: v };
      console.warn(`  Version ${v}: create failed (${c.status}) ${JSON.stringify(c.json).slice(0, 300)}`);
    }
  }
  throw new Error(`Could not read or create association ${spec.key}`);
}

async function probe(version: string): Promise<'label' | 'key' | 'unknown'> {
  const labelValues = { title: 'PROBE — delete me', ticket_id: 'probe', issue_type: 'Plumbing', priority: 'Low', status: 'Submitted', source: 'Backfill', issue_description: 'setup probe' };
  const created = await call(version, `/objects/${encodeURIComponent(OBJECT_KEY)}/records`, { method: 'POST', body: { locationId: LOCATION_ID, properties: labelValues } });
  if (!created.ok) { console.warn(`Probe create failed (${created.status}): ${JSON.stringify(created.json).slice(0, 400)}`); return 'unknown'; }
  const id = created.json.record?.id || created.json.id;
  const read = await call(version, `/objects/${encodeURIComponent(OBJECT_KEY)}/records/${id}?${q({ locationId: LOCATION_ID })}`);
  const props = read.json.record?.properties || read.json.properties || {};
  console.log('Probe record properties:', JSON.stringify(props));
  const mode = props.issue_type === 'Plumbing' ? 'label' : props.issue_type === 'plumbing' ? 'key' : 'unknown';
  // DELETE wants the location in the body; the query form is rejected with 422.
  const del = await call(version, `/objects/${encodeURIComponent(OBJECT_KEY)}/records/${id}`, { method: 'DELETE', body: { locationId: LOCATION_ID } });
  console.log(del.ok ? `Probe record ${id} deleted` : `Probe record ${id} could not be deleted (HTTP ${del.status}); remove it in GHL`);
  return mode;
}

async function main() {
  console.log(`Location ${LOCATION_ID}${DRY_RUN ? ' (dry run)' : ''}`);
  const version = await resolveVersion();
  await ensureObject(version);
  await ensureFields(version);
  const tenant = await ensureAssociation(ASSOCIATIONS.tenant);
  const property = await ensureAssociation(ASSOCIATIONS.property);
  const mode = PROBE && !DRY_RUN ? await probe(version) : (process.env.GHL_MAINT_OPTION_VALUE_MODE || 'label');
  console.log('\n# Paste into .env');
  console.log(`GHL_OBJECTS_API_VERSION=${version}`);
  console.log(`GHL_ASSOCIATIONS_API_VERSION=${tenant.version}`);
  console.log(`GHL_MAINTENANCE_OBJECT_KEY=${OBJECT_KEY}`);
  console.log(`GHL_MAINT_ASSOC_TENANT_ID=${tenant.id}`);
  console.log(`GHL_MAINT_ASSOC_PROPERTY_ID=${property.id}`);
  console.log(`GHL_MAINT_OPTION_VALUE_MODE=${mode}`);
  if (!MAINTENANCE_FIELDS.length) throw new Error('unreachable');
}

main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; });
