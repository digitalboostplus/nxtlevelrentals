import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate, formatLocalDate } from './date';

test('calendar dates retain their day and invalid dates are rejected', () => {
  assert.equal(normalizeDate('2026-09-05')?.getDate(), 5);
  assert.equal(normalizeDate('2026-02-30'), null);
  assert.equal(normalizeDate('invalid'), null);
});
test('legacy Timestamp and Date values remain readable', () => {
  const date = new Date(2026, 8, 5);
  assert.equal(normalizeDate({ toDate: () => date })?.getTime(), date.getTime());
  assert.equal(formatLocalDate(date), formatLocalDate('2026-09-05'));
});
