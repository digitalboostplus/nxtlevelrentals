# GHL tenant directory import

The admin Tenants page provides Preview GHL changes, explicit row selection and Apply. A directory entry is not a Firebase user or a lease. No invites, financial entries or GHL writes are triggered.

## Eligibility

A contact must have the `active` tag and the location's `tenant` association to exactly one occupied Property. The integration resolves the configured Properties object (currently `custom_objects.houses`), reads `vacancy_status` and `complete_address`, and uses GHL IDs rather than address guesses. Missing email and unchecked Active Lease Agreement are warnings. Missing records, unknown status, multiple occupied properties, identity conflicts and conflicting local assignments require review. Several contacts may share one property.

## Review and apply

`GET /api/admin/import-tenants` lists the directory and unmatched legacy imports. `POST` defaults to `{ "action": "preview" }`. It stores a private review snapshot in `ghlImportRuns`, with no tenant, property or Auth changes. Every GHL page and relation must be complete.

Apply uses `{ "action": "apply", "previewId": "...", "contactIds": ["..."] }`. Only the creating admin can apply a snapshot. The server re-reads GHL and local state and rejects changed or expired previews (15 minutes). Each selection of up to 200 contacts is committed atomically with its applied-contact audit. A failed selection has no partial operational writes and may be retried; successful IDs are idempotent. Larger previews can be applied in selections of 200 within the expiry period.

Directory records live in `ghlTenantDirectory`, keyed by location and contact ID. Existing legacy `users/ghl-*` documents remain intact; directory display reconciles them using `ghlContactId`. Only verified, enabled Firebase identities are labeled linked portal accounts. The original records and references are preserved.

Imports update only property identity, name, address and occupied/available state. Existing ownership, images, units and monetary fields remain app-managed. Unknown or unit-managed properties are held for review. Deactivation changes directory membership only; it never deletes records, ends leases or revokes portal access. Offboarding permissions require a separate operator workflow.

The old admin Sync GHL endpoint now returns a preview. Tenant lease refreshes require an existing GHL link, a real enabled Firebase tenant account and the same eligibility checks. They cannot fall back to another contact by email.

## CLI

### Provision portal accounts after directory import

`npm run provision:ghl-tenants -- --operator-email ADMIN_EMAIL` previews property reconciliation and account setup. Add `--apply` to apply. This trusted local CLI requires an enabled existing admin and fresh complete GHL reads. It syncs all property identities and occupancy while preserving app-owned financial data, ownership and images.

Account creation reuses a linked legacy UID when present and refuses email collisions, elevated roles, conflicting assignments and previously disabled accounts. Accounts without an email remain directory-only. New accounts start disabled and receive access only after their tenant profile and property assignment are committed. A failed profile write leaves the account disabled; retry resumes the recorded provisioning attempt. Existing passwords are preserved. New passwords are random and are never printed or saved.

Tenants choose **Set or reset password** on the login page to receive Firebase's password setup email. Provisioning itself sends no messages and creates no leases, charges or GHL writes. Reports are saved under the git-ignored `.agent-artifacts/` directory.

The deployed backend requires `roles/firebaseauth.viewer` for revoked-token checks and account lookup. Missing Auth read access can appear as a 401 even for valid tokens. Keep the check enabled and fix runtime IAM; do not weaken authentication.

Use existing environment credentials; never put tokens in command arguments.

```powershell
npm run import:active-tenants -- --operator ADMIN_UID
npm run import:active-tenants -- --operator ADMIN_UID --apply PREVIEW_ID --contacts CONTACT_ID_1,CONTACT_ID_2
```

The CLI defaults to preview. `--dry` and `--dry-run` are accepted preview aliases and cannot be combined with Apply. The legacy manual-sync and sync-all scripts delegate to this workflow. Run in a trusted admin environment: the CLI's Firebase service credential is its authority, and `--operator` supplies the enabled admin identity for the audit.

## Release verification

Run `npm test`, `npm run test:emulators`, `npm run test:browser`, and `npm run build`. Browser directory tests mock the API contract; Firestore/Auth emulator tests exercise the actual service, privacy rules, authorization, stale previews, retries and data preservation.

Deploy app changes with the updated Firestore rules. Review a fresh live preview before applying production rows. The planning baseline was 35 qualifying contacts across 25 occupied properties; counts can change. No saved-list ID is required because the confirmed selection rules define eligibility.

## Verification recorded 2026-09-07

- 26 unit tests passed.
- 24 Firestore/Auth/Storage emulator tests passed; the six directory tests were also rerun with the injected transaction-failure case.
- All 17 browser tests passed, including directory preview, stale-data rejection, selected apply and 390 px layout. Desktop and mobile screenshots are under `.agent-artifacts/`.
- Production build passed. Lint passed with existing warnings; the new directory modules and component have no lint warnings.
- Live GHL and Firestore reads produced 35 proposed creates and two exclusions with no assignment conflicts. The read-only result is `.agent-artifacts/ghl-live-preview.json`; audit persistence was intercepted for this validation, so its preview ID cannot be applied.
- No production imports, account changes or deployment were performed.

## Production account setup, September 7, 2026 (subsequent run)

The directory release was deployed and its Firestore rules verified. Production imports reconciled 35 eligible contacts; two active-tagged contacts without Tenant relationships were excluded. A three-contact pilot, idempotent replay and remaining batch completed. All 28 GHL properties now have the source occupancy state: 25 occupied and three vacant.

The separate provisioning CLI created 29 enabled Firebase accounts and linked their tenant profiles to the correct property. Six eligible contacts lack email and remain directory-only. All account identities and property assignments were checked, and 12 live tenant access-boundary checks passed. Existing leases, ledger entries, payments, Stripe mappings and unrelated profile history were preserved. No invitations were sent.

Four provisioning emulator tests passed, including partial-failure recovery. A provisioned tenant's portal was checked with a custom-token sign-in at desktop and 390 px; password setup UI delivery was mocked, so customer email delivery is not claimed. Detailed customer-specific follow-up and evidence are in the ignored `.agent-artifacts/GHL_SETUP_REPORT.md`.
