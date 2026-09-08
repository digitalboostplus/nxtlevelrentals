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
