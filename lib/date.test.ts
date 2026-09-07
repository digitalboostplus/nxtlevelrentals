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

test('serialized Firestore timestamps from both SDK shapes become dates', () => {
  const client = normalizeDate({ seconds: 1_757_200_000, nanoseconds: 500_000_000 });
  const admin = normalizeDate({ _seconds: 1_757_200_000, _nanoseconds: 500_000_000 });
  assert.equal(client?.getTime(), 1_757_200_000_500);
  assert.equal(admin?.getTime(), 1_757_200_000_500);
  assert.equal(normalizeDate({ seconds: 'soon' }), null);
});
