# Next Level Rentals — MVP → Production Plan

**Status:** proposal, awaiting sign-off on the decisions in §2
**Author:** engineering
**Last updated:** 2026-07-25
**Scope:** take the current MVP to a production launch with four working roles —
tenant self-service, landlord self-service (account + properties + tenants),
staff admin, and a super-admin console with full visibility and control.

---

## 1. Where we actually are

The MVP is further along than a typical prototype: real Firebase Auth, a
four-role type system, ~20 Firestore-backed screens, 17 API routes (15 of which
verify ID tokens), Firestore + Storage rules, 21 composite indexes, GoHighLevel
CRM sync, FCM push, an AI chat assistant, and a working dark theme. `npm run
lint` and `npm run build` both pass clean on this branch.

What it is **not** yet is a multi-tenant product. Three things stand between us
and launch:

1. **A privilege-escalation hole.** `firestore.rules:36` grants
   `allow read, write: if isOwner(userId) || isAdmin()` on `users/{userId}`.
   Any signed-in tenant can write their own user document — including the
   `role` field. One `updateDoc(doc(db, 'users', uid), { role: 'super-admin' })`
   from the browser console makes any tenant a super-admin. This is the single
   most important fix in this document and it gates every other role feature.
2. **The landlord role is decorative.** There is no way to create a landlord
   (rules allow only admins to write `landlords/{id}`, and no API route or UI
   does it), and the landlord dashboard is read-only. Worse, it is *broken* for
   real landlords: `paymentUtils.getPaymentsByLandlord` (`lib/firebase-utils.ts:552`)
   queries `payments where landlordId == uid`, but the `payments` read rule
   (`firestore.rules:97`) only permits `tenantId == uid || isAdmin()`. The query
   is denied, `useLandlordData` catches it, and the page renders "Failed to load
   landlord data."
3. **The super-admin console does not exist.** `super-admin` currently means
   exactly one thing: `AuthGuard` skips the role check (`components/Auth/AuthGuard.tsx:46`).
   There is no console, no audit trail, no role administration, no impersonation,
   no global search, no kill switches.

Everything else in this plan is ordinary product work. Those three are the spine.

### 1.1 Current-state audit

| Area | State | Evidence |
|---|---|---|
| Auth (sign-in) | Working; email/password only | `context/AuthContext.tsx` |
| Route protection | **Client-side only** — no `middleware.ts`. `next build` marks every `/admin/*` and `/landlord` route `○ (Static)`, so their HTML and JS are prerendered and served to any browser; the only real boundary is Firestore rules | `pages/_app.tsx:21`, `components/Auth/AuthGuard.tsx`, build output |
| Role source of truth | Firestore `users/{uid}.role`, writable by the user | `firestore.rules:36` |
| Custom claims | Set once, only for tenants created via API; never read by rules or client | `pages/api/admin/create-tenant.ts:58` |
| Failed-profile-read behavior | Silently defaults to `tenant` and proceeds | `context/AuthContext.tsx:32,89` |
| API authz | 15/17 routes verify ID token + role, each with copy-pasted boilerplate | `pages/api/admin/*.ts` |
| Unprotected API | `POST /api/admin/init-schemas` writes Firestore with no auth at all | `pages/api/admin/init-schemas.ts` |
| Mock-mode guard | Falls into mock Firebase whenever `NEXT_PUBLIC_FIREBASE_API_KEY` is absent — including in production | `lib/firebase.ts:2` |
| Temp passwords | Hardcoded `Welcome123!`, returned in the API response body | `pages/api/admin/create-tenant.ts:43,66` |
| Tenant self-service | Read-only. "Edit Profile" is a dead button; payment methods are static text; notification toggles are unwired `defaultChecked` inputs despite a working `/api/notifications/preferences` | `pages/account/index.tsx:81,101,115` |
| Landlord self-service | Read-only dashboard; payouts hardcoded to `[]`; no property, tenant, lease, or expense management | `pages/landlord/index.tsx`, `hooks/useLandlordData.ts:73` |
| Admin console | 6 pages, partly real data; dashboard mixes live stats with `data/admin.ts` fixtures and a `Math.random()` trend generator; manager name hardcoded "Alex Jordan"; property detail is an `alert()` | `pages/admin/index.tsx:24,73`, `pages/admin/properties.tsx:80` |
| Super-admin | Guard bypass only | `components/Auth/AuthGuard.tsx:46` |
| Rent collection | **None.** Stripe was removed in `a392a65`; `stripeCustomerId`, `savedPaymentMethods`, `stripePaymentIntentId` remain as vestigial types/rules | `types/schema.ts:12,128` |
| Data model | Two incompatible `Property` shapes (structured `address`/`defaultRentAmount`/`status` vs. flat `address`/`rent`/`managementStatus`), bridged by `as unknown as` casts | `types/schema.ts:23` vs `pages/api/admin/create-property.ts:92` |
| Timestamps | Mixed `serverTimestamp()`, `new Date()`, and ISO strings; `paidAt` vs `paidDate` mismatch | `pages/api/admin/create-tenant.ts:54`, `hooks/usePortalData.ts:64` |
| Tests | None for the app (only `automation/test.js`) | `AGENTS.md` |
| CI/CD | None — no `.github/` at all | repo root |
| Environments | One Firebase project (`rental-tracker-app-2026`) for everything | `.firebaserc` |
| Observability | `console.error` only | repo-wide |
| Security headers | Only a service-worker header; no CSP, HSTS, frame-options | `next.config.js:20` |
| Backups | Not configured | — |
| Legal pages | None (no ToS, privacy, Fair Housing, e-sign consent) | — |

