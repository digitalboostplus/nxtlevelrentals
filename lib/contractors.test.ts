import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SMS_TEMPLATES,
  contractorTags,
  mirrorToGHL,
  renderTemplate,
  searchKeyFor,
  validateCommsInput,
  validateContractorInput,
  type GhlPort,
} from './contractors';
import type { Contractor } from '@/types/contractors';

const contractor: Contractor = {
  id: 'c1', name: 'Pat Plumber', company: 'Pat & Sons', trades: ['plumbing', 'hvac'], phone: '+18165550100', email: 'pat@example.com',
  notes: '', status: 'approved', consentAt: null, ghlContactId: null, ghlSyncError: null, ghlSyncedAt: null, searchKey: '',
  createdAt: 0, updatedAt: 0, createdBy: 'admin', updatedBy: 'admin',
};

type Call = [string, ...unknown[]];
function fakePort(overrides: Partial<GhlPort> = {}) {
  const calls: Call[] = [];
  const port: GhlPort = {
    configured: () => true,
    getContactById: async (id) => { calls.push(['getContactById', id]); return null; },
    getContactByEmail: async (email) => { calls.push(['getContactByEmail', email]); return null; },
    getContactByPhone: async (phone) => { calls.push(['getContactByPhone', phone]); return null; },
    upsertContact: async (input) => { calls.push(['upsertContact', input]); return 'upserted'; },
    createContact: async (input) => { calls.push(['createContact', input]); return 'created'; },
    updateContact: async (id, input) => { calls.push(['updateContact', id, input]); },
    addTags: async (id, tags) => { calls.push(['addTags', id, tags]); },
    addNote: async (id, body) => { calls.push(['addNote', id, body]); },
    sendSms: async (id, message) => { calls.push(['sendSms', id, message]); return { messageId: 'm1' }; },
    enrollWorkflow: async (id, wf) => { calls.push(['enrollWorkflow', id, wf]); },
    assignUser: async (id, user) => { calls.push(['assignUser', id, user]); },
    throttle: async () => {},
  };
  for (const [key, fn] of Object.entries(overrides) as [keyof GhlPort, (...args: any[]) => any][]) {
    (port as any)[key] = async (...args: any[]) => { calls.push([key, ...args]); return fn(...args); };
  }
  return { port, calls, names: () => calls.map((c) => c[0]) };
}
const noSleep = async () => {};

test('validateContractorInput trims, normalizes and rejects bad input', () => {
  const clean = validateContractorInput({ name: '  Pat Plumber ', company: ' Pat & Sons ', trades: ['plumbing', 'plumbing', 'bogus'], phone: '(816) 555-0100', email: ' PAT@Example.com ', notes: 'x', consent: true });
  assert.equal(clean.name, 'Pat Plumber');
  assert.deepEqual(clean.trades, ['plumbing']);
  assert.equal(clean.phone, '+18165550100');
  assert.equal(clean.email, 'pat@example.com');
  assert.equal(clean.status, 'approved');
  assert.equal(clean.consent, true);
  assert.throws(() => validateContractorInput({ trades: ['plumbing'], phone: '8165550100' }), /Name is required/);
  assert.throws(() => validateContractorInput({ name: 'x', trades: ['bogus'], phone: '8165550100' }), /at least one trade/);
  assert.throws(() => validateContractorInput({ name: 'x', trades: ['hvac'], phone: '555' }), /valid mobile/);
  assert.throws(() => validateContractorInput({ name: 'x', trades: ['hvac'], phone: '8165550100', email: 'nope' }), /valid email/);
  assert.throws(() => validateContractorInput({ name: 'x', trades: ['hvac'], phone: '8165550100', status: 'gone' }), /approved or inactive/);
  assert.equal(searchKeyFor(contractor), 'pat plumber pat & sons +18165550100 18165550100 pat@example.com');
  assert.deepEqual(contractorTags(['plumbing', 'hvac']), ['contractor', 'trade:plumbing', 'trade:hvac']);
});

test('renderTemplate fills known tokens, leaves unknown ones and caps length', () => {
  const body = DEFAULT_SMS_TEMPLATES[0].body;
  const out = renderTemplate(body, { contractor: 'Pat', property: '12 Oak St', ticket: 'Leaking sink' });
  assert.match(out, /^Hi Pat, this is NXT Level Mgmt\. We have a job at 12 Oak St: Leaking sink\./);
  assert.equal(renderTemplate('See you {date} at {property} {unknown}', { property: 'Oak' }), 'See you {date} at Oak {unknown}');
  assert.equal(renderTemplate('x'.repeat(1200)).length, 1000);
});

