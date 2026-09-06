import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFile, MAX_FILE_BYTES } from './attachments';
import { validatePreferenceUpdates } from './notificationPreferences';

test('private uploads enforce content signatures, purpose and size', () => {
  validateFile(Buffer.from('%PDF-1.4 test'), 'lease', 'application/pdf');
  validateFile(Buffer.from([137,80,78,71,13,10,26,10,0]), 'maintenance', 'image/png');
  for (const [bytes, kind, mime] of [[Buffer.from('<script>'), 'lease', 'application/pdf'],
    [Buffer.from('%PDF-1.4'), 'maintenance', 'application/pdf'],
    [Buffer.alloc(MAX_FILE_BYTES + 1), 'insurance', 'image/png'],
    [Buffer.alloc(0), 'expense', 'application/pdf'],
    [Buffer.from('<svg/>'), 'maintenance', 'image/svg+xml']] as const) {
    assert.throws(() => validateFile(bytes, kind, mime));
  }
});
test('preference validation maps only supported events and boolean choices', () => {
  assert.deepEqual(validatePreferenceUpdates({ email: { statusChanges: false }, push: { enabled: false } }), { email: { statusChanges: false }, push: { enabled: false } });
  for (const input of [{ email: { rentReminders: false } }, { email: { enabled: 'false' } }, { inApp: { notesAdded: true } }, { email: { toString: true } }, {}]) assert.throws(() => validatePreferenceUpdates(input));
});
