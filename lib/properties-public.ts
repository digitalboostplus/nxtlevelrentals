// Server-only helper for exposing available properties to unauthenticated
// visitors (the public landing page). Reads via the Admin SDK so it bypasses
// the authenticated-only `properties` Firestore rule WITHOUT loosening it, and
// returns an explicit, public-safe field whitelist (no landlord / management
// data ever leaves the server).

import { adminDb } from './firebase-admin';

export type PublicProperty = {
  id: string;
  name: string;
  address: string;
  description: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;
};

export async function getPublicProperties(): Promise<PublicProperty[]> {
  const snap = await adminDb.collection('properties').where('available', '==', true).get();

  const list: PublicProperty[] = snap.docs.map((doc) => {
    const p = doc.data();
    return {
      id: doc.id,
      name: (p.name as string) || (p.address as string) || 'Property',
      address: (p.address as string) || '',
      description: (p.description as string) || '',
      images: Array.isArray(p.images) ? (p.images as string[]) : [],
      bedrooms: Number(p.bedrooms) || 0,
      bathrooms: Number(p.bathrooms) || 0,
      squareFeet: Number(p.squareFeet) || 0,
      rent: Number(p.rent) || 0,
    };
  });

  // Sort in JS (cheapest rent first) to avoid requiring a composite index.
  list.sort((a, b) => a.rent - b.rent);
  return list;
}
