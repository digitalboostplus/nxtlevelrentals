import type { NextApiRequest, NextApiResponse } from 'next';
import { requestActor, recordId } from '@/lib/serverRequest';
import { adminDb } from '@/lib/firebase-admin';
import { editProperty } from '@/lib/propertyOperations';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const actor = await requestActor(req, ['admin', 'super-admin']);
    await editProperty(adminDb, actor.uid, recordId(req.body.propertyId), req.body);
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Property update failed' }); }
}
