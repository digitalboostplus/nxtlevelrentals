import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { requestActor } from '@/lib/serverRequest';
import { updateWorkOrder } from '@/lib/maintenanceOperations';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const actor = await requestActor(req, ['admin', 'super-admin']);
    const result = await updateWorkOrder(adminDb, actor.uid, req.body);
    return res.status(200).json({ success: true, request: result.request, notificationsQueued: result.changed });
  } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Update failed' }); }
}
