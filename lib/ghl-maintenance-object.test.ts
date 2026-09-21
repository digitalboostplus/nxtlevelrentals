import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecordProperties, syncRecord, type MaintenanceGhlPort, type MaintenanceObjectConfig } from './ghl-maintenance-object';

const cfg: MaintenanceObjectConfig = { objectKey: 'custom_objects.maintenance_request', tenantAssociationId: 'assoc-tenant', propertyAssociationId: 'assoc-property', optionValueMode: 'label', portalBase: 'https://app.example' };

const ticket = {
  id: 't1', tenantId: 'u1', propertyId: 'p1', title: 'Leak under sink', description: 'Dripping steadily since Monday', category: 'plumbing', priority: 'urgent',
  status: 'in_progress', permissionToEnter: true, hasPets: false, preferredTime: 'mornings', createdAt: Date.UTC(2026, 8, 18, 15, 0, 0), updatedAt: 0,
  scheduledDate: '2026-09-20', scheduledTime: '14:00', timeZone: 'America/Chicago', assignedVendorName: 'Pat Plumber', assignedVendorPhone: '+18165550100',
  actualCost: 125.5, adminNotes: 'Called tenant', source: 'public-form', tenantName: 'Sam Tenant', images: ['data:image/jpeg;base64,xxx'],
};

test('buildRecordProperties maps a ticket onto the custom object short keys', () => {
  const props = buildRecordProperties(ticket, { propertyAddress: '123 Main St', config: cfg });
  assert.equal(props.title, 'Plumbing: Leak under sink — 123 Main St');
  assert.equal(props.ticket_id, 't1');
  assert.equal(props.issue_type, 'Plumbing');
  assert.equal(props.priority, 'Emergency');
  assert.equal(props.status, 'In Progress');
  assert.equal(props.source, 'Public Form');
  assert.equal(props.property_address, '123 Main St');
  assert.equal(props.permission_to_enter, 'Yes');
  assert.equal(props.has_pets, 'No');
  assert.equal(props.preferred_time, 'mornings');
  assert.equal(props.scheduled_date, '2026-09-20');
  assert.equal(props.scheduled_time, '14:00 America/Chicago');
  assert.equal(props.vendor_name, 'Pat Plumber');
  assert.equal(props.vendor_phone, '+18165550100');
  assert.deepEqual(props.actual_cost, { currency: 'default', value: 125.5 });
  assert.equal(props.admin_notes, 'Called tenant');
  assert.equal(props.submitted_at, '2026-09-18');
  assert.equal(props.submitter_name, 'Sam Tenant');
  assert.equal(props.portal_url, 'https://app.example/admin/maintenance?request=t1');
  assert.equal(props.photo_links, 'https://app.example/admin/maintenance?request=t1', 'base64 photos are never sent; the portal link stands in');
  assert.equal(props.completed_at, undefined);
});

test('buildRecordProperties uses site attachment URLs and stamps completed_at', () => {
  const props = buildRecordProperties({ ...ticket, status: 'completed', updatedAt: Date.UTC(2026, 8, 21), attachmentUrls: ['https://a/1.jpg', 'https://a/2.jpg'], images: [] }, { config: cfg });
  assert.equal(props.photo_links, 'https://a/1.jpg\nhttps://a/2.jpg');
  assert.equal(props.completed_at, '2026-09-21');
  assert.equal(props.title, 'Plumbing: Leak under sink');
  assert.equal(buildRecordProperties({ ...ticket, title: 'Plumbing: Leak under sink' }, { config: cfg }).title, 'Plumbing: Leak under sink', 'intake titles already carry the category');
  assert.equal(props.property_address, undefined, 'blank address is omitted, not sent as an empty string');
});

test('buildRecordProperties omits blank values and normalizes the vendor phone to E.164', () => {
  const props = buildRecordProperties({ id: 't9', title: 'Bare ticket', description: 'Only the required fields', category: 'other', priority: 'low', status: 'submitted', createdAt: Date.UTC(2026, 8, 18) }, { config: cfg });
  for (const key of ['vendor_phone', 'vendor_name', 'scheduled_date', 'scheduled_time', 'admin_notes', 'preferred_time', 'submitter_name', 'property_address', 'photo_links', 'actual_cost', 'completed_at']) {
    assert.ok(!(key in props), `${key} should be absent, got ${JSON.stringify(props[key])}`);
  }
  assert.equal(buildRecordProperties({ ...ticket, assignedVendorPhone: '(816) 555-0100' }, { config: cfg }).vendor_phone, '+18165550100');
  assert.ok(!('vendor_phone' in buildRecordProperties({ ...ticket, assignedVendorPhone: '555' }, { config: cfg })), 'an unusable phone is dropped rather than rejected by GHL');
});

test('buildRecordProperties writes option keys when the location stores keys', () => {
  const props = buildRecordProperties(ticket, { config: { ...cfg, optionValueMode: 'key' } });
  assert.equal(props.issue_type, 'plumbing');
  assert.equal(props.status, 'in_progress');
  assert.equal(props.source, 'public_form');
  assert.equal(props.permission_to_enter, 'yes');
});

