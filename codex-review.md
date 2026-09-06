# Review of gemini-plan.md and the current implementation

Reviewed September 5, 2026 against the current working tree, including untracked files. The original plan and application code were preserved. Changes described as new are present in the working-tree diff or untracked files; this does not establish who authored them or whether they are deployed.

**Assessment: substantial UI and workflow scaffolding, but not a production-ready property management platform.** The most serious new defect is that online payment records are created without collecting money. Several existing authorization defects also undermine the new workflows. Passing compilation does not establish operational correctness.

## What was implemented

| Plan area | Current evidence | Completion assessment |
| --- | --- | --- |
| Phase 1: roles and models | `/portal` redirects landlords to `/landlord` and admins to `/admin`; new `LandlordLayout`; expanded property/unit, lease, work-order, ledger, profile, insurance, payout and announcement types. | Partial. Resident portal retains `SiteLayout`. Types do not provide unit CRUD, co-signer workflows, migrations, validation or consistent persisted formats. |
| Phase 2: owner portal | New property list/detail, financials, expenses, payouts, maintenance and documents routes; overview uses shared owner layout; property links replace detail alerts. | Partial. Owner reads conflict with rules; financial periods are ineffective; documents are samples; payout history is never fetched. Expense form writes records but has no receipt upload. Full unit/occupancy/billed KPI set and complete property gallery are not established. |
| Phase 3: administration | Property creation button enabled; property and tenant detail pages; lease form creates lease, deposit/rent charges and property occupancy update. | Partial. Server property-creation flag remains conditional; edit is still an alert; units are displayed, not managed. New-tenant creation is a placeholder ID. No complete renewals, invitation, PDF upload, proration, vendor dispatch, scheduling or invoice-to-expense workflow. Tenant details provide contact/lease/ledger context, not the full communications and management suite. |
| Phase 4: resident portal | Ledger-based balance attempt, Pay Rent modal/API, maintenance images and entry/pet fields, lease information, insurance metadata, profile/emergency contact/vehicle/pet saves, notification save request. | Partial and unsafe for payments. Balance ignores existing adjustment format; lease date format can crash portal; files are not uploaded to Storage; signed-document mapping remains a stub. Payment methods/autopay are not backed by a processor. Announcements/resources remain fixtures. |
| Phase 5: automation | Announcement type and existing notification infrastructure are present. | Not implemented as planned. No monthly-charge scheduler, automated late-fee assessment or property announcement creation/delivery engine found in the checked-in application. External jobs were not inspected. |

## What is good

- The plan identifies useful missing workflows and separates resident, owner and operator responsibilities. Its ledger-first balance direction and role-specific navigation are sensible.
- Navigation is materially more complete: owner pages share a layout and admin property/tenant links lead to actual detail pages.
- Profile editing now has authenticated server persistence and refreshes profile data. Emergency contacts, vehicles and pets are useful additions.
- Maintenance entry permission and pet information travel through the form and API into the ticket; previews/removal improve the submission UI.
- Existing Firebase helpers are reused, and new API routes verify Firebase ID tokens. These are useful foundations, although authentication alone is insufficient authorization.
- All three compilation/code-quality gates pass, with two lint warnings. The added routes appear in the production build.

## What is wrong and how to correct it

### 1. Critical: online payment success is fabricated

**Evidence:** `pages/api/payments/pay-rent.ts:56` onward creates a `paid` payment and a `completed` ledger credit from the caller's amount, then reflects success to GHL. There is no processor call or settlement proof. `components/Portal/PayRentModal.tsx:60` sends only amount, method, description and last four digits; bank/card inputs and the autopay toggle do not initiate payment processing.

**Impact:** An authenticated user can lower their recorded balance without transferring funds. Repeated requests create additional credits; sequential writes can leave payment history and ledger inconsistent. The UI supplies a misleading confirmation.

