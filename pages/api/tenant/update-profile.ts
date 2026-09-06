import { attachmentRefs } from '@/lib/attachments';
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const tenantId = decoded.uid;

    const {
      displayName,
      phoneNumber,
      emergencyContact,
      vehicles,
      pets,
      rentersInsurance
    } = req.body;

    const updatePayload: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (typeof displayName === 'string' && displayName.trim()) {
      updatePayload.displayName = displayName.trim();
    }
    if (typeof phoneNumber === 'string') {
      updatePayload.phoneNumber = phoneNumber.trim();
    }
    if (emergencyContact && typeof emergencyContact === 'object') {
      updatePayload.emergencyContact = {
        name: emergencyContact.name || '',
        relationship: emergencyContact.relationship || '',
        phone: emergencyContact.phone || '',
        email: emergencyContact.email || '',
      };
    }
    if (Array.isArray(vehicles)) {
      updatePayload.vehicles = vehicles;
    }
    if (Array.isArray(pets)) {
      updatePayload.pets = pets;
    }
    if (rentersInsurance && typeof rentersInsurance === 'object') {
      updatePayload.rentersInsurance = {
        provider: rentersInsurance.provider || '',
        policyNumber: rentersInsurance.policyNumber || '',
        expirationDate: rentersInsurance.expirationDate || '',
        documentUrl: rentersInsurance.documentUrl || '',
        fileIds: rentersInsurance.fileIds || [],
        verified: false,
        status: 'pending',
      };
    }

    await adminDb.runTransaction(async tx => {
      const ref = adminDb.doc(`users/${tenantId}`);
      const files = rentersInsurance ? await attachmentRefs(tx, adminDb, rentersInsurance.fileIds || [], tenantId, 'insurance', null, ref.path) : [];
      tx.set(ref, updatePayload, { merge: true });
      for (const file of files) tx.update(file, { boundTo: ref.path });
    });

    if (updatePayload.displayName) {
      try {
        await adminAuth.updateUser(tenantId, {
          displayName: updatePayload.displayName,
        });
      } catch (authErr) {
        console.warn('Could not update Firebase Auth displayName:', authErr);
      }
    }

    return res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Error updating tenant profile:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