type Call = [string, ...unknown[]];
function fakePort(overrides: Partial<MaintenanceGhlPort> = {}) {
  const calls: Call[] = [];
  const port: MaintenanceGhlPort = {
    configured: () => true,
    getRecord: async (id) => { calls.push(['getRecord', id]); return { id }; },
    createRecord: async (props) => { calls.push(['createRecord', props]); return 'rec-new'; },
    updateRecord: async (id, props) => { calls.push(['updateRecord', id, props]); },
    getContactByEmail: async (email) => { calls.push(['getContactByEmail', email]); return null; },
    getContactByPhone: async (phone) => { calls.push(['getContactByPhone', phone]); return null; },
    createRelation: async (a, f, s) => { calls.push(['createRelation', a, f, s]); },
    throttle: async () => {},
  };
  for (const [key, fn] of Object.entries(overrides) as [keyof MaintenanceGhlPort, (...args: any[]) => any][]) {
    (port as any)[key] = async (...args: any[]) => { calls.push([key, ...args]); return fn(...args); };
  }
  return { port, calls, names: () => calls.map(c => c[0]) };
}
const noSleep = async () => {};

test('syncRecord creates a record and both relations for a new ticket', async () => {
  const { port, calls, names } = fakePort();
  const result = await syncRecord(port, { ticket, contactId: 'c1', propertyRecordId: 'h1', propertyAddress: '123 Main St', config: cfg, sleep: noSleep });
  assert.deepEqual(result, { ok: true, ghlRecordId: 'rec-new', ghlContactId: 'c1', ghlPropertyRecordId: 'h1', ghlRelations: { tenant: 'c1', property: 'h1' } });
  assert.deepEqual(names(), ['createRecord', 'createRelation', 'createRelation']);
  assert.deepEqual(calls[1], ['createRelation', 'assoc-tenant', 'c1', 'rec-new']);
  assert.deepEqual(calls[2], ['createRelation', 'assoc-property', 'h1', 'rec-new']);
});

test('syncRecord updates an existing record and only adds the missing relation', async () => {
  const { port, calls, names } = fakePort();
  const result = await syncRecord(port, { ticket: { ...ticket, ghlRecordId: 'rec-1', ghlRelations: { tenant: 'c1' } }, contactId: 'c1', propertyRecordId: 'h1', config: cfg, sleep: noSleep });
  assert.equal(result.ok, true);
  assert.deepEqual(names(), ['getRecord', 'updateRecord', 'createRelation']);
  assert.equal(calls[1][1], 'rec-1');
  assert.deepEqual(calls[2], ['createRelation', 'assoc-property', 'h1', 'rec-1']);
});

test('syncRecord recreates the record when the stored id no longer exists and skips dry-run ids', async () => {
  const { port, names } = fakePort({ getRecord: async () => null });
  const gone = await syncRecord(port, { ticket: { ...ticket, ghlRecordId: 'rec-old' }, contactId: null, propertyRecordId: null, config: cfg, sleep: noSleep });
  assert.equal(gone.ok && gone.ghlRecordId, 'rec-new');
  assert.deepEqual(names(), ['getRecord', 'createRecord']);
  const dry = fakePort();
  await syncRecord(dry.port, { ticket: { ...ticket, ghlRecordId: 'dry-run:t1' }, contactId: null, propertyRecordId: null, config: cfg, sleep: noSleep });
  assert.deepEqual(dry.names(), ['createRecord']);
});

test('syncRecord treats an already-linked relation as success and retries on 403', async () => {
  let attempts = 0;
  const { port } = fakePort({
    createRecord: async () => { attempts += 1; if (attempts < 2) throw new Error('GHL POST /objects failed (403): throttled'); return 'rec-2'; },
    createRelation: async () => { throw new Error('GHL POST /associations/relations failed (400): relation already exists'); },
  });
  const result = await syncRecord(port, { ticket, contactId: 'c1', propertyRecordId: null, config: cfg, sleep: noSleep });
  assert.deepEqual(result, { ok: true, ghlRecordId: 'rec-2', ghlContactId: 'c1', ghlPropertyRecordId: null, ghlRelations: { tenant: 'c1' } });
  assert.equal(attempts, 2);
});

test('syncRecord keeps the record when GHL rejects a link target as invalid, and drops that link', async () => {
  const { port, names } = fakePort({
    createRelation: async (assoc) => { if (assoc === 'assoc-tenant') throw new Error('GHL POST /associations/relations failed (422): {"message":"Invalid record id : \'bogus\' for association : maintenance_tenant"}'); },
  });
  const result = await syncRecord(port, { ticket, contactId: 'bogus', propertyRecordId: 'h1', config: cfg, sleep: noSleep });
  assert.deepEqual(result, { ok: true, ghlRecordId: 'rec-new', ghlContactId: null, ghlPropertyRecordId: 'h1', ghlRelations: { property: 'h1' } });
  assert.deepEqual(names(), ['createRecord', 'createRelation', 'createRelation']);
});

test('syncRecord persists the record id even when a relation fails for another reason', async () => {
  const { port } = fakePort({ createRelation: async () => { throw new Error('GHL POST /associations/relations failed (500): down'); } });
  const result = await syncRecord(port, { ticket, contactId: 'c1', propertyRecordId: null, config: cfg, sleep: noSleep });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.ghlRecordId, 'rec-new', 'the created record id travels with the failure so a retry updates instead of duplicating');
});

test('syncRecord reports a non-retryable failure without throwing', async () => {
  const { port } = fakePort({ createRecord: async () => { throw new Error('GHL POST /objects failed (422): bad field'); } });
  const result = await syncRecord(port, { ticket, contactId: null, propertyRecordId: null, config: cfg, sleep: noSleep });
  assert.deepEqual(result, { ok: false, error: 'GHL POST /objects failed (422): bad field' });
});
