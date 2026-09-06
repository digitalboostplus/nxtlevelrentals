import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { loadOwnerData } from '@/lib/ownerData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  let uid: string;
  try { uid = (await adminAuth.verifyIdToken(req.headers.authorization?.replace(/^Bearer /, '') || '')).uid; }
  catch { return res.status(401).json({ message: 'Authentication required' }); }
  try {
    const propertyId = req.query.propertyId;
    if (propertyId !== undefined && (typeof propertyId !== 'string' || propertyId.includes('/'))) return res.status(400).json({ message: 'Invalid property' });
    return res.status(200).json(await loadOwnerData(adminDb, uid, propertyId));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (['Owner access required', 'Property unavailable'].includes(message)) return res.status(403).json({ message });
    console.error('Owner records unavailable', error);
    return res.status(500).json({ message: 'Owner records could not be loaded. Please retry.' });
  }
}
