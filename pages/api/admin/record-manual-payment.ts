import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

type ManualPaymentRequest = {
  tenantId: string;
  propertyId: string;
  amount: number;
  paymentMethod: 'cash' | 'check';
  checkNumber?: string;
  description: string;
  paymentDate: string;
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
    const {
      tenantId,
      propertyId,
      amount,
      paymentMethod,
      checkNumber,
      description,
      paymentDate,
    } = req.body as ManualPaymentRequest;

    if (!tenantId || !propertyId || !amount || !paymentMethod || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const now = new Date().toISOString();

    // Create payment record
    const paymentRef = await adminDb.collection('payments').add({
      tenantId,
      propertyId,
      amount,
      dueDate: paymentDate,
      paidDate: paymentDate,
      status: 'paid',
      description,
      paymentMethod,
      checkNumber: checkNumber || null,
      createdAt: now,
    });

    // Create ledger entry
    await adminDb.collection('ledger').add({
      tenantId,
      propertyId,
      amount,
      type: 'payment',
      category: 'rent',
      date: paymentDate,
      status: 'completed',
      description: `${description}${checkNumber ? ` (Check #${checkNumber})` : ''}`,
      paymentMethod,
      checkNumber: checkNumber || '',
      manualEntry: true,
      recordedBy: adminId,
      createdAt: now,
    });

    return res.status(200).json({
      message: 'Manual payment recorded successfully',
      paymentId: paymentRef.id,
    });
  } catch (error: any) {
    console.error('Error recording manual payment:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
