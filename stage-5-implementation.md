# Stage 5: release validation and operations

Status: local implementation and the confirmed live deployment are complete. Anonymous live checks pass. Signed-in workflows, live email/push receipt, scheduler execution and migration validation remain pending. See [firebase-release-preparation.md](firebase-release-preparation.md) for final versions, deployment fixes and evidence.

## Changes

- Authenticated maintenance creation and status/note/visit updates now persist notification jobs in the same transaction as the business change. The API reports queued rather than delivered notifications.
- Each recipient/channel/event has a deterministic job ID. Workers claim due jobs with a five-minute lease, recheck current preferences, retry transient failures with exponential backoff up to eight attempts, and expose terminal failures for investigation. A crash after an external provider accepts a message may cause a duplicate; email/push are at-least-once, not exactly-once. In-app notifications have deterministic IDs and preserve read state across replay.
- `/admin/operations` displays queue counts and provides bounded processing and cleanup controls. `POST /api/admin/run-operations` accepts an admin ID token or a scheduler secret of at least 32 characters. Its default cleanup mode is preview; `{ "cleanup": true }` applies deletion. Scheduler configuration is still required.
- Unbound uploads older than seven days are cleanup candidates. Bound and recent uploads are excluded. A deletion tombstone blocks concurrent attachment binding; failed Storage deletes remain retryable.
- `scripts/migrate-attachment.ts` defaults to dry run. It supports existing lease URLs, maintenance image URLs/data URIs, expense receipt URLs and insurance document URLs, copies only supported formats from the configured bucket or bounded data URIs, verifies the copied bytes with SHA-256, and transactionally updates the record. Arbitrary external URL fetches are rejected. Original remote objects/tokens remain until their other references are inventoried; migration does not claim to revoke them.
- Browser tests use Edge against explicitly configured demo Firebase emulators and block external browser traffic. Server test configuration clears provider credentials and uses a separate `.next-test` directory. No production fixture writes are needed.
- Browser validation found and fixed the cleared FileList upload bug, tenant success feedback lost during refresh, expense creation availability before property data finished loading, and save errors obscured by the fixed header.
- Next.js and its ESLint config were upgraded from 14.2.5 to 14.2.35, matching the [official 14.x security patch guidance](https://nextjs.org/blog/security-update-2025-12-11). Compatible transitive updates reduced the full audit from 46 findings (four critical) to 22 findings (zero critical, six high, sixteen moderate). Remaining high advisories involve Next.js/PostCSS, Firebase's Undici dependency, and the ESLint Next plugin/glob dependency chain; these require a major-version upgrade or documented applicability review before release. An npm advisory finding is not itself proof that this application exposes the affected feature.

## Dependency remediation follow-up

The subsequent [dependency remediation](dependency-remediation.md) upgrades Next.js to 16.3.4 and Firebase/Admin to current major versions. It removes all high findings; six moderate findings remain with a documented UUID call-site applicability assessment. The validation below records the earlier Stage 5 baseline; use the follow-up report for current version-specific results.

## Validation evidence

- `npm test`: 10 passed after dependency updates.
- `npm run test:emulators`: 17 passed after dependency updates. New cases cover concurrent delivery claims, delayed retry, preference suppression, expired worker leases, deterministic in-app replay, retry exhaustion, cleanup tombstones, retained bound/recent uploads, private migration hashes and cross-owner file denial.
- Node 22 production build passed on Next.js 14.2.35, including TypeScript validation and all 25 generated pages. Lint passes with one existing warning for legacy maintenance image markup.
- Browser suite: three workflows passed after dependency updates: tenant photo submission/preferences, admin vendor scheduling/archive/restore, and owner receipt/expense submission. The tenant test injects HTTP 500 and verifies that save failure is displayed without a success message. The final UI adjustment scrolls the error into view so it is not hidden by the fixed header.
- Live email/push receipt, cloud scheduler execution and legacy attachment migration remain unverified/unperformed. The confirmed live app, rules and indexes were subsequently deployed and smoke-tested; see the release report.

## Reproduction

- `npm test`
- `npm run test:emulators`
- `npm run test:browser` (installed Microsoft Edge; ports 4100, 8180, 9199 and 9198 must be free)
- `npm run lint`
- `npm exec --yes --package=node@22 -- node node_modules/next/dist/bin/next build --webpack`
- `npx tsx scripts/migrate-attachment.ts PROJECT BUCKET ADMIN_UID COLLECTION/ID INDEX` previews one migration. Review its hash and byte count before repeating with `--apply`.

## Release gates still requiring external configuration

1. Identify the staging Firebase project and confirm its Storage bucket, runtime identity and provider configuration. Keep `NEXT_PUBLIC_USE_EMULATORS=false` in deployed environments.
2. Completed for `rental-tracker-app-2026`: app, Firestore rules/indexes and Storage rules were deployed together. For future releases, deploy them together using an explicit project: `firebase deploy --project STAGING_PROJECT --only hosting,firestore:rules,firestore:indexes,storage`. Do not rely on the default project alias.
3. Provision a scheduler to POST to `/api/admin/run-operations` every minute using a random `OPERATIONS_CRON_SECRET` in its Bearer header. Start with cleanup preview; enable cleanup only after reviewing candidates. Monitor pending age and failed job counts.
4. With an approved email address and registered test device, exercise maintenance creation/status/notes/visit events, opt-outs, retry recovery and in-app read persistence. Provider acceptance alone is not proof of inbox/device receipt.
5. Inventory legacy attachments on staging, run preview/apply migration on representative copies, validate tenant/owner denial boundaries, and plan old-token revocation separately after reference review. Do not delete historical sources speculatively.
6. Review the remaining moderate-advisory assessment in `dependency-remediation.md` and refresh the audit before release; perform staging browser and API smoke tests before production deployment. Retain a reviewed source snapshot and prior hosting release for rollback. Rules/indexes and stored data need their own rollback plan.