---

## 2. Decisions we need (recommendations included)

These change the shape of the work. Each has a default I recommend so
implementation is not blocked; flag any you want changed.

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| D1 | How does rent get paid? | **Stripe Connect** — ACH (~$0.80 capped) + card for tenants, Express accounts for landlord payouts, hosted Elements to stay in PCI SAQ-A. Alternatives: Dwolla (ACH-only, cheaper at volume, more build), or stay manual-record-only and launch without online payments. | W7, parts of W3/W4 |
| D2 | Who owns property + contact data — the app or GoHighLevel? | **App is the system of record; GHL becomes a downstream mirror for marketing/comms.** Today GHL is the source and in-app property creation is disabled by default (`ALLOW_MANUAL_PROPERTY`), which structurally prevents landlords from managing their own properties. Keep the pull sync for migration, then flip to push-only. | W2, W4 |
| D3 | Single-org or true multi-org SaaS? | **Single Firebase project; `landlordId` is the ownership boundary.** Denormalize `landlordId` onto every scoped document. Full org/workspace modeling is a post-launch concern. | W2, all rules |
| D4 | Lease signatures | **Click-to-accept with a server-stamped audit record + generated PDF** for launch (ESIGN/UETA-compliant when done correctly). Upgrade to Dropbox Sign/DocuSign when volume justifies it. | W3, W4 |
| D5 | Can landlords self-sign-up? | **Invite-only at launch.** Admin creates the landlord; self-serve signup is a growth feature, not a launch feature. | W1 |
| D6 | Session policy | **Keep `browserSessionPersistence` for admin/super-admin; switch tenants and landlords to `browserLocalPersistence` with a 30-day refresh and a 60-minute idle timeout.** Logging tenants out on every tab close will drive support tickets. | W1 |
| D7 | Rental Autopilot (`automation/`) | **Move server-side.** A localhost-only Node dashboard cannot be the production comms path. Port the pure rule/template functions in `automation/engine.js` into a scheduled Cloud Function + an in-app admin review queue; keep `automation/test.js` as the test suite. | W5 |
| D8 | MFA for privileged accounts | **Required (TOTP) for `admin` and `super-admin`.** Non-negotiable once super-admin can move money and impersonate users. | W1 |

---

## 3. Target architecture

### 3.1 Roles

```
super-admin   platform owner. Sees and controls everything, across all landlords.
              Can administer roles, impersonate, audit, flip flags, run data tools.
admin         Next Level Rentals staff. Full operational access across all
              landlords, but cannot administer roles, impersonate, or run
              destructive data tools.
landlord      Owns properties. Full control of their own portfolio: properties,
              units, tenants, leases, maintenance approvals, expenses, payouts,
              statements. Scoped strictly by landlordId.
tenant        Occupies a unit. Manages their own profile, payment methods,
              rent payments, maintenance requests, documents, notifications.
```

### 3.2 Authorization model (the important change)

Move the authorization decision **off the client-writable Firestore document
and onto the Firebase Auth token.**

```
                      ┌─────────────────────────────┐
   role change  ───▶   │ POST /api/admin/set-role    │  admin+ only, audited
                      │  1. setCustomUserClaims()    │
                      │  2. mirror to users/{uid}    │  ← display/query only
                      │  3. revokeRefreshTokens()    │  ← forces claim refresh
                      │  4. write auditLogs entry    │
                      └─────────────────────────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              ▼                                            ▼
   Firestore rules read                        API routes read
   request.auth.token.role                     decoded.role via withRole()
   (no get() → cheaper + not
    self-writable)
```

Three consequences:

- `users/{uid}.role` becomes a **read-only mirror** for display and queries.
  Rules deny client writes to `role`, `landlordId`, `propertyIds`, and
  `accountStatus` outright.
- Firestore rules stop doing a `get()` on every evaluation — that's one fewer
  billed read per rule check, on every single document access.
