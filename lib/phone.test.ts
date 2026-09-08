import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneDisplay, isE164, normalizePhoneE164 } from './phone';

test('normalizePhoneE164 handles US formats and keeps international digits', () => {
  assert.equal(normalizePhoneE164('(816) 555-0100'), '+18165550100');
  assert.equal(normalizePhoneE164('1-816-555-0100'), '+18165550100');
  assert.equal(normalizePhoneE164('+1 816 555 0100'), '+18165550100');
  assert.equal(normalizePhoneE164('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhoneE164('555-0100'), '');
  assert.equal(normalizePhoneE164(''), '');
  assert.equal(normalizePhoneE164('call me'), '');
});

test('isE164 and formatPhoneDisplay round-trip a US number', () => {
  assert.equal(isE164('+18165550100'), true);
  assert.equal(isE164('8165550100'), false);
  assert.equal(isE164('+0165550100'), false);
  assert.equal(formatPhoneDisplay('+18165550100'), '(816) 555-0100');
  assert.equal(formatPhoneDisplay('+442079460958'), '+442079460958');
});
