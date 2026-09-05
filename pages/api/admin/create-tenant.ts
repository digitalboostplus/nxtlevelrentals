import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { pushTenantToGHL } from '@/lib/ghl-sync';

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

    try {
        // 1. Verify caller is an authenticated admin
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: Missing token' });
        }

        const decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        const callerDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const callerRole = callerDoc.data()?.role;

        if (callerRole !== 'admin' && callerRole !== 'super-admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        // 2. Validate input
        const { email, password, displayName, propertyId, unit } = req.body as CreateTenantRequest;

        if (!email || !displayName || !propertyId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 3. Create Auth User
        const userRecord = await adminAuth.createUser({
            email,
            password: password || 'Welcome123!', // Default temp password
            displayName,
        });

        // 4. Create User Profile in Firestore
        await adminDb.collection('users').doc(userRecord.uid).set({
            email,
            displayName,
            role: 'tenant',
            propertyIds: [propertyId],
            unit, // Custom field for UI
            createdAt: new Date().toISOString()
        });

        // 5. Set Custom Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'tenant' });

        // 6. Push the new tenant to GoHighLevel (non-blocking on failure)
        await pushTenantToGHL(userRecord.uid);

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
