// Self-check for the rental autopilot: engine unit tests + a full end-to-end
// exercise of the demo server (boot, review queue, send, dedupe, skip, mark
// paid, log a maintenance request, complete it, undo).
//
//   node automation/test.js
//
// Exits non-zero on any failure. No dependencies.

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const engine = require('./engine');
const { buildSampleData } = require('./sample-data');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(name) {
  console.log(`\n== ${name}`);
}

// ---------------------------------------------------------------------------
section('date helpers');
// ---------------------------------------------------------------------------

check('addDays crosses months', engine.addDays('2026-06-30', 2) === '2026-07-02');
check('daysBetween', engine.daysBetween('2026-07-01', '2026-07-09') === 8);
check('dueDay 31 clamps in June', engine.dueDateForPeriod('2026-06', 31) === '2026-06-30');
check('dueDay 31 clamps in Feb', engine.dueDateForPeriod('2026-02', 31) === '2026-02-28');
check('shiftPeriod back over year', engine.shiftPeriod('2026-01', -1) === '2025-12');
check('toDateStr ISO', engine.toDateStr('2026-07-01T14:00:00Z') === '2026-07-01');
check('toDateStr Firestore seconds', engine.toDateStr({ seconds: 1767225600 }) !== null);

// ---------------------------------------------------------------------------
section('rent stages');
// ---------------------------------------------------------------------------

const settings = engine.mergeSettings(null);
const stage = (d) => (engine.rentStage(d, settings) || {}).key;
check('4 days early -> nothing', stage(-4) === undefined);
check('3 days early -> upcoming', stage(-3) === 'rent-upcoming');
check('due day -> due', stage(0) === 'rent-due');
check('2 days late -> still due', stage(2) === 'rent-due');
check('3 days late -> late 1', stage(3) === 'rent-late-1');
check('7 days late -> late 2', stage(7) === 'rent-late-2');
check('20 days late -> late 3', stage(20) === 'rent-late-3');
check('24 days late -> still late 3 (cap edge)', stage(24) === 'rent-late-3');
check('25+ days late -> stop auto-chasing', stage(25) === undefined);

// ---------------------------------------------------------------------------
section('queue rules (fixed date 2026-07-09, sample data)');
// ---------------------------------------------------------------------------

const TODAY = '2026-07-09';
const sample = buildSampleData(TODAY);
const demoSettings = engine.mergeSettings(sample.settings);
const data = { tenants: sample.tenants, maintenance: sample.maintenance, payments: sample.payments };
const queue = engine.computeQueue(data, sample.log, demoSettings, TODAY);
const byId = Object.fromEntries(queue.map((q) => [q.id, q]));
const kindsFor = (tid) => queue.filter((q) => q.tenantId === tid).map((q) => q.kind);

check('alice gets upcoming reminder', kindsFor('t-alice').includes('rent-upcoming'), JSON.stringify(kindsFor('t-alice')));
check('bruno gets due-today', kindsFor('t-bruno').includes('rent-due'));
check('carmen (4 days late) gets late-1', kindsFor('t-carmen').includes('rent-late-1'));
check('dmitri (15 days late) gets late-3', kindsFor('t-dmitri').includes('rent-late-3'));
check('dmitri failed payment does NOT suppress', kindsFor('t-dmitri').some((k) => k.startsWith('rent-')));
check('erin paid -> no rent item', !kindsFor('t-erin').some((k) => k.startsWith('rent-')));
check('gus marked paid -> no rent item', !kindsFor('t-gus').some((k) => k.startsWith('rent-')));
check('farah welcome already sent -> only later steps', !kindsFor('t-farah').includes('onboard-welcome'));
check('farah gets portal-setup (3 days out)', kindsFor('t-farah').includes('onboard-portal'));
check('gus gets renewal offer (85 days)', kindsFor('t-gus').includes('renewal-offer'));
check('dmitri gets renewal follow-up (58 days)', kindsFor('t-dmitri').includes('renewal-followup'));
check('hana gets move-out notice (25 days)', kindsFor('t-hana').includes('moveout-notice'));
check('june (inactive) gets nothing', kindsFor('t-june').length === 0, JSON.stringify(kindsFor('t-june')));
check('maintenance ack for new request', Boolean(byId['maint|m-1001|ack']));
check('vendor dispatch for new request', Boolean(byId['maint|m-1001|dispatch']));
check('dispatch matched plumbing vendor', (byId['maint|m-1001|dispatch'] || {}).note === 'dispatch to Mike @ RapidFlow Plumbing');
check('stale in-progress -> update nudge', queue.some((q) => q.kind === 'maint-update' && q.requestId === 'm-1002'));
check('completed -> completion notice', queue.some((q) => q.kind === 'maint-complete' && q.requestId === 'm-1003'));
check('former tenant request ignored', !queue.some((q) => q.requestId === 'm-1004'));
check('one rent item max per tenant', ['t-alice', 't-bruno', 't-carmen', 't-dmitri'].every(
  (tid) => kindsFor(tid).filter((k) => k.startsWith('rent-')).length === 1
));

