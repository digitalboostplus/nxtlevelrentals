import type { NextApiRequest, NextApiResponse } from 'next';
import { getGHLContactByEmail } from '@/lib/ghl';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed. Use POST to sync.' });
    }

    // 1. Authenticate Request
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = decoded.email;
        const uid = decoded.uid;

        if (!email) {
            return res.status(400).json({ message: 'User has no email' });
        }

        // 2. Fetch Contact from GHL
        const contact = await getGHLContactByEmail(email);

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found in CRM' });
        }

        // 3. Sync to Firestore (Lease Documents Collection)
        // Check if a lease doc already exists for this user to avoid duplicates, or use a deterministic ID
        const leaseDocId = `lease-${uid}`;

        await adminDb.collection('leaseDocuments').doc(leaseDocId).set({
            tenantId: uid,
            email: email,
            ghlContactId: contact.id,
            status: contact.isLeaseActive ? 'Active' : 'Inactive',
            leaseStart: contact.leaseStart || null,
            leaseEnd: contact.leaseEnd || null,
            updatedAt: new Date().toISOString(),
            title: 'Lease Agreement (GHL)'
            // url: ... (We don't have the PDF URL yet)
        }, { merge: true });

        // Optionally still update the user with the GHL ID linkage
        await adminDb.collection('users').doc(uid).set({
            ghlContactId: contact.id
        }, { merge: true });

        return res.status(200).json({
            success: true,
            message: 'Synced with GHL',
            data: contact
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ message: 'Internal server error', details: error.message });
    }
}
