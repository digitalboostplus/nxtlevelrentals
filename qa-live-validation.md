# Live QA validation

Validation date: 2026-09-06. Target: https://rental-tracker-app-2026.web.app.

## Results

All 24 live checks in `.agent-artifacts/qa-live-results.json` passed. These were authenticated HTTP and Firestore checks, using temporary Firebase custom-token sessions kept in process memory. They do not establish password-based browser login or visual usability.

- Firebase accepted password-reset email requests for `brianacquisto@gmail.com` (tenant) and `info@nxtlevelmngmnt.com` (landlord). Inbox receipt remains unconfirmed.
- Created `properties/nlr-qa-test-property`, linked to both accounts, with the landlord UID as its owner.
- Created fictitious `leases/nlr-qa-pending-lease`: pending, inactive, zero rent and deposit. No lease activation or payment workflow was invoked.
- Seeded `maintenanceRequests/nlr-qa-maintenance` directly to avoid the creation endpoint's notification fanout to every admin. The live status endpoint successfully completed it at zero cost using the designated admin account.
- Tenant and landlord access to admin operations and status changes was denied. The tenant was denied the owner API. Owner data contained only the QA property. Both accounts could read their assigned property and were denied the admin user's profile through deployed Firestore rules.
- Tenant maintenance-image and landlord receipt uploads, downloads, cross-account denial, and deletion all passed. The temporary images were deleted.
- The maintenance update queued exactly three jobs, all addressed to the designated tenant. Email/push preferences were disabled for the test accounts; pending QA jobs were marked skipped afterward. The global worker was not invoked.

## Retained state and safeguards

The QA property is archived and `available: false`; it is excluded from the public listing query. Both account links remain. The lease remains inactive, and the tenant profile has `isLeaseActive: false` to suppress rental-autopilot rent and maintenance candidates. No lease start/end dates were added to the tenant profile. The QA ticket is completed. Email and push preferences remain disabled for both test accounts, while in-app preferences remain enabled.

There is no dedicated QA exclusion flag enforced across all application workflows. These safeguards are specific to the checked state and code paths; unarchiving or activating QA records requires rechecking automation behavior. The fixture was created directly, so creation UI and lease activation are not validated by this run.

Final automation-candidate and financial-record counts are recorded in `.agent-artifacts/qa-final-verification.json`.

## Still needed

- Recipients confirm reset-email receipt; tenant and landlord passwords were subsequently supplied privately and successfully tested.
- Password-based admin browser login and business-write browser flows remain untested.
- A scoped notification-delivery test; actual application email, push-device receipt, and in-app worker delivery were not tested.
- A separate environment or enforced QA audience restrictions before testing maintenance creation, active leases, billing, or global operational jobs.

No application source changes or deployment were needed for the initial fixture/API run. Existing workspace changes were preserved.

## Password-based browser follow-up

Credentials supplied in the ignored `.env` file were used directly by an isolated headless Edge test. Passwords, tokens, browser storage, HAR files, and traces were not saved. Both accounts successfully authenticated with their passwords. Tenant account settings and all eight checked landlord pages loaded. Both roles were redirected away from admin operations, and sign-out returned protected routes to login.

The tenant dashboard initially displayed `Failed to load portal data.` Live query diagnostics identified missing composite indexes. Four additive indexes were added to `firestore.indexes.json` and submitted to Firebase using the existing authorized CLI identity: `leases(tenantId ASC, startDate DESC)`, `payments(tenantId ASC, dueDate DESC)`, `ledger(tenantId ASC, date DESC)`, and `maintenanceRequests(tenantId ASC, createdAt DESC)`. The service-account identity could not create indexes; the CLI identity succeeded. No existing indexes or rules were removed or changed.

All 26 deployed indexes subsequently reached READY. The tenant dashboard then loaded its assigned QA property, zero balance, and completed QA maintenance request. Both roles passed password login, account settings, admin-page denial, sign-out protection, and a 390-pixel horizontal-overflow check. All eight landlord routes loaded without visible data errors. No uncaught browser errors or failed HTTP responses were recorded in the final run. Desktop and mobile screenshots were captured; the final tenant-specific rerun waits for resident-record loading to finish before evaluating the dashboard.

At that checkpoint, the live tenant portal still displayed static sample content, including a June 2024 inspection, a May 2024 payment of $1,450 despite the QA account's empty payment history, and sample messages, announcements, and staff contacts. The subsequent [tenant cleanup release](tenant-cleanup-release.md) removed those fallbacks and verified their absence live. No active lease, payment, notification send, or maintenance submission was exercised through the live browser checks.

Evidence is stored in `.agent-artifacts/qa-password-browser*.json`, `.agent-artifacts/qa-index-creation-cli.json`, and `.agent-artifacts/deployed-index-status.json`. The index JSON has no duplicate definitions and passed whitespace checking. No app rebuild was required for these additive Firestore indexes.
