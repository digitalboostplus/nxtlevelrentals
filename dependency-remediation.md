# Dependency remediation

Date: 2026-09-05. This report records the initial local dependency remediation. Subsequent Firebase deployment compatibility changes, runtime audits and live verification are recorded in [firebase-release-preparation.md](firebase-release-preparation.md).

## Changes

| Dependency | Previous declaration | Updated declaration |
| --- | --- | --- |
| Next.js / eslint-config-next | ^14.2.35 | ^16.3.4 |
| Firebase client | ^10.11.0 | ^12.18.0 |
| Firebase Admin | ^12.0.0 | ^14.3.0 |
| Firebase Functions | ^7.2.5 | ^7.3.2 |
| Firebase rules testing | ^3.0.4 | ^5.0.2 |
| ESLint | 8.57.0 | 9.39.5 |

React remains 18.3.1 and the app retains the Pages Router. The lockfile records the resolved dependency tree.

- Explicit Webpack flags preserve the custom browser fallbacks in development, production builds and the browser test harness. Next 16 otherwise defaults to Turbopack. `next lint` was replaced by ESLint's flat configuration; `npm run build` explicitly runs lint before compilation because Next 16 no longer does so. See the [official Next 16 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16).
- Next updated TypeScript module resolution to `bundler` and JSX to `react-jsx`. Strict checking remains enabled.
- Firebase Admin 14 requires Node 22 or newer and removes the legacy namespace API. The repository already targets Node 22. Remaining script imports and notification authentication now use modular entrypoints; notification server queries/writes use the dedicated named Admin app rather than an unauthenticated client SDK. See the [Admin SDK release notes](https://firebase.google.com/support/release-notes/admin/node).
- Added an emulator regression covering notification listing, read marking, recipient isolation, invalid limits, authentication and token registration. Administrative import/seed scripts were migrated and syntax checked; they were not executed against live data.

## Audit result and applicability

Before: 22 findings (6 high, 16 moderate, 0 critical). After: both full and production-only audits report 6 moderate findings, 0 high, 0 critical. All six high findings are removed. No forced downgrade, dependency override or audit suppression was used.

The remaining package findings are `firebase-admin`, `firebase-functions`, `@google-cloud/storage`, `retry-request`, `teeny-request`, and `uuid`. They trace to one underlying advisory, [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq): UUID v3/v5/v6 methods do not validate bounds for caller-provided buffers.

The installed dependency chain is `firebase-admin@14.3.0 -> @google-cloud/storage@7.22.0 -> teeny-request@9.0.0 -> uuid@9.0.1`. Inspection of `node_modules/teeny-request/build/src/index.js:135` finds `uuid.v4()` used to create a multipart boundary, with no supplied buffer. There are no direct UUID package calls in application code or scripts. Based on these call sites, the affected methods are not reached by the identified dependency use. This is an applicability assessment, not removal of the vulnerable package. Recheck when the lockfile or UUID usage changes; adopt an upstream patched dependency when available. npm's proposed forced fix downgrades Firebase Admin/Functions and was not applied.

## Validation

- Unit suite: 10 passed.
- Firebase Auth, Firestore and Storage emulator suite: 18 passed, including the new notification API regression.
- Production build: passed on Node 22 with Next.js 16.3.4, TypeScript checking and 25 generated pages.
- Production server smoke: login and portal pages returned 200; unauthenticated notification API returned 401; messaging service worker returned 200. The temporary server was stopped afterward.
- Browser workflows: all 3 passed in Edge against demo emulators (tenant photo/preferences/error feedback, admin scheduling/archive/restore, owner receipt/expense submission). Total: 31 passing tests.
- ESLint: passed with 0 errors and 24 warnings. There are 22 newly surfaced diagnostics in existing React code (18 effect/state, 3 immutability, 1 render purity), plus the existing image warning and one unused suppression. The three new rule categories are explicitly warnings during this dependency migration; Rules of Hooks and exhaustive-deps retain their defaults. These diagnostics remain visible and merit a separate state-management cleanup. ESLint 9 is deprecated upstream; moving to ESLint 10 is a separate tooling follow-up.
- Reproducible local evidence is in ignored `.agent-artifacts/remediation-{audit-before,audit-after,lint}.json` and `.agent-artifacts/remediation-{build,emulators,browser,start}.log`.

## Remaining release work

Identify an explicit staging Firebase project, confirm the hosting adapter supports this Next.js version and Node 22, configure the scheduler/providers, and validate live email/push receipt with approved recipients. Staging deployment, deployed rules/indexes, production migration and live delivery remain unverified. See [stage-5-implementation.md](stage-5-implementation.md) for the release gates.
