# Stage 3: reliable owner portal

Completed locally on `fix/core-integrity`, September 5, 2026. This is stage 3 of the corrective sequence discussed after the review, not Phase 3 (the full administrative suite) of the original Gemini roadmap. No deployment or production data changes were performed.

## Implemented

| Requirement | Implementation and evidence |
| --- | --- |
| Owners load only their own records | `/api/landlord/data` verifies Firebase authentication and the landlord role, derives ownership from current property records, and returns explicit projections. Caller-supplied landlord IDs cannot select another account. A requested property must belong to the caller. The endpoint does not query or return the tenant-user collection or bank/tax profile fields. |
| Queries work with authorization | All owner pages use `useLandlordData` and the server endpoint, including property details. Equality-only queries use the existing single-field indexes; no additional composite index is required by the new endpoint. Legacy ledger rows without a landlord ID are resolved through the owned property; explicit conflicting owner IDs are excluded. |
| Direct SDK requests cannot bypass ownership | Property reads are restricted to the actual owner, assigned resident or admin. Owner lease/ledger reads require current property ownership. Owners cannot modify fee terms, banking verification, payout preferences or management-provided document records. Existing expense restrictions remain in force. |
| Financial periods and totals agree | `ownerStatement` applies UTC year-to-date, previous-calendar-month and all-time-through-now boundaries to every total, category and property row. Amounts are summed in integer cents. Invalid posted amounts/dates fail instead of appearing as zero. |
| Fees use evidence | Configured fee terms come from `landlords/{uid}.managementFee`; the assumed 8% is removed. Actual statement deductions come from paid management-fee expense records, without adding a second estimated fee. Missing configuration is labelled, and absence of posted fee records is disclosed. |
| Payout history is real | The payout page renders the account's `payouts` records, dates, method, amount and status. Sample transfers, bank details, connection claims and fixed schedule claims were removed. No payouts produces an explicit empty state. |
| Documents are real and downloadable | The document page lists actual `landlordDocuments` metadata. Downloads authenticate again, verify document ownership and optional property ownership, validate the owner-specific Storage path, and stream the object as a private attachment. No permanent public URL is returned. Sample agreements, tax-compliance claims and upload/download alerts were removed. |
| Errors remain distinct from empty data | Loading, failure and empty states are present throughout the owner pages. Request sequence guards discard superseded responses, and data is cleared when the owner changes or a refresh fails. |

## Statement policy

- Rent income uses settled `ledger` payments categorized as rent. It is not added again from the `payments` collection. Deposits and unsettled/failed payments are excluded.
- Expenses use `paid` and `reimbursed` records; pending, rejected and approved-but-unpaid records are excluded. The expense payment date is used when present, otherwise its recorded date.
- `management_fee` is counted once as part of total paid expenses. The category and property subtotals use the same included records.
- Current configured fee terms are shown separately. Applying today's rate retroactively would invent historical deductions. Operators must post actual fee expenses to include them in the statement.
- Overview cards use year-to-date totals; the property detail page explicitly labels its totals as all-time. The displayed net is the net of recorded transactions, not a promise that all accounting entries have been posted.

## Validation

- `npm test`: eight tests covering the prior integrity corrections plus period boundaries, status exclusions, exact reconciliation, payment dates, invalid records and unusual category/property names.
- `npm run test:emulators`: ten integration tests against the explicit `demo-nlr-integrity` project, now including Firestore, Authentication and Storage.
- New integration coverage includes two-owner projections, cross-owner direct SDK denials, stale ownership tags, fee/document mutation denial, an empty owner account, and a byte-for-byte HTTP document download through the actual API handler. Wrong-owner and anonymous downloads are rejected; an owner cannot upload management-provided documents directly.
- Lint and TypeScript checks pass; lint retains the two existing maintenance-image warnings. Production compilation is verified with the project's Node 22 major version.

## Deployment and data requirements

1. Deploy the application, `firestore.rules` and `storage.rules` together. The local changes do not alter deployed access controls.
2. Set the existing `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` configuration. Managed owner files use `landlordDocuments/{ownerUid}/...`; matching metadata lives in `landlordDocuments` with `landlordId`, `storagePath`, `fileName`, `documentType` and status/date fields. Optional `propertyId` must still belong to that owner.
3. Legacy URLs or paths outside that protected location are displayed as unavailable until management migrates or attaches the file. No storage objects were moved and no historic records were rewritten in this task.
4. Populate actual payout records and fee expenses; the portal does not initiate bank transfers, assess fees or generate tax documents. Missing records remain empty rather than being synthesized.
5. Before production release, complete the staging browser walkthrough and reconcile historical payment records from the former fabricated-payment endpoint. The emulator API/rules/storage workflows were exercised; a live authenticated browser walkthrough and deployed-state inspection were not performed.

Document upload workflows, owner bank enrollment, broader administrative CRUD and recurring billing remain in later stages. The original plan and review are preserved.
