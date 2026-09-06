# Tenant cleanup release

Date: 2026-09-06. Target: https://rental-tracker-app-2026.web.app.

## Reviewed source

The source snapshot contains tracked files at base commit `fdbda95`, the tenant cleanup working changes, the new `lib/tenantPayments.ts`, and pinned Firebase emulator test commands. It also includes the committed console screens and API hardening already present in that revision. The unrelated Windows deployment helpers are excluded. No commit was created or user changes staged by this run.

Source archive SHA-256: `52f6134d4b7036ccacc52538c8b83e462792b92b38728caec3a82abefaae2ac8`. The manifest and source archive are in `.agent-artifacts/tenant-cleanup-source-manifest.json` and `.agent-artifacts/tenant-cleanup-source.zip`. Credentials are not in the archive. Test-account credentials and local service-account paths are excluded from the generated deployment configuration.

## Validation before deployment

- Unit tests: 19 passed on the Linux release snapshot.
- Firebase Auth/Firestore/Storage integration tests: 18 passed.
- Emulator browser workflows: all 7 passed, including empty tenant state and the admin/owner workflows that previously did not complete.
- Emulator test commands now pin Firebase CLI 15.29.0 rather than picking up global CLI 14.8.0. A clean run succeeded without weakening assertions or application permissions. The prior emulator crash is not conclusively attributed to one cause.
- Linux production build and verification of 14 required compiled routes passed. Lint: 0 errors, 24 existing warnings.
- Firebase runtime simulation: all four checks passed after removing nested dependency links to match upload behavior.
- Generated runtime audit: 0 critical, 0 high, 10 moderate, 1 low. This is not a vulnerability-free dependency tree.

## Deployment

Deployment completed successfully through the Linux Firebase framework adapter. Live build ID: `1OxOjJGsOXS1lHs1tDVl8`, matching the uploaded package. Cloud Build and the Node 22 function update succeeded, followed by hosting release completion. The previous live hosting version, `5da721c20e9abdea`, was captured before release for rollback; rollback was not needed.

## Live verification

- All 11 HTTP checks passed; observed build IDs match the uploaded release.
- All 20 tenant/landlord browser checks passed, including password login, account pages, landlord routes, mobile horizontal-overflow checks, denial of admin operations pages, and sign-out protection.
- Tenant assertions confirm sample names, payments, inspection dates, and blanket policy/account-status claims are absent. The inactive QA account shows no balance recorded, rent not available, and no payments recorded.
- No uncaught browser errors or failed HTTP responses were recorded. Screenshots were captured after data loading completed.
- The generic login route still defaults to `/portal` for any role; the landlord console was verified through its own routes. A role-aware default landing page remains a usability follow-up, not an access-control claim from this test.
- No live maintenance, payment, lease, or notification-submission workflow was invoked. QA isolation and delivery receipt remain unverified.

## Evidence

Ignored `.agent-artifacts/tenant-cleanup-*` files contain the browser/integration/unit logs, Linux build, uploaded-runtime simulation, dependency audit, deployment log, source manifest, and rollback metadata. No password values or browser authentication storage are included in the browser report.

Remaining scope: enforced QA isolation, active-lease/billing validation, and actual notification receipt. Automated passing checks do not establish those workflows as production-ready.
