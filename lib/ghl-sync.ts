// Server-side orchestration between Firestore and GoHighLevel.
//
// These helpers resolve a tenant's GHL contact, then pull CRM data into
// Firestore or push app activity back out to the CRM. Every push is wrapped so
// a GHL outage or misconfiguration logs an error but never breaks the core
// app flow (creating a tenant, recording a payment, etc.).

import { adminDb } from './firebase-admin';
import {
  GHL_FIELD_IDS,
  isGHLConfigured,
  getGHLContactByEmail,
  getGHLContactById,
  upsertGHLContact,
  addGHLContactNote,
  addGHLContactTags,
} from './ghl';

/**
 * Run a GHL side-effect without letting failures bubble up to the caller.
 * Skips silently when GHL isn't configured.
 */
async function safeSync(label: string, fn: () => Promise<void>): Promise<void> {
  if (!isGHLConfigured()) return;
  try {
    await fn();
  } catch (err) {
    console.error(`[ghl-sync] ${label} failed:`, err);
  }
}

/** Resolve the GHL contact id for a tenant, looking it up by email if needed. */
async function resolveContactId(uid: string): Promise<string | null> {
  const userSnap = await adminDb.collection('users').doc(uid).get();
  const user = userSnap.data();
  if (!user) return null;

  if (user.ghlContactId) return user.ghlContactId as string;

  if (user.email) {
    const contact = await getGHLContactByEmail(user.email);
    if (contact) {
      await adminDb.collection('users').doc(uid).set({ ghlContactId: contact.id }, { merge: true });
      return contact.id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pull: GHL -> Firestore
// ---------------------------------------------------------------------------

export type PullResult =
  | { synced: true; ghlContactId: string }
  | { synced: false; reason: string };

/**
 * Pull a contact's lease/profile data from GHL into Firestore.
 * Writes the leaseDocuments/{lease-uid} doc and enriches the user profile.
 */
export async function pullContactToFirestore(params: {
  uid: string;
  email: string;
}): Promise<PullResult> {
  const { uid, email } = params;

  if (!isGHLConfigured()) return { synced: false, reason: 'GHL not configured' };

  // Prefer a previously linked contact id; fall back to email search.
  const existing = await adminDb.collection('users').doc(uid).get();
  const linkedId = existing.data()?.ghlContactId as string | undefined;

  const contact = linkedId
    ? (await getGHLContactById(linkedId)) || (await getGHLContactByEmail(email))
    : await getGHLContactByEmail(email);

  if (!contact) return { synced: false, reason: 'Contact not found in GHL' };

  const now = new Date().toISOString();

  await adminDb.collection('leaseDocuments').doc(`lease-${uid}`).set(
    {
      tenantId: uid,
      email,
      ghlContactId: contact.id,
      documentType: 'lease',
      status: contact.isLeaseActive ? 'Active' : 'Inactive',
      leaseStart: contact.leaseStart || null,
      leaseEnd: contact.leaseEnd || null,
      monthlyRent: contact.monthlyRent ?? null,
      title: 'Lease Agreement (GHL)',
      lastSyncedAt: now,
    },
    { merge: true }
  );

  await adminDb.collection('users').doc(uid).set(
    {
      ghlContactId: contact.id,
      phoneNumber: contact.phone ?? existing.data()?.phoneNumber ?? null,
      address: contact.address ?? existing.data()?.address ?? null,
      city: contact.city ?? null,
      state: contact.state ?? null,
      zip: contact.postalCode ?? null,
      monthlyRent: contact.monthlyRent ?? existing.data()?.monthlyRent ?? null,
      leaseStart: contact.leaseStart || null,
      leaseEnd: contact.leaseEnd || null,
      isLeaseActive: Boolean(contact.isLeaseActive),
      ghlSyncedAt: now,
    },
    { merge: true }
  );

  return { synced: true, ghlContactId: contact.id };
}

// ---------------------------------------------------------------------------
// Push: Firestore -> GHL
// ---------------------------------------------------------------------------

/** Create/update the tenant's GHL contact and link the id back on the user doc. */
export async function pushTenantToGHL(uid: string): Promise<void> {
  await safeSync(`pushTenant(${uid})`, async () => {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const user = userSnap.data();
    if (!user?.email) return;

    const [firstName, ...rest] = String(user.displayName || '').trim().split(' ');

    const contactId = await upsertGHLContact({
      email: user.email,
      firstName: firstName || undefined,
      lastName: rest.length ? rest.join(' ') : undefined,
      phone: user.phoneNumber || undefined,
      address: user.address || undefined,
      city: user.city || undefined,
      state: user.state || undefined,
      postalCode: user.zip || undefined,
      tags: ['app-tenant'],
    });

    if (contactId && contactId !== user.ghlContactId) {
      await adminDb.collection('users').doc(uid).set({ ghlContactId: contactId }, { merge: true });
    }
  });
}

/** Reflect a rent payment (or failure) on the tenant's GHL contact. */
export async function pushPaymentToGHL(params: {
  tenantId: string;
  amount: number;
  status: 'paid' | 'failed';
  date: string;
  description?: string;
  method?: string;
}): Promise<void> {
  const { tenantId, amount, status, date, description, method } = params;
  await safeSync(`pushPayment(${tenantId})`, async () => {
    const contactId = await resolveContactId(tenantId);
    if (!contactId) return;

    const amountStr = `$${Number(amount).toLocaleString()}`;
    if (status === 'paid') {
      await addGHLContactNote(
        contactId,
        `Rent payment received: ${amountStr}${method ? ` via ${method}` : ''} on ${date}.` +
          (description ? ` (${description})` : '')
      );
      await addGHLContactTags(contactId, ['rent-paid']);
    } else {
      await addGHLContactNote(
        contactId,
        `Rent payment FAILED: ${amountStr} on ${date}.` + (description ? ` (${description})` : '')
      );
      await addGHLContactTags(contactId, ['payment-failed']);
    }
  });
}

/** Log a new maintenance request as a note on the tenant's GHL contact. */
export async function pushMaintenanceToGHL(params: {
  tenantId: string;
  title: string;
  description: string;
  priority: string;
  status?: string;
}): Promise<void> {
  const { tenantId, title, description, priority, status } = params;
  await safeSync(`pushMaintenance(${tenantId})`, async () => {
    const contactId = await resolveContactId(tenantId);
    if (!contactId) return;

    await addGHLContactNote(
      contactId,
      `Maintenance request "${title}" [${priority}${status ? `/${status}` : ''}]: ${description}`
    );
    await addGHLContactTags(contactId, ['maintenance-open']);
  });
}

/** Reflect a maintenance status change on the tenant's GHL contact. */
export async function pushMaintenanceStatusToGHL(params: {
  tenantId: string;
  title: string;
  status: string;
  note?: string;
}): Promise<void> {
  const { tenantId, title, status, note } = params;
  await safeSync(`pushMaintenanceStatus(${tenantId})`, async () => {
    const contactId = await resolveContactId(tenantId);
    if (!contactId) return;

    await addGHLContactNote(
      contactId,
      `Maintenance request "${title}" updated to ${status}.` + (note ? ` Note: ${note}` : '')
    );
    if (status === 'completed') {
      await addGHLContactTags(contactId, ['maintenance-resolved']);
    }
  });
}

// Re-export for callers that want the custom field ids.
export { GHL_FIELD_IDS };
