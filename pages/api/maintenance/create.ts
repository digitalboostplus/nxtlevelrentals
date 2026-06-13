import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { pushMaintenanceToGHL } from '@/lib/ghl-sync';

type CreateMaintenanceRequest = {
  title: string;
  description: string;
  priority: string;
  category: string;
  propertyId?: string;
};

// Tenant-facing endpoint to submit a maintenance request. Creates the record
// via the Admin SDK and pushes a note to the tenant's GHL contact in real time.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const tenantId = decoded.uid;

    const { title, description, priority, category, propertyId } =
      req.body as CreateMaintenanceRequest;

    if (!title || !description || !priority || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Resolve the tenant's property if not supplied.
    const userData = (await adminDb.collection('users').doc(tenantId).get()).data();
    const resolvedPropertyId = propertyId || userData?.propertyIds?.[0] || 'unassigned';

    const now = Date.now();
    const requestRef = await adminDb.collection('maintenanceRequests').add({
      tenantId,
      propertyId: resolvedPropertyId,
      title,
      description,
      priority,
      category,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    });

    // Reflect the request on the tenant's GHL contact (non-blocking on failure)
    await pushMaintenanceToGHL({
      tenantId,
      title,
      description,
      priority,
      status: 'submitted',
    });

    return res.status(200).json({ success: true, requestId: requestRef.id });
  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
