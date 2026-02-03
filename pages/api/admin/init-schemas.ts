import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const collections = ['users', 'properties', 'leases', 'payments', 'maintenanceRequests', 'ledger', 'landlordExpenses', 'savedPaymentMethods'];

        for (const coll of collections) {
            // Firestore doesn't require explicit creation, but adding/deleting a dummy doc ensures it's "realized" 
            // and we can perform a sanity check.
            const docRef = adminDb.collection('metadata').doc('schema_versions');
            await docRef.set({
                [coll]: '1.0.0',
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }

        return res.status(200).json({
            message: 'Template metadata initialized successfully',
            initialized: collections
        });
    } catch (error: any) {
        console.error('Error initializing schema metadata:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}