- Role changes take effect on the next token refresh, forced immediately by
  `revokeRefreshTokens`. `AuthContext` reads `getIdTokenResult()` claims as the
  authoritative role and treats the Firestore doc as profile data only.

Add `middleware.ts` for defense in depth: verify the session cookie and role
at the edge so `/admin/*` and `/super/*` are never served to an unauthorized
browser. Client-side `AuthGuard` stays for UX, not as the security boundary.

### 3.3 Permission matrix

`✓` full · `own` scoped to self · `port` scoped to own portfolio · `—` none

| Capability | tenant | landlord | admin | super-admin |
|---|---|---|---|---|
| View/edit own profile, phone, avatar | own | own | own | own |
| Change own password / MFA | own | own | own (MFA required) | own (MFA required) |
| **Change anyone's role** | — | — | — | ✓ |
| Suspend / delete a user, revoke sessions | — | — | suspend only | ✓ |
| Impersonate ("view as") | — | — | — | ✓ (audited, banner, time-limited) |
| View audit log | — | own actions | ✓ | ✓ |
| Create landlord account | — | — | ✓ | ✓ |
| Create/invite tenant | — | port | ✓ | ✓ |
| Create/edit property, units, listings | — | port | ✓ | ✓ |
| Publish listing to public site | — | port | ✓ | ✓ |
| Create/amend/end lease | sign own | port | ✓ | ✓ |
| View lease documents | own | port | ✓ | ✓ |
| Submit maintenance request | own | — | ✓ | ✓ |
| Approve maintenance spend / assign vendor | — | port | ✓ | ✓ |
| Update maintenance status | comment own | port | ✓ | ✓ |
| Add payment method, pay rent, autopay | own | — | — | — |
| View ledger / statements | own | port | ✓ | ✓ |
| Record manual payment, post adjustment | — | — | ✓ | ✓ |
| Refund / void a transaction | — | — | request | ✓ |
| Enter expenses, upload receipts | — | port | ✓ | ✓ |
| Payout settings + payout history | — | port | ✓ | ✓ |
| Owner statement / 1099 export | — | port | ✓ | ✓ |
| Global cross-portfolio search | — | — | ✓ | ✓ |
| Feature flags / app config | — | — | — | ✓ |
| Integration health + resync | — | — | view | ✓ |
| Data export / erase (DSAR) | request own | — | — | ✓ |
| Maintenance mode, force sign-out all | — | — | — | ✓ |

### 3.4 Canonical data model

Consolidate to one shape per entity and denormalize `landlordId` everywhere so
rules can authorize without cross-document lookups.

```
users/{uid}                role*, displayName, email, phone, photoURL,
                           landlordId*, propertyIds*, accountStatus*,
                           onboardingCompleted, mfaEnrolled, createdAt, updatedAt
                           (* server-write only)

landlords/{id}             profile, businessName, taxId(ref), payoutMethodRef,
                           accountStatus, onboardingComplete, aggregates(server-only)

properties/{id}            landlordId, name, address{street,city,state,zip},
                           bedrooms, bathrooms, squareFeet, rent, status,
                           listingPublished, amenities[], images[], ghlObjectId

units/{id}                 propertyId, landlordId, label, rent, status
                           (introduce now; multi-unit is inevitable)

leases/{id}                unitId, propertyId, tenantId, landlordId, term,
                           monthlyRent, deposit, paymentDueDay, status,
                           documents[], signedAt, signatureAudit

ledger/{id}                tenantId, landlordId, propertyId, leaseId, type
                           (charge|payment|adjustment|fee), amount, balanceAfter,
                           date, sourceRef  ← accounting truth, append-only

payments/{id}              leaseId, tenantId, landlordId, propertyId, amount,
                           status, method, processorRef, paidAt
                           ← transaction records; each posts one ledger entry

maintenanceRequests/{id}   tenantId, landlordId, propertyId, unitId, title,
                           description, priority, status, category, vendorId,
                           approvedSpend, timeline[], attachments[]

landlordExpenses/{id}      landlordId, propertyId, type, category, amount,
                           vendor, date, status, receiptUrls[]

payouts/{id}               landlordId, amount, netAmount, status, dates,
                           processorRef, lineItems[]

auditLogs/{id}             actorUid, actorRole, impersonatedUid?, action,
                           targetType, targetId, before, after, ip, userAgent,
                           createdAt   ← append-only, server-write only

appConfig/settings         feature flags, maintenanceMode, launch toggles
                           (super-admin write only)
```

**Naming fixes required:** `paidDate` → `paidAt`; all `createdAt`/`updatedAt`
become Firestore `Timestamp` (kill the ISO string at
`pages/api/admin/create-tenant.ts:54`); one `Property.address` shape.