**Correction:** Disable this success-writing route and CTA until a real integration exists. Create server-authorized payment sessions tied to a valid tenant/lease, validate amounts in integer cents, and use processor-hosted payment fields. Record settlement from verified provider events, deduplicate events, and atomically update payment/ledger records. Handle pending ACH, failures, returns and refunds explicitly. Autopay requires a persisted authorization and schedule. Stripe documents webhook-driven fulfillment and signature verification: [fulfillment](https://docs.stripe.com/checkout/fulfillment), [webhooks](https://docs.stripe.com/webhooks).

**Acceptance:** A direct client request cannot create a settled credit; duplicate events credit once; failed/pending transactions do not appear paid; payment/ledger reconciliation passes in provider test mode.

### 2. Critical, pre-existing: users can promote themselves to admin

**Evidence:** `firestore.rules:35` allows users to read/write their entire own user document. `isAdmin()` trusts that document's `role`. Admin API routes also read the same role field.

**Impact:** UI role guards and the new authenticated profile API do not protect direct Firestore writes. A user can change their own role or property assignments. This was not introduced by this diff, but the plan missed a foundational blocker.

**Correction:** Restrict self-service creation/update to explicit profile fields and immutable ownership; make roles, assignments and verification fields server/admin controlled. Audit related lease and maintenance rules for mutable owner/status fields. Test tenant, landlord, admin and unauthenticated access in the emulator, including direct SDK requests.

### 3. High: leases use fake tenant IDs and non-atomic writes

**Evidence:** `pages/admin/leases/new.tsx:123` generates `tenant-${Date.now()}` without creating an Auth user, user document or invitation. Lease, deposit, rent and property updates are separate writes. It does not link the existing tenant's property assignments, identify a real unit document, prevent overlapping active leases, or prorate rent. PDF input is a URL field.

**Impact:** A newly entered resident cannot log in to the lease; partial failures/retries can leave duplicate or incomplete billing. Marking the entire property occupied does not support independently leased units.

**Correction:** Resolve a real user or staged invitation before activation; use a server-side, idempotent activation operation that validates tenant/property/unit/owner and lease dates, prevents conflicts, and commits lease, assignment, occupancy and initial charges atomically. Use explicit unit IDs and billing periods. Add signed-document upload and renewal lifecycle separately.

**Acceptance:** New and existing residents receive the correct assignments; retry creates one lease and one set of charges; injected failure cannot leave half an activation; two units can be leased independently.

### 4. High: new lease dates can crash the resident portal

**Evidence:** The lease wizard stores `startDate`/`endDate` as HTML date strings. `components/Portal/TenantPortal.tsx:44` calls `lease.endDate.toDate()` unconditionally when an end date exists. The widened TypeScript union is bypassed with `any`.

**Correction:** Choose and normalize the persisted date contract at the data boundary. Support legacy string/Timestamp/Date records during migration and use a shared formatter. Preserve calendar-date semantics for lease terms.

**Acceptance:** A wizard-created lease opens in the resident portal without a runtime exception; existing Timestamp leases still work.

### 5. High: resident balance does not match the existing ledger

**Evidence:** `hooks/usePortalData.ts:79` counts only `charge`, `payment` and `credit`. `pages/api/admin/create-ledger-adjustment.ts:52` writes signed amounts with `type: 'adjustment'`, so existing admin adjustments are ignored. The hook also ignores settlement status, clamps credits to zero, and invents a full month's rent when the ledger is empty. Reads are fetch/refresh based rather than a live subscription.

**Correction:** Define one money/sign/status contract and a shared calculation used by resident, admin and owner views. Include signed adjustments and posted charges, exclude failed/unsettled payments, preserve credit balances, and show an uninitialized ledger honestly. Determine due dates from actual unpaid billing obligations and lease rules. Implement subscriptions or accurately describe refresh behavior.

**Acceptance:** Fixtures cover charges, signed fee/credit adjustments, completed/pending/failed payments, overpayments and empty ledgers; all persona balances agree.

### 6. High: owner data loading is incompatible with the rules

**Evidence:** `hooks/useLandlordData.ts:50` calls the existing financial-summary helper. `lib/firebase-utils.ts:1073` queries all tenant users before client-side filtering, while `/users` reads allow only self/admin. `getPaymentsByLandlord` queries payments that the payment rules also restrict to tenant/admin. The new property detail page catches payment errors and substitutes an empty list. Its active-lease query is scoped to property/active status but not the landlord ID required by lease read rules. Payouts remain `[] // TODO: Fetch Payouts` in the hook.

**Impact:** Under the checked-in rules, ordinary owners cannot reliably load these pages. Some screens may show zero/empty financial data after permission errors. An admin session is not a valid test of owner access.

**Correction:** Use narrowly authorized owner queries/projections or server endpoints with verified property ownership. Align query constraints, document ownership fields, rules and indexes. Do not grant owners unrestricted tenant collection reads. Fetch payout history and surface unavailable/error states separately from genuine zero results.

**Acceptance:** Two-owner emulator tests prove each can load their own portfolio and cannot access the other's tenants, leases or finances.

### 7. High: P&L and expense data are inconsistent

**Evidence:** `pages/landlord/financials.tsx:15` stores the selected timeframe without applying it to calculations; the year label is hardcoded. Fees are guessed at 8%. Top-level expense totals include approved/paid records, while category/property breakdowns include other statuses. The existing summary helper includes all expense statuses. `pages/landlord/expenses.tsx:69` passes `invoiceNumber: undefined` when blank, and `createExpense` passes that through to Firestore without sanitization; the client has no `ignoreUndefinedProperties` setting. The new expense rule accepts any authenticated caller's matching `landlordId`, without validating their role, property ownership, amount or initial approval status.

**Correction:** Apply one date window and accounting/status policy throughout the statement; use actual agreed/posted fees. Omit undefined optional fields. Require owner/property validation, bounded amounts, an allowed field set and initial `pending` status at the enforcement layer. Implement receipt upload. Keep approvals restricted to operators.

**Acceptance:** Period changes produce independently reconciled totals; categories sum to the displayed total; blank invoice number saves; clients cannot self-approve expenses or submit against another owner's property.

### 8. Medium: property CRUD and document delivery are overstated

**Evidence:** UI `ALLOW_MANUAL_PROPERTY` is true, but `pages/api/admin/create-property.ts:28` requires an environment flag. Local/deployed flag values were not inspected. `pages/admin/properties/[id].tsx:259` still displays an edit-coming-soon alert; units have no management workflow. `TenantPortal.tsx:55` maps lease documents to `downloadUrl: '#'` instead of saved URLs. `pages/landlord/documents.tsx:17` uses `sampleDocs`, with alerts for upload/download. Payout page wording promises automatic ACH without corresponding processing in the new code.

**Correction:** Align server configuration and UI capability reporting; implement property/unit updates and archival. Map actual authorized document records and Storage objects to downloads, add upload rules for the required document categories, and remove sample documents from live user views. Describe payouts as unavailable until their data and processing integrations exist.

### 9. Medium: maintenance uploads and failure reporting are incomplete

**Evidence:** `MaintenanceRequestForm.tsx:56` reads files as data URLs; the API embeds those strings in a Firestore ticket. This is not Storage upload and grows the request/document with every image. `TenantPortal.tsx:98` catches submission errors without rethrowing, so the child form proceeds to clear input and report success. Preferred entry time, vendor scheduling and invoice workflows are missing.

**Correction:** Upload bounded, validated image files to authorized Storage paths; store references and clean up abandoned uploads. Propagate submission failures to the form and retain input. Validate supplied property membership at the API. Add entry-time/vendor/scheduling/cost workflows with their own authorization and acceptance tests.

### 10. Medium: account and insurance feedback claims more than is saved

**Evidence:** `pages/account/index.tsx:283` awaits preference saves without checking HTTP status and maps rent reminders to maintenance `statusChanges`, announcements to `requestConfirmation`. Vehicle/pet deletions also omit response checks. Saved payment methods are component state. `pages/api/tenant/update-profile.ts:64` accepts client-provided insurance `verified`; `LeaseDocuments.tsx:309` says saved and verified even though the UI submits false. Insurance has no actual upload/verification/expiry workflow.

**Correction:** Use distinct preference keys tied to actual notification events; check every response before displaying success. Persist payment methods only through the provider integration. Keep insurance verification operator controlled, reset review after edits, validate dates and show pending/expired states accurately. Add document evidence and server validation for nested profile arrays.

## Corrections to the plan itself

- Move authorization, schema migration, ledger conventions and real payment-state handling ahead of expanded UI. These are dependencies, not final polish.
- Replace present-tense claims such as fully enabled creation/editing with explicit implemented/partial/planned status and evidence.
- Define the operational source of truth per field, synchronization direction, conflict resolution and retry strategy before enabling bidirectional GHL writes. The prose does not implement that contract.
- Do not promise zero ACH processing fees or instant settlement without a provider agreement and an explicit fee policy. Keep gateway selection an unresolved decision until confirmed.
- Remove existing random financial trends (`pages/admin/index.tsx:30`) and new sample statements/documents from operational screens. Unknown/unavailable must not render as verified data.
- Define completion per phase with rules/index changes, migrations, failure cases and evidence. Add missing recurring billing/late-fee/announcement work explicitly to the backlog; types and labels do not satisfy it.

## Recommended correction order

1. Block fabricated payment writes; close user-role escalation and expense/verification write permissions.
2. Standardize money, dates, IDs and assignments; repair lease activation and resident balance calculation.
3. Repair owner queries/rules/indexes and reconcile P&L calculations; fetch real payouts.
4. Complete property/unit editing, Storage uploads, document downloads and truthful account/maintenance feedback.
5. Implement actual payments and then recurring billing, late fees, announcements, renewals and dispatch, with provider/scheduler-specific validation.

## Verification performed and limits

- `npm run lint`: **passed**, with two `@next/next/no-img-element` warnings in maintenance components.
- `npx tsc --noEmit`: **passed**.
- `npm run build`: **passed**, including new routes and static page generation.
- Reviewed current diffs, new files, related helpers, Firestore/Storage rules, index configuration, notification wiring and package scripts.
- No authenticated browser flows, Firebase emulator tests, payment-provider transactions, deployed rules/index inspection, GHL writes or production data changes were performed. Runtime consequences above are source-based findings, not claimed live reproductions.
- The plan's manual acceptance flows remain **unverified**, with source-level blockers identified above. In particular, no real payment, secure document upload/download, owner expense-to-P&L reconciliation or full lease activation was established.
- There is no configured `npm test` script. Add focused rules/API/accounting tests for the high-risk corrections, plus the three-persona manual flows from the plan. The review is complete; implementation of these corrections is separate work.
