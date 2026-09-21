import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAINTENANCE_OBJECT, MAINTENANCE_FIELDS, diffMaintenanceSchema, fullFieldKey } from './ghlMaintenanceSchema';

test('schema declares the object key, primary title field and every planned field', () => {
  assert.equal(MAINTENANCE_OBJECT.key, 'custom_objects.maintenance_request');
  assert.equal(MAINTENANCE_OBJECT.primary.key, 'title');
  const keys = MAINTENANCE_FIELDS.map(f => f.key);
  for (const k of ['ticket_id', 'issue_type', 'priority', 'issue_description', 'property_address', 'status', 'scheduled_date', 'vendor_name', 'actual_cost', 'admin_notes', 'source', 'submitted_at', 'portal_url', 'photo_links']) assert.ok(keys.includes(k), k);
  assert.equal(fullFieldKey('status'), 'custom_objects.maintenance_request.status');
  const issue = MAINTENANCE_FIELDS.find(f => f.key === 'issue_type')!;
  assert.deepEqual(issue.options, ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Roof/Leak', 'Pest Control', 'Locks/Security', 'Safety', 'Structural', 'Other']);
});

test('diff creates only missing fields and merges missing options', () => {
  const existing = [
    { id: 'f1', fieldKey: 'custom_objects.maintenance_request.title', dataType: 'TEXT', name: 'Title' },
    { id: 'f2', fieldKey: 'custom_objects.maintenance_request.status', dataType: 'SINGLE_OPTIONS', name: 'Status', options: [{ key: 'submitted', label: 'Submitted' }] },
    { id: 'f3', fieldKey: 'custom_objects.maintenance_request.priority', dataType: 'SINGLE_OPTIONS', name: 'Priority', options: ['Low', 'Medium', 'High', 'Emergency'] },
  ];
  const plan = diffMaintenanceSchema(existing);
  assert.ok(!plan.create.some(f => f.key === 'title'), 'primary field is never created by the diff');
  assert.ok(!plan.create.some(f => f.key === 'status'));
  assert.ok(plan.create.some(f => f.key === 'ticket_id'));
  assert.equal(plan.create.length, MAINTENANCE_FIELDS.length - 2);
  assert.deepEqual(plan.updateOptions, [{ id: 'f2', key: 'status', options: ['Submitted', 'In Progress', 'Completed', 'Cancelled'] }]);
  assert.deepEqual(plan.typeMismatch, []);
});

test('diff reports a data type mismatch instead of recreating the field', () => {
  const plan = diffMaintenanceSchema([{ id: 'x', fieldKey: 'custom_objects.maintenance_request.actual_cost', dataType: 'TEXT', name: 'Actual Cost' }]);
  assert.deepEqual(plan.typeMismatch, [{ key: 'actual_cost', expected: 'MONETORY', actual: 'TEXT' }]);
  assert.ok(!plan.create.some(f => f.key === 'actual_cost'));
});