The JSON schemas already checked in under `.agent/db-schema-validator/resources/`
should become the enforced contract — wire `validate_firestore.py` into CI.

---

## 4. Workstreams

Estimates are dev-days for one experienced full-stack engineer. Total ≈ 118
dev-days ≈ 12–14 calendar weeks with one engineer, or ~7–8 weeks with two
working in parallel across the streams marked ∥.

### W0 — Security hotfix (must land before anything else) — 8 days

The current rules and mock-mode fallback make the app unsafe to point at real
tenant data. Nothing else should merge ahead of this.

| # | Task | Acceptance criteria |
|---|---|---|
| 0.1 | Lock down `users/{uid}` writes | A tenant cannot modify `role`, `landlordId`, `propertyIds`, or `accountStatus` by any client path. Rules test proves it fails. |
| 0.2 | Custom claims as authz source | Rules read `request.auth.token.role`; `set-role` API sets claims, mirrors the doc, revokes refresh tokens, and writes an audit entry. No rule performs `get(users/…)` for role. |
| 0.3 | Delete `/api/admin/init-schemas` | Route removed (its job is a one-off script, not an endpoint). Any residual need moves to `scripts/`. |
| 0.4 | `withRole()` API middleware | Every route under `pages/api/` (except `properties/public`) wraps in a single helper that verifies the token, checks role, and returns 401/403 consistently. Boilerplate deleted from 15 handlers. |
| 0.5 | Fail-fast Firebase config | Mock mode activates only when `NEXT_PUBLIC_USE_MOCK === 'true'` **and** `NODE_ENV !== 'production'`. Missing prod config throws at boot, not silently mocks. |
| 0.6 | No default-to-tenant on read failure | A failed profile read yields an explicit error state and denies access; it never grants a role. |
| 0.7 | Kill hardcoded temp passwords | `create-tenant` generates no password. It creates the user and emails a single-use set-password link via GHL. No secret in any response body. |
| 0.8 | Security headers + CSP | CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy` set in `next.config.js`. Report-only CSP first, enforce after one week of clean reports. |
| 0.9 | Firebase App Check | Enforced on Firestore, Storage, and Auth. reCAPTCHA Enterprise on web. |
| 0.10 | Rules test suite | `@firebase/rules-unit-testing` covering all four roles × every collection, including the escalation attempt from 0.1 and the landlord `payments` read from 4.1. Runs in CI. |
| 0.11 | `middleware.ts` edge gate | `/admin/*` and `/super/*` return 302 to `/login` for unauthorized sessions before any HTML is served. |
| 0.12 | Secret hygiene sweep | No secrets in git history; rotate `GHL_API_KEY` and any exposed service-account key; document rotation in the runbook. |

### W1 — Identity, provisioning, account management — 12 days ∥

| # | Task | Notes |
|---|---|---|
| 1.1 | Invite-based onboarding | Admin/landlord invites → GHL email → set-password + accept-terms → `onboardingCompleted`. Replaces the temp-password flow. |
| 1.2 | Landlord provisioning | `POST /api/admin/landlords` + admin UI. Creates the auth user, `landlords/{id}`, claims, and audit entry. **Currently impossible — this unblocks the entire landlord role.** |
| 1.3 | Email verification | Required before first sensitive action (payment method, lease signature). |
| 1.4 | Password reset | Self-service reset (missing from `pages/login.tsx`) + admin-triggered reset. |
| 1.5 | MFA (TOTP) | Enrollment flow; enforced for `admin`/`super-admin` per D8. |
| 1.6 | Session policy | Implement D6 (per-role persistence + idle timeout + explicit "sign out everywhere"). |
| 1.7 | Self-service profile edit | `PATCH /api/me/profile` (name, phone, avatar upload, comms preferences). Replaces the dead button at `pages/account/index.tsx:81`. Server rejects any privileged field. |
| 1.8 | Audit logging library | `lib/audit.ts` — `recordAudit({actor, action, target, before, after})`. Called by **every** privileged mutation. Append-only; no client write path. |
| 1.9 | Account status lifecycle | `active | suspended | closed`. Suspended users are blocked at middleware and in rules. |

### W2 — Data model consolidation + migration — 10 days

| # | Task | Notes |
|---|---|---|
| 2.1 | One canonical `Property` | Pick the structured shape; write `scripts/migrate-properties.js` with dry-run, backup-to-GCS, and rollback. Delete every `as unknown as` cast in `hooks/useLandlordData.ts` and `pages/landlord/index.tsx`. |
| 2.2 | Introduce `units` | Even single-family stays modelled as one unit. Removes the string-`unit`-on-user-doc hack. |
| 2.3 | `leases` as tenancy truth | Derive `users.propertyIds` from active leases server-side rather than writing it by hand. |
| 2.4 | Denormalize `landlordId` | Backfill onto `payments`, `ledger`, `maintenanceRequests`, `leases`. Prerequisite for portfolio-scoped rules. |
| 2.5 | Timestamp + field-name normalization | All `Timestamp`; `paidDate` → `paidAt`; migration handles existing docs. |
| 2.6 | Ledger/payments contract | Ledger append-only and authoritative; each payment posts exactly one idempotent ledger entry keyed by `processorRef`. |
| 2.7 | Schema validation in CI | Wire `.agent/db-schema-validator/scripts/validate_schema.py` + the index validator into the pipeline. |
| 2.8 | Index review | Add the composites the new portfolio-scoped queries need (`landlordId` + status/date on payments, maintenance, units). |

### W3 — Tenant account management — 14 days ∥

| # | Feature | Acceptance criteria |
|---|---|---|
| 3.1 | Profile & contact management | Edit name/phone/avatar/emergency contact; changes audited. |
| 3.2 | Notification preferences | Wire the existing `/api/notifications/preferences` to the UI at `pages/account/index.tsx:106` (currently unwired `defaultChecked` checkboxes). Per-channel × per-event grid; push opt-in via existing FCM. |
| 3.3 | Payment methods (D1) | Add/remove card + ACH via hosted Elements; set default; no PAN ever touches our servers. |
| 3.4 | Pay rent (D1) | Pay balance or custom amount; partial payments allowed; receipt emailed; ledger entry posted idempotently. |
| 3.5 | Autopay | Enroll/unenroll, choose day and cap; pre-charge notice; clear failure handling. |
| 3.6 | Ledger & statements | Running balance, transaction history, downloadable PDF receipts and annual statement. |
| 3.7 | Maintenance, end-to-end | Submit with photos (`storageUtils` exists), see a status timeline, comment thread, rate on completion. |
| 3.8 | Lease documents | View/download own lease and addenda; sign per D4; signature audit record. |
| 3.9 | Tenant document uploads | Renter's insurance, pet records, vehicle registration — with admin/landlord review status. |
| 3.10 | Renewal flow | Offer → accept/decline → new lease generated. Pairs with the renewals logic already in `automation/engine.js`. |
| 3.11 | Move-out request | Notice-to-vacate with required-notice validation, checklist, deposit disposition. |

### W4 — Landlord account, properties, tenants — 18 days ∥

| # | Feature | Acceptance criteria |
|---|---|---|
| 4.1 | **Fix the landlord payments read** | Add `resource.data.landlordId == request.auth.uid` to the `payments` read rule. The landlord dashboard stops erroring. Regression test in the rules suite. |
| 4.2 | Landlord onboarding | Business profile, W-9/tax details, payout method, document upload → admin review (`landlordDocuments` rules already support this). |
| 4.3 | Property CRUD, portfolio-scoped | Landlord creates/edits/archives their own properties. Requires D2 (app becomes source of record) and rules allowing `landlordOwnsProperty` writes — today `properties` write is admin-only (`firestore.rules:43`) and manual creation is env-flagged off. |
| 4.4 | Unit & listing management | Unit roster, rent, vacancy status, publish/unpublish to the public site (`lib/properties-public.ts` already serves it). |
| 4.5 | Tenant management | Invite a tenant, assign to a unit, view tenant detail (lease + ledger + maintenance + comms), end tenancy. |
| 4.6 | Lease management | Create, amend, renew, terminate. Rules already permit landlord lease writes (`firestore.rules:82`) — the UI and API are what's missing. |
| 4.7 | Maintenance oversight | Approve/decline, set a spend cap, assign a vendor, thread with the tenant, close out with cost → posts an expense. |
| 4.8 | Expenses & receipts | Manual entry + receipt upload, categorization, per-property roll-up. |
| 4.9 | Financials | Rent roll, occupancy, collections rate, delinquency aging, net operating income per property. Reuse the existing `components/charts/*` and `recharts` setup. |
| 4.10 | Payouts | Payout schedule, history, per-payout line items, statement PDF. Replaces `payouts: []` at `hooks/useLandlordData.ts:73`. |
| 4.11 | Owner statement + tax export | Monthly owner statement PDF; annual income/expense export (1099-ready CSV). |
| 4.12 | Landlord notifications | New maintenance, spend approvals needed, payment received, payout sent, lease expiring. |
| 4.13 | Realtime + pagination pass | Replace the N+1 loop at `hooks/useLandlordData.ts:61` (one query per property) with a single `landlordId`-scoped query; add pagination for portfolios over ~50 units. |

### W5 — Admin (staff) console — 12 days ∥

| # | Task | Notes |
|---|---|---|
| 5.1 | De-mock the dashboard | Remove `data/admin.ts` fixtures, the `Math.random()` trend generator (`pages/admin/index.tsx:24`), and the hardcoded "Alex Jordan" (`:73`). Real aggregates from a maintained `stats` rollup doc rather than client-side full-collection scans. |
| 5.2 | Property detail page | Replace the `alert()` at `pages/admin/properties.tsx:80` with a real page: units, leases, maintenance history, financials, documents. |
| 5.3 | Landlord management screens | List, detail, document review/approve, payout management, account status. Nothing exists today. |
| 5.4 | Tenant detail page | One page consolidating lease, ledger, payments, maintenance, documents, comms history. |
| 5.5 | Work orders + vendor directory | Vendor CRUD, assignment, SLA tracking, cost capture. |
| 5.6 | Communications | Port `automation/engine.js` server-side per D7: scheduled Cloud Function generates drafts, admin reviews and sends from an in-app queue, delivery status tracked. |
| 5.7 | GHL sync status page | Last sync, per-record errors, retry, conflict resolution. |
| 5.8 | Reporting | Portfolio-wide collections, delinquency, maintenance throughput, occupancy trend; CSV export. |
| 5.9 | Nav + IA cleanup | Add the new sections to `components/Admin/AdminLayout.tsx:99` and give `super-admin` a distinct entry point. |

### W6 — Super-admin console (`/super/*`) — 14 days

This is the "see and control everything" surface, and it is entirely new. It is
super-admin-only, gated at middleware, rules, and API; every action is audited.

| # | Capability | Detail |
|---|---|---|
| 6.1 | Console shell | `/super` route group with its own layout and an unmistakable visual treatment so it's never confused with the staff console. |
| 6.2 | Global search | One box across users, landlords, properties, units, leases, payments, maintenance, audit entries → jump to any record. |
| 6.3 | User & role administration | Create any user at any role, change roles (drives the W0.2 `set-role` flow), suspend/reactivate, force password reset, **revoke all sessions** (`revokeRefreshTokens`), delete with cascade preview. |
| 6.4 | Impersonation / "view as" | Time-limited (default 30 min), **read-only by default**, persistent banner, reason required, fully audited, one-click exit. Write-enabled impersonation requires a second confirmation and is logged as such. |
| 6.5 | Audit log viewer | Filter by actor, target, action, date, impersonation; before/after diffs; CSV export. Append-only, no delete path from any surface. |
| 6.6 | Feature flags & app config | `appConfig/settings`: online payments, autopay, AI chat, autopilot sends, landlord self-serve, public listings. Toggles take effect without a deploy. |
| 6.7 | Integration health | GHL, Gemini, FCM, payment processor: last success, error rate, recent failures, manual resync, credential status and expiry. |
| 6.8 | Data tools | Run/re-run migrations and backfills with dry-run + diff preview; DSAR export and erase for a user; destructive actions behind double confirmation **and** reauthentication. |
| 6.9 | System metrics | Active users, sign-in failures, API error rate, payment success rate, scheduled-job health, Firestore read/write volume and cost trend. |
| 6.10 | Emergency controls | Maintenance mode (read-only app + banner), disable logins, force sign-out all users, pause outbound comms, pause payment processing. Each requires reauth and is audited. |
| 6.11 | Billing/plan management | If landlords are billed for the platform: plan, seats, invoices, dunning. Deferrable if launch is a single-org rollout. |

### W7 — Payments & money movement — 16 days (gated on D1)

| # | Task | Notes |
|---|---|---|
| 7.1 | Processor integration | Stripe Connect: platform account, Express accounts per landlord, KYC onboarding, ACH + card acceptance. |
| 7.2 | Invoicing scheduler | Cloud Function cron: generate monthly rent charges from active leases; idempotent per (lease, period). |
| 7.3 | Late fees & grace periods | Per-lease configurable; posted as ledger entries; never applied twice for one period. |
| 7.4 | Payment plans | The `paymentPlans` collection and `components/Admin/PaymentPlanCard.tsx` exist — wire scheduling, adherence tracking, and auto-charge. |
| 7.5 | Webhook reconciliation | Signature-verified endpoint; idempotency keys; every processor event maps to exactly one ledger effect; replay-safe. |
| 7.6 | Failure handling | NSF, card decline, dispute/chargeback: retry policy, tenant notice, admin queue. |
| 7.7 | Payout engine | Rent collected − fees − expenses → landlord payout on schedule; per-payout statement; hold rules for pending funds. |
| 7.8 | Refunds & voids | Admin-requested, super-admin-approved; reversing ledger entries, never edits. |
| 7.9 | Compliance review | PCI SAQ-A confirmation; state property-management and trust-account rules; whether we are handling client funds and what licensing that implies. **Needs counsel — flagged as a launch gate, not an engineering task.** |

### W8 — Quality, CI/CD, observability — 10 days ∥

| # | Task | Acceptance criteria |
|---|---|---|
| 8.1 | Test stack | Vitest + React Testing Library; `npm test` exists and is green. Unit coverage on `lib/` money and date logic first. |
| 8.2 | Rules tests | From W0.10, running against the emulator in CI on every PR. |
| 8.3 | E2E | Playwright (already available in this environment) covering the four role journeys: tenant pays rent, landlord adds a property + invites a tenant, admin resolves a work order, super-admin changes a role. |
| 8.4 | CI pipeline | `.github/workflows/ci.yml`: lint → typecheck → unit → rules → build → E2E on PR. Branch protection requires green. |
| 8.5 | CD pipeline | Merge to `main` deploys to staging; tagged release promotes to production; rules and indexes deploy with the app, never by hand. |
| 8.6 | Staging environment | A second Firebase project + `.firebaserc` targets + separate GHL location. Today one project serves everything. |
| 8.7 | Error tracking | Sentry (or GCP Error Reporting) on client and server; release tagging; alerting on new-error and error-rate. |
| 8.8 | Structured logging | Request-scoped correlation ids through API routes; no PII in logs; retention policy set. |
| 8.9 | Uptime + alerts | Synthetic checks on `/`, `/login`, `/api/properties/public`; alerts on payment-failure rate, scheduled-job failure, auth error spike. |
| 8.10 | Backups + restore drill | Scheduled Firestore exports to GCS, 30-day retention, and a **documented, actually-performed** restore test. |
| 8.11 | Performance | Bundle audit, ISR for public pages, kill client-side full-collection scans, verify every production query has an index. |
| 8.12 | Accessibility | WCAG 2.1 AA pass: keyboard nav, focus management in the modals, contrast in both themes, labelled form controls, screen-reader review of the tenant journey. |
| 8.13 | Load test | Rent-day peak: concurrent sign-ins and payments at 10× expected volume. |

### W9 — Launch: legal, migration, rollout — 8 days

| # | Task | Notes |
|---|---|---|
| 9.1 | Legal pages | Terms of Service, Privacy Policy, Fair Housing statement, ADA/accessibility statement, ESIGN/UETA e-sign consent, cookie notice if analytics ship. **Counsel review required.** |
| 9.2 | Data retention & DSAR policy | Documented retention windows; the erase/export tooling from W6.8 backs it. |
| 9.3 | Production migration | Import real tenants/properties from GHL: dry-run → reconcile balances against the current books → sign-off → cutover. Balance reconciliation is the risky step; budget real time for it. |
| 9.4 | Pilot | One landlord, one property, ~10 tenants, two weeks. Payments in live mode with small amounts. Exit criteria: zero data-integrity defects, no P1s, positive tenant feedback. |
| 9.5 | Support readiness | Help center, in-app support entry point, escalation path, on-call rotation, incident template. |
| 9.6 | Rollout | Soft launch (pilot) → all NLR-managed tenants → landlord self-service → public listings. Feature flags (W6.6) gate each step; rollback is a flag flip, not a deploy. |
| 9.7 | Post-launch review | 30/60/90-day metrics: adoption, on-time payment rate, maintenance cycle time, support volume, error rate. |

---

## 5. Phasing

```
Week   1    2    3    4    5    6    7    8    9   10   11   12   13
W0  ████████
W1       ███████████████
W2            ██████████████
W3                 ████████████████████
W4                 ██████████████████████████
W5                           ██████████████████
W6                                ██████████████████
W7                                     ████████████████████
W8       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   (continuous)
W9                                                   ████████████
```

| Milestone | Exit criteria |
|---|---|
| **M0 — Safe to point at real data** (end wk 2) | W0 complete. No privilege escalation, no unauthenticated write endpoints, no silent mock mode in prod, rules test suite green in CI, staging exists. |
| **M1 — Foundation** (end wk 4) | Claims-based authz live; invite onboarding works; landlords can be provisioned; data model migrated with rollback proven on staging. |
| **M2 — Tenant complete** (end wk 7) | A tenant can do everything they need without contacting anyone: profile, notifications, maintenance, documents, lease, and (if D1 = Stripe) pay rent. |
| **M3 — Landlord complete** (end wk 9) | A landlord can manage their account, properties, units, tenants, leases, maintenance approvals, expenses, and see their financials and payouts. |
| **M4 — Full control** (end wk 10) | Admin console de-mocked and complete; super-admin console shipped with audit, impersonation, role admin, flags, and emergency controls. |
| **M5 — Money live** (end wk 11) | Payments, payouts, reconciliation, and failure handling proven in Stripe test mode and then in live mode at pilot scale. Compliance sign-off obtained. |
| **M6 — Launch** (end wk 13) | Pilot exit criteria met, legal pages live, backups + restore drill done, on-call staffed, rollout flags flipped. |

**Two-engineer split:** engineer A takes W0 → W1 → W2 → W6 → W7 (platform,
security, money). Engineer B takes W3 → W4 → W5 (product surfaces) and picks up
W8 continuously. W9 is shared.

---

## 6. Launch gate checklist

Nothing goes to production with an unchecked box.

**Security**
- [ ] No client path can write `role`, `landlordId`, `propertyIds`, or `accountStatus`
- [ ] Rules read `request.auth.token.role`, not a client-writable document
- [ ] Rules test suite covers all four roles × every collection, green in CI
- [ ] Every API route goes through `withRole()`; no unauthenticated mutation endpoint
- [ ] Edge middleware gates `/admin/*` and `/super/*`
- [ ] App Check enforced on Firestore, Storage, Auth
- [ ] MFA enforced for `admin` and `super-admin`
- [ ] CSP enforced; HSTS, frame-options, referrer-policy set
- [ ] Secrets rotated, none in git history, rotation documented
- [ ] Penetration test or external security review completed
- [ ] Every privileged mutation writes an audit entry; audit log has no delete path

**Correctness**
- [ ] One canonical shape per entity; zero `as unknown as` casts across role boundaries
- [ ] Ledger is append-only and reconciles to processor records to the cent
- [ ] Invoicing, late fees, and webhook handling are idempotent (proven by replay test)
- [ ] Migration dry-run → staging run → balance reconciliation signed off
- [ ] No mock data or `Math.random()` in any production code path

**Operations**
- [ ] Staging environment mirrors production
- [ ] CI green required to merge; CD deploys rules and indexes with the app
- [ ] Error tracking live with alerting; structured logs with correlation ids
- [ ] Scheduled Firestore backups + a restore drill that was actually performed
- [ ] Uptime checks and payment-failure alerts wired to on-call
- [ ] Load test passed at 10× expected rent-day peak
- [ ] Runbook written: rotate secrets, restore data, roll back a release, handle a failed payout

**Product**
- [ ] Each of the four roles can complete their core journey end-to-end, verified by E2E tests
- [ ] WCAG 2.1 AA pass on the tenant and landlord journeys
- [ ] Mobile verified on the flows tenants actually use (pay, request, sign)
- [ ] Empty, loading, and error states exist on every data-backed screen

**Legal / compliance**
- [ ] ToS, Privacy Policy, Fair Housing, accessibility statement, e-sign consent published
- [ ] Payment compliance (PCI SAQ-A) and state trust-account/licensing questions answered by counsel
- [ ] Data retention and DSAR process documented and tooled

---

## 7. Risk register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Privilege escalation exploited before W0 ships | Critical — total data compromise | High while unfixed | W0.1 first commit; do not onboard real tenants until M0 |
| Balance reconciliation wrong during migration | Critical — tenants billed incorrectly, trust destroyed | Medium | Dry-run + line-by-line reconciliation against current books + landlord sign-off before cutover (W9.3) |
| Money-movement compliance gap | Critical — regulatory exposure | Medium | Counsel review at W7.9 as a hard launch gate; do not go live on payments without it |
| GHL-as-source-of-truth blocks landlord property management | High — a core promised feature can't ship | High if D2 unresolved | Resolve D2 in week 1; keep pull sync for migration, flip to push-only after |
| Client-side full-collection scans blow up cost/latency at scale | Medium | High | Rollup docs for aggregates (W5.1); portfolio-scoped queries (W4.13); enforce index coverage |
| Impersonation misused or abused | High — trust and legal exposure | Low | Read-only default, time limits, reason required, banner, full audit, super-admin-only |
| Single Firebase project — a bad rules deploy takes down production | High | Medium | Staging project (W8.6); rules deployed only through CD with tests passing |
| Scope creep from "everything in the super-admin console" | Medium — timeline slip | High | W6 scope is fixed to the table above; 6.11 is explicitly deferrable |
| No tests today means every refactor is a gamble | Medium | High | W8.1 lands alongside W1, not at the end; money logic gets tests first |

---

## 8. Immediate next actions

1. Confirm or amend D1–D8 (§2). D1 and D2 are the two that reshape real work.
2. Start W0 — the `users/{uid}` rule fix is the first commit, with a rules test
   that fails on the old rule and passes on the new one.
3. Stand up the staging Firebase project (W8.6) and the CI workflow (W8.4) in
   parallel, so W0 lands behind a green pipeline rather than in front of one.
4. Do not onboard real tenants or landlords until M0 is signed off.
