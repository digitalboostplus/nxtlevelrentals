import test from 'node:test';
import assert from 'node:assert/strict';
import { completePages, tenantEligibility, type SourceTenant } from './ghlTenantEligibility';
import { planRows } from './ghlTenantDirectory';

const tenant: SourceTenant = { id: 'one', name: 'One', email: null, phone: null, active: true, leaseChecked: false, propertyIds: ['house'] };
const properties = [{ id: 'house', name: 'Home', address: '1 Test Street', status: 'occupied' }];
test('eligibility requires active, Tenant relationship and occupied property; email and lease flags are warnings', () => {
  assert.equal(tenantEligibility(tenant, properties).eligible, true);
  assert.equal(tenantEligibility(tenant, properties).warnings.length, 2);
  for (const c of [{ ...tenant, active: false }, { ...tenant, propertyIds: [] }, { ...tenant, propertyIds: ['missing'] }]) assert.equal(tenantEligibility(c, properties).eligible, false);
  for (const status of ['vacant', '', 'unavailable', 'maintenance']) assert.equal(tenantEligibility(tenant, [{ ...properties[0], status }]).eligible, false);
  assert.equal(tenantEligibility({ ...tenant, propertyIds: ['house', 'house'] }, properties).eligible, true);
  assert.equal(tenantEligibility({ ...tenant, propertyIds: ['house', 'other'] }, [...properties, { ...properties[0], id: 'other' }]).eligible, false);
});
test('complete pagination tolerates short pages but rejects missing, repeated, changing and truncated results', async () => {
  assert.equal((await completePages(async page => ({ items: [{ id: String(page) }], total: 3 }))).length, 3);
  assert.deepEqual(await completePages(async () => ({ items: [], total: 0 })), []);
  await assert.rejects(completePages(async () => ({ items: [], total: 2 })), /Incomplete/);
  await assert.rejects(completePages(async () => ({ items: [{ id: 'same' }], total: 2 })), /repeated/);
  await assert.rejects(completePages(async page => ({ items: [{ id: String(page) }], total: page + 1 })), /changed/);
  await assert.rejects(completePages(async () => ({ items: [{ id: 'one' }], total: undefined as any })), /Incomplete/);
  await assert.rejects(completePages(async page => ({ items: [{ id: String(page) }], total: 3 }), 2), /limit/);
});

test('an ineligible related contact cannot justify overwriting another tenant\'s active lease assignment', () => {
  const source = { locationId: 'loc', objectKey: 'custom_objects.houses', properties,
    contacts: [{ ...tenant, id: 'old-resident', active: false }, { ...tenant, id: 'new-resident' }] };
  const target = { directory: [], users: [{ id: 'old-uid', data: { role: 'tenant', ghlContactId: 'old-resident' } }],
    properties: [{ id: 'local-house', data: { ghlObjectId: 'house', status: 'occupied' } }],
    leases: [{ id: 'lease', data: { propertyId: 'local-house', tenantId: 'old-uid', status: 'active' } }] };
  assert.equal(planRows(source, target, new Set()).find(r => r.contactId === 'new-resident')?.action, 'conflict');
  source.contacts[0].active = true;
  assert.equal(planRows(source, target, new Set()).find(r => r.contactId === 'new-resident')?.action, 'create');
});