// Dedupe: sending late-1 must suppress late-1 AND lower stages, but escalate later.
{
  const q2 = engine.computeQueue(data, [...sample.log, { key: queue.find((x) => x.tenantId === 't-carmen').id, action: 'sent' }], demoSettings, TODAY);
  check('sent late-1 disappears', !q2.some((x) => x.tenantId === 't-carmen' && x.kind === 'rent-late-1'));
  const q3 = engine.computeQueue(data, [...sample.log, { key: queue.find((x) => x.tenantId === 't-carmen').id, action: 'sent' }], demoSettings, engine.addDays(TODAY, 3));
  check('3 days later escalates to late-2', q3.some((x) => x.tenantId === 't-carmen' && x.kind === 'rent-late-2'), JSON.stringify(q3.filter((x) => x.tenantId === 't-carmen').map((x) => x.kind)));
}

// Cross-month late rent: due June 28, unpaid, today July 2 -> late-1 for June period.
{
  const t = [{ id: 'x1', displayName: 'X', email: 'x@example.com', monthlyRent: 1000, isLeaseActive: true, leaseStart: '2025-01-01' }];
  const s2 = engine.mergeSettings({ tenantOverrides: { x1: { dueDay: 28 } } });
  const q = engine.computeQueue({ tenants: t, maintenance: [], payments: [] }, [], s2, '2026-07-02');
  const rent = q.find((x) => x.workflow === 'rent');
  check('late rent from last month is chased', rent && rent.kind === 'rent-late-1' && rent.period === '2026-06', JSON.stringify(rent));
}

// Message rendering sanity.
{
  const alice = sample.tenants[0];
  const msg = engine.renderTemplate('rent-late-1', alice, { dueDate: '2026-07-05', daysLate: 4, period: '2026-07' }, demoSettings);
  check('template has amount', msg.text.includes('$1,450.00'));
  check('template has due date', msg.text.includes('July 5, 2026'));
  check('template has late fee text', msg.text.includes(demoSettings.lateFeeText.slice(0, 20)));
  check('html is branded', msg.html.includes(demoSettings.companyName));
  check('sms is short-ish', msg.sms.length < 320, `len=${msg.sms.length}`);
  const custom = engine.customEmailHtml(demoSettings, 'Subj', 'Hello <world>\n\nBye');
  check('custom html escapes', custom.includes('&lt;world&gt;'));
}

// ---------------------------------------------------------------------------
section('end-to-end against the demo server');
// ---------------------------------------------------------------------------

const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;
const STATE_DIR = path.join(__dirname, 'state');

