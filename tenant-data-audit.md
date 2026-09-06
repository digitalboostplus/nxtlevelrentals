# Tenant data audit

Date: 2026-09-06. Scope: the tenant portal cleanup, now deployed and live-verified in build `1OxOjJGsOXS1lHs1tDVl8`. See [tenant-cleanup-release.md](tenant-cleanup-release.md).

Follow-up: pinning the emulator commands to Firebase CLI 15.29.0 produced a clean seven-test browser run and a clean 18-test integration run. The same release snapshot also passed all 19 unit tests on Linux. The earlier interrupted runs below are retained as history, not the current validation result.

| Display | Source | Behavior when records are missing |
| --- | --- | --- |
| Resident and property | Authenticated user profile, assigned property, active lease | No invented name, address, or unit |
| Rent | Active lease monthlyRent / rentAmount | Not available; a recorded zero remains zero |
| Balance | Settled ledger calculations | No balance recorded; does not claim good standing |
| Due date | Oldest unpaid ledger charge | No invented due date or late-fee claim |
| Last payment | Settled payment with valid paidAt, supporting legacy paidDate | No payments recorded; latest settlement date wins regardless of query order |
| Payment history | Tenant payment records | Empty state; unknown method/date says Not recorded |
| Maintenance and activity | Tenant maintenance requests and payment records | Empty states; no promised SMS delivery |
| Lease dates | Active lease | No invented renewal or inspection date |
| Documents | Lease URLs and private file IDs | Missing documents are distinguished from private attachments |
| Insurance | Submitted profile metadata and private attachments | No policy recorded; coverage requirements defer to the signed lease |
| Contact details | Shared company configuration in data/site.ts | No fictional staff identities or implied 24-hour staffing |
| Messages, announcements, resources | No live source wired to the current tenant home | Sample panels are absent from the current route |

## Changes

- Removed the unused tenantDashboard sample dataset and the remaining production metric fallbacks.
- Replaced unsupported good-standing, insurance-coverage, notification-delivery, and payment-method claims with record-based language.
- Preserved canonical payment dates instead of overwriting them with missing legacy fields, normalized invalid dates, and selected the latest actual settled payment.
- Updated document availability and management email to use current record/configuration sources.
- Added payment-date/ordering regression tests and an empty-account browser test that rejects sample financial, staff, date, and policy content.

## Release scope

These changes are deployed. All 11 live HTTP checks and 20 tenant/landlord browser checks passed, including absence of sample content and explicit empty account states. The previous live Firestore index fix remains separate. QA isolation, active-lease/billing tests, and verified notification receipt remain subsequent work. Company contact configuration is reused, not independently verified as a staffed service by this audit.

## Verification

- All 19 unit tests passed, including canonical/legacy payment dates, missing/invalid dates, latest settlement ordering, and zero-valued payments.
- Full ESLint: 0 errors, 24 existing warnings. Targeted lint of the final payment-history adjustment passed.
- Initial and final production builds passed, including TypeScript, compilation, generation of 25 static pages, and dependency tracing. The final build includes the payment-history empty-state rendering adjustment.
- The first emulator browser run passed the populated tenant home, empty tenant home, landlord home, admin home, and tenant upload/submission/preferences workflow before Firestore exited with code 4294967295. The remaining two workflow tests were not completed.
- A retry experienced browser-to-Firestore connectivity failures and was stopped. Full browser-suite validation is incomplete; do not represent the five initial passes as a clean seven-test run. The last empty-state layout adjustment has not received a completed browser rerun.
- Initial screenshot review: `.agent-artifacts/tenant-empty-records.png`. Source diff whitespace check passed. The subsequent deployment and live checks are documented in the release report; no live business records were submitted during those checks.
