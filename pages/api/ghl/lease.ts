import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';
import { pullContactToFirestore } from '@/lib/ghl-sync';

// Pulls the authenticated user's contact/lease data from GoHighLevel into
// Firestore. Called by a signed-in user to sync their own record.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed. Use POST to sync.' });
    }

    // Authenticate the request
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
        const { uid, email } = decoded;

        if (!email) {
            return res.status(400).json({ message: 'User has no email' });
        }

        const result = await pullContactToFirestore({ uid, email });

        if (!result.synced) {
            return res.status(404).json({ message: result.reason });
        }

        return res.status(200).json({
            success: true,
            message: 'Synced with GHL',
            ghlContactId: result.ghlContactId,
        });
    } catch (error: any) {
        console.error('GHL lease sync error:', error);
        return res.status(500).json({ message: 'Internal server error', details: error.message });
    }
}
