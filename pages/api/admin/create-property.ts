import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

type CreatePropertyRequest = {
  name: string;
  address: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;
  available: boolean;
  landlordId?: string;
  landlordName?: string;
  managementStatus: 'active' | 'inactive' | 'pending';
  amenities: string[];
  images: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Verify auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Verify admin role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== 'admin' && userRole !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // 3. Validate request body
    const {
      name,
      address,
      description,
      bedrooms,
      bathrooms,
      squareFeet,
      rent,
      available,
      landlordId,
      landlordName,
      managementStatus,
      amenities,
      images
    } = req.body as CreatePropertyRequest;

    // Required field validation
    if (!name || !address) {
      return res.status(400).json({ message: 'Name and address are required' });
    }

    if (typeof bedrooms !== 'number' || bedrooms < 1) {
      return res.status(400).json({ message: 'Bedrooms must be at least 1' });
    }

    if (typeof bathrooms !== 'number' || bathrooms < 1) {
      return res.status(400).json({ message: 'Bathrooms must be at least 1' });
    }

    if (typeof squareFeet !== 'number' || squareFeet < 1) {
      return res.status(400).json({ message: 'Square feet must be at least 1' });
    }

    if (typeof rent !== 'number' || rent < 0) {
      return res.status(400).json({ message: 'Rent must be 0 or greater' });
    }

    // 4. Create property document
    const propertyData = {
      name,
      address,
      description: description || '',
      bedrooms,
      bathrooms,
      squareFeet,
      rent,
      available: available ?? true,
      landlordId: landlordId || null,
      landlordName: landlordName || null,
      managementStatus: managementStatus || 'active',
      amenities: amenities || [],
      images: images || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection('properties').add(propertyData);

    // 5. If landlordId provided, update the landlord's propertyIds array
    if (landlordId) {
      const landlordRef = adminDb.collection('landlords').doc(landlordId);
      const landlordDoc = await landlordRef.get();

      if (landlordDoc.exists) {
        await landlordRef.update({
          propertyIds: FieldValue.arrayUnion(docRef.id),
          totalProperties: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    return res.status(200).json({
      message: 'Property created successfully',
      propertyId: docRef.id
    });

  } catch (error: any) {
    console.error('Error creating property:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
