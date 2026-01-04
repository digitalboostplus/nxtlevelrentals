import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

type AdjustmentRequest = {
  tenantId: string;
  propertyId: string;
  amount: number;
  category: 'rent' | 'utility' | 'late_fee' | 'deposit' | 'other';
  description: string;
  adjustmentType: 'charge' | 'credit';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminId = decodedToken.uid;

    // Verify admin role
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    const adminRole = adminDoc.data()?.role;

    if (adminRole !== 'admin' && adminRole !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // Validate request
    const { tenantId, propertyId, amount, category, description, adjustmentType } =
      req.body as AdjustmentRequest;

    if (!tenantId || !propertyId || !amount || !category || !description || !adjustmentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const now = new Date().toISOString();
    const finalAmount = adjustmentType === 'credit' ? -Math.abs(amount) : Math.abs(amount);

    // Create ledger adjustment
    await adminDb.collection('ledger').add({
      tenantId,
      propertyId,
      amount: finalAmount,
      type: 'adjustment',
      category,
      date: now,
      status: 'completed',
      description,
      manualEntry: true,
      recordedBy: adminId,
      createdAt: now,
    });

    return res.status(200).json({ message: 'Adjustment created successfully' });
  } catch (error: any) {
    console.error('Error creating adjustment:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
