# Code review findings — September 6, 2026

## Summary and review scope

The tenant cleanup is a solid improvement: sample data is removed, empty states are clearer, and settled-payment handling is more accurate. The console and security changes also add useful safeguards. The main remaining concerns are financial accuracy and maintenance triage.

This review covered the recent console/security and tenant cleanup commits (`23f47d7` and `a677931`) and the homepage/theme edits present during the review. Findings below describe the source reviewed at that time; they are not confirmation of current production behavior.

## Findings and recommendations

### 1. High — New lease charges can disappear from admin rent tracking

Lease activation stores ledger dates as strings, while admin rent tracking queries the date field using timestamp boundaries. Newly created string-date charges do not match that timestamp range, so the admin view can omit them.

**Recommendation:** Standardize the stored date type, provide compatibility for existing records, and add an integration test that activates a lease and then reads its charges through admin rent tracking.

**Source:** [lib/activateLease.ts](lib/activateLease.ts), line 122; [lib/firebase-utils.ts](lib/firebase-utils.ts), lines 725–732.

### 2. High — One tenant's payment can mark an entire building “Paid”

The landlord dashboard selects one active lease per property and groups payments by property. A reproduced example with two $1,000 leases and only one $1,000 payment showed the property as “Paid,” hiding the unpaid unit even though expected rent totaled $2,000.

**Recommendation:** Calculate obligations and payment status per lease/unit before aggregating property results. Ensure property summaries cannot hide an unpaid unit, and test buildings with mixed paid and unpaid tenants.

**Source:** [lib/console-home.ts](lib/console-home.ts), lines 276–290 and 315–342.

### 3. High — Early payments can generate false late-rent alerts

The landlord dashboard counts only receipts dated within the current calendar month when determining whether rent is paid. In a reproduced example, September rent paid on August 31 was classified as late in September.

**Recommendation:** Derive payment status from outstanding obligations and payment allocations, while retaining receipt dates for cash-flow reporting. Cover early payments, partial payments, credits, and payments against older obligations.

**Source:** [lib/console-home.ts](lib/console-home.ts), lines 282–290 and 322–342.

### 4. Medium — Lease grace periods disappear between API and dashboard

The owner API omits `lateFeeGraceDays` and the legacy grace-period configuration that the dashboard reads. A synthetic check through the actual owner projection showed a lease with ten grace days becoming “Late,” while passing the original lease directly to the dashboard helper correctly kept it within the grace period.

**Recommendation:** Include the required lease terms in the owner projection and test the complete API-to-dashboard data path, including legacy field compatibility.

**Source:** [lib/ownerData.ts](lib/ownerData.ts), line 23; [lib/console-home.ts](lib/console-home.ts), lines 324–327.

### 5. High — Unmatched public maintenance requests cannot progress

Public submissions that cannot be matched receive `propertyId: "unassigned"`. The work-order update workflow requires an existing property and rejects those requests with “Property not found.” A synthetic check reproduced this rejection. The reviewed status-update form does not provide a property-assignment step.

**Recommendation:** Add an admin assignment step and support appropriate intake triage before assignment. Require validated property ownership before attaching property expenses or issuing property-specific notifications. Test an unmatched public submission through assignment and subsequent status updates.

**Source:** [pages/api/maintenance/public.ts](pages/api/maintenance/public.ts); [lib/maintenanceOperations.ts](lib/maintenanceOperations.ts), lines 22–23; [components/Admin/MaintenanceStatusModal.tsx](components/Admin/MaintenanceStatusModal.tsx).

### 6. High — Emergency requests sort below low-priority requests

The admin ranking recognizes `urgent` but omits the supported `emergency` value. Unknown priorities receive rank 9. A synthetic check returned the order `high`, `low`, `emergency`.

**Recommendation:** Normalize `urgent` and `emergency` consistently across submission, types, display, filtering, and sorting. Add a regression case ensuring emergency requests appear before lower-priority work.

**Source:** [lib/console-home.ts](lib/console-home.ts), lines 450–459; [types/maintenance.ts](types/maintenance.ts), line 3; [pages/api/maintenance/create.ts](pages/api/maintenance/create.ts).

## Visual changes

The current theme edits lighten the navy background, surfaces, borders, and text, soften shadows, and adjust the homepage overlay to match. These are straightforward visual changes, but browser verification of the updated appearance remains outstanding.

The working tree was initially clean. Changes to `components/Landing/HomeHero.tsx`, `styles/globals.css`, and generated `next-env.d.ts` appeared during the review. No implementation files were changed by this review.

## Verification and limitations

- Unit tests: **19 of 19 passed** using `npm test`.
- TypeScript: **passed** using `tsc --noEmit --incremental false`.
- ESLint: **passed with 0 errors and 24 warnings** using `npm run lint`.
- Targeted synthetic checks reproduced the landlord grouping, early-payment, grace-period projection, unmatched maintenance, and emergency ordering issues.
- The ledger date mismatch was identified by tracing the activation writer and admin query. A read-only check of the existing demo emulator found no relevant records, so it did not provide an integration reproduction.
- The production build, full emulator/browser suites, and live authenticated workflows were **not rerun during this review**.
- These results do not establish end-to-end production readiness or validate delivery of notifications or settlement of payments.

## Recommended next steps

1. Correct the financial data contract and rent-status calculations, with integration coverage from lease activation through tenant, admin, and landlord views.
2. Fix emergency prioritization and the unmatched-maintenance assignment workflow.
3. Add the regression cases above to continuous integration. The current [CI workflow](.github/workflows/ci.yml) runs lint and build but does not run the unit, emulator, or browser test suites.
4. Run the production build and complete browser regression, including the updated theme, before the next release.
