import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIssueType, toPriorityLabel, toStatusLabel, toSourceLabel, fromSiteIssueType, fromSitePriority } from './maintenanceNormalize';

test('toIssueType maps every app and site category onto one option list', () => {
  assert.equal(toIssueType('plumbing'), 'Plumbing');
  assert.equal(toIssueType('Plumbing'), 'Plumbing');
  assert.equal(toIssueType('HVAC'), 'HVAC');
  assert.equal(toIssueType('hvac'), 'HVAC');
  assert.equal(toIssueType('Roof/Leak'), 'Roof/Leak');
  assert.equal(toIssueType('roof'), 'Roof/Leak');
  assert.equal(toIssueType('Pest Control'), 'Pest Control');
  assert.equal(toIssueType('Locks/Security'), 'Locks/Security');
  assert.equal(toIssueType('Safety'), 'Safety');
  assert.equal(toIssueType('structural'), 'Structural');
  assert.equal(toIssueType('general'), 'Other');
  assert.equal(toIssueType('anything else'), 'Other');
  assert.equal(toIssueType(undefined), 'Other');
});

test('toPriorityLabel folds urgent and emergency together', () => {
  assert.equal(toPriorityLabel('low'), 'Low');
  assert.equal(toPriorityLabel('Medium'), 'Medium');
  assert.equal(toPriorityLabel('high'), 'High');
  assert.equal(toPriorityLabel('urgent'), 'Emergency');
  assert.equal(toPriorityLabel('emergency'), 'Emergency');
  assert.equal(toPriorityLabel(''), 'Medium');
});

test('toStatusLabel and toSourceLabel produce the option labels', () => {
  assert.equal(toStatusLabel('submitted'), 'Submitted');
  assert.equal(toStatusLabel('in_progress'), 'In Progress');
  assert.equal(toStatusLabel('completed'), 'Completed');
  assert.equal(toStatusLabel('cancelled'), 'Cancelled');
  assert.equal(toStatusLabel('bogus'), 'Submitted');
  assert.equal(toSourceLabel(undefined), 'Portal');
  assert.equal(toSourceLabel('portal'), 'Portal');
  assert.equal(toSourceLabel('public-form'), 'Public Form');
  assert.equal(toSourceLabel('ai-chat'), 'AI Chat');
  assert.equal(toSourceLabel('ghl-site-form'), 'Website Form');
  assert.equal(toSourceLabel('backfill'), 'Backfill');
});

test('site values map into the values the app stores', () => {
  assert.equal(fromSiteIssueType('HVAC\nHeating/Cooling'), 'HVAC');
  assert.equal(fromSiteIssueType('Pest Control'), 'Pest Control');
  assert.equal(fromSiteIssueType('nonsense'), 'Other');
  assert.equal(fromSitePriority('Emergency'), 'emergency');
  assert.equal(fromSitePriority('High'), 'high');
  assert.equal(fromSitePriority('??'), 'medium');
});
