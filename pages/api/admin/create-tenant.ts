import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

type CreateTenantRequest = {
    email: string;
    password?: string; // Optional, can auto-generate or set temp
    displayName: string;
    propertyId: string;
    unit: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // TODO: Add server-side auth check to ensure caller is Admin
    // (Requires verifying ID token from req headers)

    const { email, password, displayName, propertyId, unit } = req.body as CreateTenantRequest;

    if (!email || !displayName || !propertyId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // 1. Create Auth User
        const userRecord = await adminAuth.createUser({
            email,
            password: password || 'Welcome123!', // Default temp password
            displayName,
        });

        // 2. Create User Profile in Firestore
        await adminDb.collection('users').doc(userRecord.uid).set({
            email,
            displayName,
            role: 'tenant',
            propertyIds: [propertyId],
            unit, // Custom field for UI
            createdAt: new Date().toISOString()
        });

        // 3. (Optional) Set Custom Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'tenant' });

        return res.status(200).json({
            message: 'Tenant created successfully',
            uid: userRecord.uid,
            tempPassword: password || 'Welcome123!'
        });

    } catch (error: any) {
        console.error('Error creating tenant:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
