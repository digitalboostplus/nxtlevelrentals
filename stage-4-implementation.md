# Stage 4: operational workflows and private attachments

Implemented locally on `fix/core-integrity`, September 5, 2026. This is stage 4 of the corrective sequence following `codex-review.md`. No deployment or production data changes were made.

## Implemented

| Area | Result |
| --- | --- |
| Property and unit editing | Admin property details link to a working edit page. Names, addresses, specifications, rents, amenities, image URLs and inventory are validated and saved through an admin transaction. Unit IDs and existing lease assignments are preserved. Units are archived rather than deleted. |
| Safe archival | Active leases, occupied inventory, open work orders, unsettled payments, per-tenant balances and pending or approved expenses block archival. Opposing balances belonging to different tenants cannot cancel each other. Archives retain history, remove availability and are excluded from public listings and lease selection. Archived inventory cannot be leased. Restore uses the same editor. Properties with operational history require a separate ownership-transfer workflow. |
| Private uploads | Lease PDFs, maintenance photos, insurance documents and expense receipts use authenticated upload/download APIs. Limits are six files per record and 5 MB per file. Allowed MIME types must match PDF, JPEG, PNG or WebP signatures, with purpose-specific restrictions. Storage objects have no public download token. Direct client access to the new private paths and attachment metadata is denied by rules. |
| Attachment binding | Uploads are staged, owned by the uploader and scoped to a purpose/property. Record creation binds files transactionally, preventing reuse for another record or property. Read access is derived from the saved record and current ownership. Unbound uploads can be discarded; bound files cannot be discarded through that endpoint. |
| Connected forms | Lease activation, tenant maintenance requests, insurance updates and owner expenses submit file IDs. Tenant and owner pages can download their authorized attachments; maintenance photos have authenticated previews. Insurance submissions remain pending verification. Placeholder tenant lease links were removed. |
| Maintenance operations | The admin modal saves vendor name/phone, calendar date, local time, IANA time zone, notes and actual cost. The saved visit appears on request cards. Completing with a positive cost creates one deterministic approved expense and binds its invoice. It does not record payment or deduct unpaid expenses from owner statements. Later cost changes, reopening and invoice replacement require reconciliation. |
| Retry handling | Maintenance creation, owner expense submission and work-order updates use operation IDs and payload fingerprints. Retrying the same saved operation does not duplicate its record, notes or expense; changed payloads cannot silently reuse a saved operation. |
| Notification preferences | Account controls use the actual maintenance event names and channel flags. Unsupported settings and non-boolean values are rejected. Preference updates merge transactionally. Loading failures have a retry control, and failed saves do not display success. Server notification helpers use the named Admin SDK instance and respect saved preferences. |

## Validation

- `npm test`: 10 passing tests, including file-format/size/purpose validation and preference validation.
- `npm run test:emulators`: 14 passing tests against explicit `demo-nlr-integrity` Authentication, Firestore and Storage emulators. No live providers are exercised.
- Emulator evidence includes byte-for-byte private upload/download, cross-owner denial, blocked direct Storage access, staged-file discard, attachment binding restrictions, archive/restore and unpaid-balance guards, saved vendor scheduling, concurrent completion retries producing one approved expense, preference persistence and notification suppression decisions.
- Production build uses Node 22 and includes TypeScript validation. Lint passes with the existing legacy maintenance-image warning.
- Authenticated browser walkthroughs and real email/push delivery are not verified by these tests.

## Deployment and operational notes

Deploy the application and both rules files together after review. The configured Storage bucket must exist and the runtime service account needs access. Local rule edits do not protect a deployed application until deployment.

Existing legacy file URLs/data-URI attachments are not migrated or revoked automatically. New uploads use private paths. Signature checks are not a malware scanner. Abandoned staged uploads are retained unless explicitly discarded; a retention/cleanup policy remains operational follow-up.

Appointment times retain their explicit time zone. They do not create external calendar events or notify vendors. Notification delivery is attempted after a committed change; durable delivery retries/outbox processing remain follow-up. Rent reminders and community announcements are not implemented by this stage.
