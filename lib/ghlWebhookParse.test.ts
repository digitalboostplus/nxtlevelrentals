import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMaintenanceWebhook, webhookFingerprint } from './ghlWebhookParse';

const standard = {
  contact_id: 'c-123', first_name: 'Sam', last_name: 'Tenant', full_name: 'Sam Tenant', email: 'Sam@Example.com', phone: '+18165550100',
  'Property Address (Maintenance)': '12 Elm St, Kansas City, MO 64131',
  'Maintenance Issue Type': 'HVAC\nHeating/Cooling',
  'Maintenance Priority': 'Emergency',
  'Maintenance Description': 'No heat since last night. Thermostat blank.',
  'Maintenance Photo/Video': 'https://files.example/a.jpg, https://files.example/b.jpg',
  customData: { source: 'ghl-site-form' },
  workflow: { id: 'wf-1', name: 'MR01 - Maintenance Request' },
};

test('parses the standard workflow webhook shape keyed by field name', () => {
  const parsed = parseMaintenanceWebhook(standard);
  assert.deepEqual(parsed, {
    contactId: 'c-123', name: 'Sam Tenant', email: 'sam@example.com', phone: '+18165550100',
    address: '12 Elm St, Kansas City, MO 64131', category: 'HVAC', priority: 'emergency',
    description: 'No heat since last night. Thermostat blank.',
    attachmentUrls: ['https://files.example/a.jpg', 'https://files.example/b.jpg'],
    source: 'ghl-site-form', workflowName: 'MR01 - Maintenance Request',
  });
});

test('resolves custom fields by id, by short key and from a customFields array', () => {
  const byId = parseMaintenanceWebhook({ email: 'a@b.co', customFields: [
    { id: 'wqaOjNSaFgxwcSNpn2BM', value: '1 Main St' }, { id: '3kPbrKRBZYbdJOhjQoHY', value: 'Plumbing' }, { id: 'LsuapjXL4dtW6OGkGboY', value: 'Low' },
    { id: 'i0RhE3wq4RIQ2N28qxBG', value: 'Drip under the sink' }, { id: 'l2uP4G0iGvSXWA19SK9w', value: [{ url: 'https://files.example/x.png' }, 'http://insecure.example/y.png'] },
  ] });
  assert.equal(byId.address, '1 Main St');
  assert.equal(byId.category, 'Plumbing');
  assert.equal(byId.priority, 'low');
  assert.equal(byId.description, 'Drip under the sink');
  assert.deepEqual(byId.attachmentUrls, ['https://files.example/x.png']);
  const byKey = parseMaintenanceWebhook({ phone: '8165550100', maintenance_issue_type: 'Pest Control', maintenance_priority: 'High', maintenance_description: 'Mice in the kitchen', property_address_maintenance: '3 Oak Ave' });
  assert.equal(byKey.category, 'Pest Control');
  assert.equal(byKey.priority, 'high');
  assert.equal(byKey.phone, '+18165550100');
  assert.equal(byKey.name, '');
  assert.equal(byKey.source, 'ghl-site-form');
});

test('rejects payloads without a description or without any contact handle', () => {
  assert.throws(() => parseMaintenanceWebhook({ email: 'a@b.co', 'Maintenance Issue Type': 'Other' }), /description/i);
  assert.throws(() => parseMaintenanceWebhook({ 'Maintenance Description': 'Something broke badly' }), /contact/i);
  assert.throws(() => parseMaintenanceWebhook('nope' as any), /payload/i);
});

test('fingerprint is stable for the same submission on the same day and differs otherwise', () => {
  const a = parseMaintenanceWebhook(standard);
  const day = Date.UTC(2026, 8, 18, 3);
  assert.equal(webhookFingerprint(a, day), webhookFingerprint({ ...a, attachmentUrls: [] }, day + 3600000));
  assert.notEqual(webhookFingerprint(a, day), webhookFingerprint({ ...a, description: 'different' }, day));
  assert.notEqual(webhookFingerprint(a, day), webhookFingerprint(a, day + 86400000));
  assert.match(webhookFingerprint(a, day), /^[0-9a-f]{24}$/);
});
