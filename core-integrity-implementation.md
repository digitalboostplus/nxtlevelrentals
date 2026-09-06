# Core integrity corrections: stages 1 and 2

Branch: `fix/core-integrity`. Implemented September 5, 2026. Existing working-tree changes and the original plan/review were preserved. No deployment or production-data mutation was performed.

## Changes

- Disabled the online payment endpoint: it returns HTTP 503 and has no database or CRM dependencies. Removed card/bank collection and fabricated confirmation behavior from the modal; removed resident payment CTAs and sample saved payment methods. Account and dashboard copy explain that online payments/autopay are unavailable.
- Restricted direct user-document writes to admins. Self-service profile changes continue through the authenticated profile API, which ignores role/assignment input and always submits insurance as unverified/pending. Insurance UI no longer claims a submission is verified.
- Restricted owner expense creation to their own property, positive bounded amounts, an allowed field set, their own creator ID and pending status. Owner updates/approval remain forbidden. Omitted an undefined optional invoice field that prevented ordinary expense submission.
- Restricted direct owner lease mutations; activation is an operator workflow.
- Added `/api/admin/activate-lease` and `lib/activateLease.ts`. The endpoint checks the caller's role, validates lease terms and resolves a real Firebase Auth identity. Lease, initial charges, resident property assignment and property/unit occupancy commit in one Firestore transaction.
- Activation uses deterministic record IDs and a request fingerprint. Concurrent retries create one lease/charge set; reusing an operation with changed terms is rejected. Existing active leases/occupied units block duplicate activation. Multi-unit properties require an actual inventory unit ID.
- Initial rent uses calendar-day proration, inclusive of the start day, through the earlier of month end or lease end. Zero deposits do not create zero-value ledger entries. Future recurring rent remains stage 5 work.
- New residents receive a random inaccessible initial password; the successful API response can supply a password-reset setup link for the operator to share securely. This operation sends no email or GHL communication.
- Replaced the wizard's client-side sequence and placeholder tenant IDs with the authenticated endpoint, real unit selection and a success screen. Inputs are disabled while submitting.
- Added a common integer-cent ledger calculation for resident balances and admin tenant/ledger views. It includes signed adjustments, excludes failed/unsettled payments and preserves credit balances. The monthly payment-status helper also excludes unsettled payments.
- Removed the fallback that invented a month's rent for an empty ledger. Due-date display applies credits to the oldest debits first and labels the resulting date as the oldest posted charge; explicit allocation records are not yet implemented.
- Normalized calendar strings, JavaScript Dates and legacy Firebase Timestamps for date display; invalid calendar dates are rejected. Wizard-created string dates no longer call an unsupported `.toDate()` in the resident portal.
- Resident data-loading failures show an error rather than default financial data. Maintenance submission errors propagate to the form instead of falsely reporting success.

## Verification

- Six unit tests pass: signed adjustments and payment statuses, empty/credit balances, exact cents, oldest-unpaid allocation, legacy/calendar dates, invalid lease terms.
- Eight Firebase Auth/Firestore emulator integration tests pass against `demo-nlr-integrity`: role/assignment/verification escalation denial, forged owner lease denial, expense authorization, concurrent activation retries, independent units and real Auth identity, invalid activation without writes, disabled payment endpoint, rollback after a deliberately injected exception, and authenticated API authorization/insurance handling. Several cases share one test.
- `npm run lint` passed with the two existing maintenance-image warnings.
- TypeScript checking passed. Production build passed with Node 22.23.2 (the project's declared major version); unit tests also passed on Node 22. Emulator tests used the host Node 24 runtime.
- Tests are reproducible with `npm test` and `npm run test:emulators`. The latter refuses to run integration code without emulator host variables and uses an explicit demo project.

## Operational limits and next checks

- Deploy the application and updated Firestore rules together through the normal release process. These protections are local until deployed. Rules now deliberately reject direct non-admin profile writes; this application's profile UI uses the server endpoint.
- Auth account creation cannot participate in a Firestore transaction. A failed new-resident activation may leave a staged Auth identity with no lease or profile assignment. Retrying the same operation reuses the identity; no automatic account deletion is performed. If setup-link generation fails after activation, the success screen states that a reset link still needs to be obtained.
- Existing financial records are not rewritten. Reconcile any historical records created by the old fabricated payment endpoint before treating production balances as verified. No production records were inspected in this task.
- No authenticated browser walkthrough or deployed rules/index verification was performed. Before release, exercise tenant profile/balance display, owner access restrictions and both existing/new-resident activation against a staging environment. Verify setup links with the configured Auth domain.
- The owner-query/P&L/documents defects identified in `codex-review.md` are stage 3 work and remain outstanding. This change does not establish full-platform readiness.
- Legacy date formats are supported during reads; a bulk data migration was not performed. Existing mismatched assignments or occupied properties without lease records require operator reconciliation rather than silent reassignment.
- Dependency installation reported 46 audit findings in the resulting dependency tree. Broad dependency upgrades were not included in this corrective change.

## Deployment acceptance checklist

1. Tenant cannot alter roles, assignments, expense approval or insurance verification through direct SDK/API calls.
2. Payment actions cannot create a paid record without a processor (currently unavailable).
3. Existing and new residents can be activated once; a retry produces no duplicate charges; setup access is usable.
4. Independent property units remain independent; a conflicting active lease is rejected.
5. Resident and admin balances match a reconciled ledger, including credits and signed adjustments.
6. Deploy and inspect the effective rules, then complete staging browser checks before enabling the release for residents.
