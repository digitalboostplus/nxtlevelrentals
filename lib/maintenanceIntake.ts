// Shared intake helpers for maintenance requests that arrive without a signed-in
// tenant (landing-page form, GoHighLevel site form). Matches the submission to
// a known tenant so it lands on their record; otherwise the ticket is filed
// under tenantId "public" for an admin to link later.

import type { Firestore } from 'firebase-admin/firestore';

export type TenantMatch = { tenantId: string; propertyId: string; user: FirebaseFirestore.DocumentData | null };

export async function matchTenantByContact(db: Firestore, contact: { email?: string | null; phone?: string | null; ghlContactId?: string | null }): Promise<TenantMatch> {
  const lookups: Array<[string, string]> = [];
  if (contact.ghlContactId) lookups.push(['ghlContactId', contact.ghlContactId]);
  if (contact.email) lookups.push(['email', contact.email.toLowerCase()]);
  if (contact.phone) lookups.push(['phoneNumber', contact.phone]);
  for (const [field, value] of lookups) {
    const snap = await db.collection('users').where(field, '==', value).limit(1).get();
    if (!snap.empty) {
      const user = snap.docs[0].data();
      return { tenantId: snap.docs[0].id, propertyId: user.propertyIds?.[0] || 'unassigned', user };
    }
  }
  return { tenantId: 'public', propertyId: 'unassigned', user: null };
}

/** "Plumbing: Leaking under the sink..." — the title every unauthenticated intake uses. */
export function intakeTitle(category: string, description: string): string {
  return `${category}: ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`;
}
