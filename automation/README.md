# Rental Autopilot

A local review-then-send dashboard that turns the week's rental communications
into a ~2-minute daily routine. It reads your live tenant data from Firestore,
figures out exactly which messages should go out today, writes them for you,
and sends them through GoHighLevel when you click **Send**.

No new dependencies, nothing leaves your machine except the messages you
explicitly send. All of its own state (sent history, settings) is plain JSON
in `automation/state/` — local only, never committed.

## Try it first (no credentials needed)

```bash
npm run autopilot:demo
```

Open http://127.0.0.1:4100. Demo mode uses realistic sample tenants and a
local outbox (History tab) instead of really sending — click around freely.

## Daily use (live)

```bash
npm run autopilot
```

Live mode uses the same `.env` the portal already uses:

- **Firebase Admin** (read tenants/maintenance/payments): `FIREBASE_CLIENT_EMAIL`
  + `FIREBASE_PRIVATE_KEY`, or `GOOGLE_APPLICATION_CREDENTIALS`
- **GoHighLevel** (send email/SMS): `GHL_API_KEY` + `GHL_LOCATION_ID`

Then the routine is: open http://127.0.0.1:4100 → skim the **Today** tab →
**Send** (or **Send all**). Done.

## What it automates

| Workflow | What appears in the queue |
|---|---|
| **Rent** | Reminder 3 days before due, due-day notice, late notices at +3/+7/+14 days (escalating, with your late-fee wording). Stops when a paid payment record exists in Firestore or you click **✓ Rent was paid**. Stops auto-chasing 10 days after the final notice (the Tenants tab keeps showing the month as unpaid). |
| **Maintenance** | Tenant acknowledgment + vendor dispatch for new requests, a tenant check-in when an in-progress job has no update for 5 days, and a completion/feedback notice when a job is marked complete. Log new requests from the Maintenance tab. |
| **Onboarding** | Welcome (7 days before lease start), portal setup (−3), move-in day info, one-week check-in — driven by each tenant's `leaseStart`. |
| **Renewals / move-out** | Renewal offer at 90 days before `leaseEnd`, follow-up at 60, move-out instructions at 30. **✓ Renewed** silences the sequence. |

Every message is fully editable before sending, deduplicated (a sent or
skipped message never comes back), and logged in the History tab with undo.

## How it decides & where things live

- `engine.js` — all rules and message templates (pure functions, no I/O)
- `server.js` — local web server: Firestore reads, GHL sends, local state
- `index.html` — the dashboard
- `sample-data.js` — demo dataset covering the edge cases
- `test.js` — self-check: `node automation/test.js` (76 assertions incl. a
  full end-to-end run against the demo server)
- `state/` — your local data (git-ignored): `log.json` (every send/skip/paid
  mark), `settings.json`, demo outbox

## Details worth knowing

- **Rent due day** defaults to the 1st; set per-tenant due days on the
  Tenants tab (saved locally). Day 31 clamps to shorter months.
- **Sending** uses the GHL Conversations API with the tenant's linked
  `ghlContactId`; tenants without one are looked up by email at send time.
  Vendor dispatch messages are copy/paste (or mailto) since vendors usually
  aren't GHL contacts — click **Mark handled** after sending.
- **SMS** is opt-in per message (checkbox) and goes through GHL too.
- **Payments**: a Firestore payment with status `paid`/`succeeded` for the
  month suppresses reminders automatically; `failed` payments do not.
- The server binds to 127.0.0.1 only. Firestore is never written except when
  you create/update a maintenance request from the dashboard.
- Pin the date for testing with `AUTOPILOT_TODAY=2026-07-09`, change the port
  with `PORT=4101`.
