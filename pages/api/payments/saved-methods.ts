import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const tenantId = decodedToken.uid;

    // Fetch saved payment methods
    const snapshot = await adminDb
      .collection('savedPaymentMethods')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();

    const methods = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ methods });
  } catch (error: any) {
    console.error('Error fetching saved payment methods:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
