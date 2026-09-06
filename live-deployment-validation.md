# Live deployment validation

Target confirmed by the user: https://rental-tracker-app-2026.web.app.

Final result at 2026-09-06T02:05:11.294Z: **11 of 11 read-only HTTP checks passed**. Deployed build: `1c54eP9456J0ljK0CqjEd`.

| Route | HTTP status | Result |
| --- | --- | --- |
| `/` | 200 | Pass |
| `/login/` | 200 | Pass |
| `/portal/` | 200 | Pass |
| `/admin/operations/` | 200 | Pass |
| `/landlord/` | 200 | Pass |
| `/api/notifications/get-unread/` | 401 | Pass |
| `/api/notifications/preferences/` | 401 | Pass |
| `/api/landlord/data/` | 401 | Pass |
| `/api/files/nonexistent-live-smoke/` | 403 | Pass |
| `/api/admin/run-operations/` | 403 | Pass |
| `/firebase-messaging-sw.js` | 200 | Pass |

Six Edge navigations (login, tenant portal, admin, operations, landlord and owner financials) displayed login or redirected anonymous visitors to login. No uncaught browser errors or failed same-origin requests were observed. The disabled image-optimization endpoint returned 404. All 22 Firestore indexes were READY.

The original deployment omitted four required routes. A subsequent release uncovered omitted runtime dependency links and was rolled back before the packaging fix was redeployed. The final release passes the checks above. See [firebase-release-preparation.md](firebase-release-preparation.md) for the fixes, audit scope and incident record.

These checks do not establish signed-in data access, delivery receipt or migration readiness. Dedicated test accounts/property and approved message recipients remain to be identified. No business records were submitted, notifications processed or migrations run during live validation.

Evidence: `.agent-artifacts/live-smoke.json`, `.agent-artifacts/live-browser.json`, `.agent-artifacts/live-login.png`. Earlier missing-route and failed-release results remain in the before-redeploy and failed-release artifacts.