async function api(p, body) {
  const res = await fetch(BASE + p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  return { status: res.status, data };
}

async function e2e() {
  // Clean demo state so the run is deterministic.
  for (const f of ['demo-log.json', 'demo-settings.json', 'demo-outbox.json']) {
    fs.rmSync(path.join(STATE_DIR, f), { force: true });
  }

  const child = spawn(process.execPath, [path.join(__dirname, 'server.js'), '--demo'], {
    env: { ...process.env, PORT: String(PORT), AUTOPILOT_TODAY: TODAY },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverErr = '';
  child.stderr.on('data', (d) => (serverErr += d));

  try {
    // Wait for the server to come up.
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      try {
        const res = await fetch(BASE + '/');
        up = res.ok;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    check('server boots', up, serverErr.slice(0, 200));
    if (!up) return;

    const html = await (await fetch(BASE + '/')).text();
    check('dashboard served', html.includes('Rental Autopilot'));

    let { data: state } = await api('/api/state');
    check('state has demo mode', state.mode === 'demo');
    check('queue is populated', state.queue.length >= 8, `len=${state.queue.length}`);
    check('tenants listed', state.tenants.length === 10);
    const initialQueueLen = state.queue.length;

    // 1. Send a rent reminder (email + sms), verify outbox + queue shrink.
    const rentItem = state.queue.find((q) => q.kind === 'rent-due');
    check('rent-due item exists', Boolean(rentItem));
    const sendRes = await api('/api/action', { type: 'send', id: rentItem.id, channels: ['email', 'sms'] });
    check('send succeeds', sendRes.status === 200 && sendRes.data.ok, JSON.stringify(sendRes.data));

    ({ data: state } = await api('/api/state'));
    check('sent item left the queue', !state.queue.some((q) => q.id === rentItem.id));
    check('history recorded send', state.history.some((h) => h.key === rentItem.id && h.action === 'sent'));
    check('outbox got email + sms', state.outbox.filter((o) => o.itemId === rentItem.id).length === 2, JSON.stringify(state.outbox.map((o) => o.channel)));

    // 2. Double-send is rejected (item no longer in queue).
    const dup = await api('/api/action', { type: 'send', id: rentItem.id, channels: ['email'] });
    check('double-send rejected', dup.status === 400, JSON.stringify(dup.data));

    // 3. Edited send: body text is re-wrapped, custom subject kept.
    const upcoming = state.queue.find((q) => q.kind === 'rent-upcoming');
    const edited = { subject: 'Custom subject here', text: 'Short custom note.\n\nThanks!\nJordan' };
    const eRes = await api('/api/action', { type: 'send', id: upcoming.id, channels: ['email'], edited });
    check('edited send succeeds', eRes.data.ok === true);
    ({ data: state } = await api('/api/state'));
    const sentMail = state.outbox.find((o) => o.itemId === upcoming.id);
    check('edited subject used', sentMail && sentMail.subject === 'Custom subject here');
    check('edited body wrapped in brand shell', sentMail && sentMail.body.includes('Short custom note.') && sentMail.body.includes('Next Level Rentals'));

    // 4. Skip an onboarding item.
    const onboard = state.queue.find((q) => q.workflow === 'onboarding');
    await api('/api/action', { type: 'skip', id: onboard.id });
    ({ data: state } = await api('/api/state'));
    check('skipped item left the queue', !state.queue.some((q) => q.id === onboard.id));

    // 5. Mark rent paid via a late notice -> rent item disappears, tenant shows paid.
    const late = state.queue.find((q) => q.kind === 'rent-late-1');
    await api('/api/action', { type: 'mark-paid', id: late.id });
    ({ data: state } = await api('/api/state'));
    check('mark-paid clears rent item', !state.queue.some((q) => q.tenantId === late.tenantId && q.workflow === 'rent'));
    check('tenant shows paid', state.tenants.find((t) => t.id === late.tenantId).paidThisPeriod === true);

    // 6. Mark renewed -> renewal item disappears.
    const renewal = state.queue.find((q) => q.workflow === 'renewal');
    await api('/api/action', { type: 'mark-renewed', id: renewal.id });
    ({ data: state } = await api('/api/state'));
    check('mark-renewed clears renewal item', !state.queue.some((q) => q.id === renewal.id));

    // 7. Log a maintenance request -> ack + dispatch appear; complete it -> notice appears.
    const mRes = await api('/api/maintenance', { tenantId: 't-bruno', title: 'Garbage disposal jammed', description: 'Humming but not spinning', priority: 'high' });
    check('maintenance created', mRes.data.ok && mRes.data.id, JSON.stringify(mRes.data));
    ({ data: state } = await api('/api/state'));
    check('ack queued for new request', state.queue.some((q) => q.kind === 'maint-ack' && q.requestId === mRes.data.id));
    const dispatch = state.queue.find((q) => q.kind === 'maint-dispatch' && q.requestId === mRes.data.id);
    check('dispatch queued for new request', Boolean(dispatch));
    check('dispatch is copy-mode with vendor recipient', dispatch && dispatch.actions.includes('copy') && dispatch.recipient.name.length > 0);

    await api('/api/action', { type: 'copy-done', id: dispatch.id });
    await api('/api/maintenance-status', { id: mRes.data.id, status: 'completed' });
    ({ data: state } = await api('/api/state'));
    check('dispatch marked handled', !state.queue.some((q) => q.id === dispatch.id));
    check('completion notice queued', state.queue.some((q) => q.kind === 'maint-complete' && q.requestId === mRes.data.id));

    // 8. Undo the very first send -> item returns to the queue.
    const sentEntry = state.history.find((h) => h.key === rentItem.id && h.action === 'sent');
    const uRes = await api('/api/action', { type: 'undo', key: sentEntry.key, at: sentEntry.at, action: 'sent' });
    check('undo succeeds', uRes.data.ok === true, JSON.stringify(uRes.data));
    ({ data: state } = await api('/api/state'));
    check('undone item is back in the queue', state.queue.some((q) => q.id === rentItem.id));

    // 9. Settings roundtrip.
    await api('/api/settings', { companyName: 'Test Co', lateSteps: [2, 5, 10] });
    ({ data: state } = await api('/api/state'));
    check('settings saved', state.settings.companyName === 'Test Co' && state.settings.lateSteps.join() === '2,5,10');
    await api('/api/tenant-override', { tenantId: 't-bruno', rentPaused: true });
    ({ data: state } = await api('/api/state'));
    check('pause override applies', !state.queue.some((q) => q.tenantId === 't-bruno' && q.workflow === 'rent'));

    // 10. Send-all style loop: everything sendable by email goes through.
    const sendable = state.queue.filter((q) => q.actions.includes('send') && q.recipient.email);
    let sent = 0;
    for (const q of sendable) {
      const r = await api('/api/action', { type: 'send', id: q.id, channels: ['email'] });
      if (r.data.ok) sent++;
    }
    check('bulk send all remaining', sent === sendable.length, `${sent}/${sendable.length}`);
    ({ data: state } = await api('/api/state'));
    check('queue drains to copy-only items', state.queue.every((q) => !q.actions.includes('send') || !q.recipient.email), `left=${state.queue.map((q) => q.id).join()}`);
    check('queue shrank overall', state.queue.length < initialQueueLen);
  } finally {
    child.kill();
    // Leave demo state files for inspection but reset next run.
  }
}

e2e()
  .catch((err) => {
    failed++;
    console.error('E2E crashed:', err);
  })
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