test('validateCommsInput accepts workflow ids and templates, rejects junk', () => {
  const clean = validateCommsInput({ voicemailWorkflows: { newJob: 'wf_12345', urgent: '' }, callWorkflowId: 'call-wf-1', smsTemplates: [{ id: 'a', label: 'A', body: 'Hi' }, { label: 'B', body: 'Yo' }] });
  assert.deepEqual(clean.voicemailWorkflows, { newJob: 'wf_12345' });
  assert.equal(clean.callWorkflowId, 'call-wf-1');
  assert.deepEqual(clean.smsTemplates.map((t) => t.id), ['a', 'template-2']);
  assert.throws(() => validateCommsInput({ voicemailWorkflows: { newJob: 'bad id!' } }), /not valid/);
  assert.throws(() => validateCommsInput({ smsTemplates: [{ id: 'a', label: 'A', body: 'x' }, { id: 'a', label: 'B', body: 'y' }] }), /repeats/);
  assert.throws(() => validateCommsInput({ smsTemplates: [{ id: 'a', label: '', body: 'x' }] }), /label and a message/);
});

test('mirrorToGHL resolves by stored id, then email, then phone, and only creates when unknown', async () => {
  const byId = fakePort({ getContactById: async () => ({ id: 'stored' }) });
  const r1 = await mirrorToGHL({ ...contractor, ghlContactId: 'stored' }, byId.port, { sleep: noSleep });
  assert.deepEqual(r1, { ok: true, ghlContactId: 'stored' });
  assert.deepEqual(byId.names(), ['getContactById', 'updateContact', 'addTags']);
  assert.deepEqual(byId.calls[2], ['addTags', 'stored', ['contractor', 'trade:plumbing', 'trade:hvac']]);

  const byEmail = fakePort({ getContactByEmail: async () => ({ id: 'by-email' }) });
  const r2 = await mirrorToGHL({ ...contractor, ghlContactId: 'dry-run:c1' }, byEmail.port, { sleep: noSleep });
  assert.deepEqual(r2, { ok: true, ghlContactId: 'by-email' });
  assert.deepEqual(byEmail.names(), ['getContactByEmail', 'updateContact', 'addTags']);

  const byPhone = fakePort({ getContactByPhone: async () => ({ id: 'by-phone' }) });
  const r3 = await mirrorToGHL({ ...contractor, email: '' }, byPhone.port, { sleep: noSleep });
  assert.deepEqual(r3, { ok: true, ghlContactId: 'by-phone' });
  assert.deepEqual(byPhone.names(), ['getContactByPhone', 'updateContact', 'addTags']);

  const fresh = fakePort();
  assert.deepEqual(await mirrorToGHL(contractor, fresh.port, { sleep: noSleep }), { ok: true, ghlContactId: 'upserted' });
  assert.deepEqual(fresh.names(), ['getContactByEmail', 'getContactByPhone', 'upsertContact', 'addTags']);
  assert.equal((fresh.calls[2][1] as any).firstName, 'Pat');
  assert.equal((fresh.calls[2][1] as any).lastName, 'Plumber');

  const noEmail = fakePort();
  assert.deepEqual(await mirrorToGHL({ ...contractor, email: '' }, noEmail.port, { sleep: noSleep }), { ok: true, ghlContactId: 'created' });
  assert.deepEqual(noEmail.names(), ['getContactByPhone', 'createContact', 'addTags']);

  assert.deepEqual(await mirrorToGHL(contractor, fakePort().port, { dryRun: true }), { ok: true, ghlContactId: 'dry-run:c1' });
});

test('mirrorToGHL retries rate limits with backoff and gives up after three attempts', async () => {
  let attempts = 0;
  const slept: number[] = [];
  const flaky = fakePort({
    upsertContact: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('GHL POST /contacts/upsert failed (429): slow down');
      return 'eventually';
    },
  });
  const ok = await mirrorToGHL(contractor, flaky.port, { sleep: async (ms) => { slept.push(ms); } });
  assert.deepEqual(ok, { ok: true, ghlContactId: 'eventually' });
  assert.deepEqual(slept, [500, 1500]);

  const dead = fakePort({ upsertContact: async () => { throw new Error('GHL POST /contacts/upsert failed (503): down'); } });
  const failed = await mirrorToGHL(contractor, dead.port, { sleep: noSleep });
  assert.equal(failed.ok, false);
  assert.match((failed as any).error, /503/);
  assert.equal(dead.names().filter((n) => n === 'upsertContact').length, 3);

  const forbidden = fakePort({ upsertContact: async () => { throw new Error('GHL POST /contacts/upsert failed (401): bad token'); } });
  await mirrorToGHL(contractor, forbidden.port, { sleep: noSleep });
  assert.equal(forbidden.names().filter((n) => n === 'upsertContact').length, 1);
});
