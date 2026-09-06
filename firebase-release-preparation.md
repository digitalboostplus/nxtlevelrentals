# Firebase release and live validation

Status: deployed successfully to https://rental-tracker-app-2026.web.app. Final live checks passed at 2026-09-06T02:05:11.294Z.

Final Next.js build ID: `1c54eP9456J0ljK0CqjEd`. App, Node 22 server function, Firestore rules/indexes and Storage rules are deployed. This is an anonymous smoke-test result, not full signed-in or delivery validation.

## Verification

| Check | Result |
| --- | --- |
| Live HTTP checks | 11 of 11 passed; home, portal shells, operations page and private API authentication responses |
| Live Edge browser navigation | 6 routes rendered or redirected to login; no uncaught errors or failed same-origin requests |
| Image optimizer | Returns 404 as expected with optimization disabled |
| Firestore indexes | All 22 reported READY |
| Local application tests | 10 unit, 18 emulator and 3 browser tests passed on SDK 13/Turbopack |
| Production builds | Windows and clean Linux builds passed; 14 required compiled routes verified |
| Uploaded-runtime simulation | Actual Firebase handler passed 4 checks after nested dependency links were removed |
| Lint | 0 errors, 24 existing warnings; new compiler diagnostics remain warnings |
| Final generated runtime audit | 0 critical, 0 high, 9 moderate, 1 low |

The package changes after the application test suites were verified with the uploaded-runtime simulation and the final live checks. Signed-in production workflows were not exercised.

## Deployment fixes

- Next.js remains 16.3.4, React 18.3.1 and Firebase client 12.18.0. Firebase Admin uses 13.10.0 to match the hosting adapter's peer dependency. Modular Admin imports remain in use.
- CI uses Node 22 and `npm run build:firebase`, which tests the adapter's direct `next build` command. `turbopack: {}` permits that build; explicit Webpack commands remain available locally. Browser regression tests exercise Turbopack.
- Deploy scripts select Firebase CLI 15.29.0. Build/package work runs in a persistent Ubuntu/WSL directory with Linux-installed dependencies; Windows packaging cannot copy the generated junctions reliably.
- Firebase's upload omits nested `node_modules` links. Explicit npm aliases provide the hashed Firebase package names that the compiled server imports. `scripts/verify-release.cjs` checks both required routes and matching alias/version declarations, failing if a future build changes them without an update.
- The adapter's optional Sharp peer originally selected a vulnerable image library. A scoped `firebase-frameworks -> sharp ^0.35.3` override resolves Sharp 0.35.4 in the generated package. The patched package passed the actual-handler tests and final deployment. Image optimization remains disabled. See the [Sharp advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).

The legacy adapter remains a preview and warns that its declared Next range ends at 16.0. The listed tests validate this app's exercised paths; they do not certify every Next.js feature.

## Audit scope

The final generated Firebase runtime includes dependencies absent from the application-only audit. Its remaining findings trace to the previously reviewed UUID buffer-bounds advisory and the [cookie serialization advisory](https://github.com/advisories/GHSA-pxg6-pf52-xh8x). Identified UUID consumers call `v4()` without external buffers; the adapter uses its affected cookie package for parsing and fixed-name session-cookie writes through Express. These are call-site applicability assessments, not removal of the affected packages. Reassess when dependencies or usage change.

## Deployment incident and recovery

The first new release exposed the pages but returned server errors because the upload omitted Turbopack's Firebase dependency links. Its local package test had retained those links and therefore missed the upload behavior. Hosting was promptly rolled back to working version `003d6db8e4a28af0`, restoring home 200 and notification API 401. The new security rules and indexes remained deployed.

The package test was corrected to remove those links before starting Firebase's actual handler. The npm aliases fixed the failure; all 11 live checks passed after redeployment. The final deployment also includes the patched image-library dependency and passed the live checks again.

## Reproduction and provenance

- `npm run build:firebase` validates compilation and required route/alias presence.
- `npm run test:live -- https://rental-tracker-app-2026.web.app` runs read-only HTTP checks and fails on missing routes or unexpected authentication responses.
- Deploy from a Linux checkout with Node 22 and Linux-installed dependencies, using an explicit project. CI currently builds but does not automatically deploy.
- This release used the complete local source, including untracked feature files. No Git index changes or commits were made during this work. Add all required source/configuration files to the release revision before deploying through Git/CI.
- Source archive SHA-256: `caf8b31ee6ef0b6d9293eda673f5685ccdc159be5811c5c0a41f6b18fe23affe` (`.agent-artifacts/release-source-final.zip`).
- Linux workspace: `/home/brian/.cache/nlr-release-20260906-0130/source`. The temporary CLI credential copy was removed after deployment.
- Evidence: `.agent-artifacts/firebase-final-deploy.log`, `live-final-smoke.log`, `live-final-browser.log`, `live-login.png`, `deployed-index-status.json`, `upload-runtime-simulation.log`, `patched-runtime-check.log`, and `final-runtime-audit.json`.

## Still unverified

Dedicated signed-in tenant/admin/owner workflows on the live site, real inbox/device receipt, scheduler execution, cleanup execution and legacy attachment migration require their remaining test inputs/configuration. No live test records were submitted and no notification jobs or migrations were run. The test account and property have been requested; do not share passwords in chat.
