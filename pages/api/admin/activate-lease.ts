import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { activateLease } from '@/lib/activateLease';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  let uid: string;
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch { return res.status(401).json({ message: 'Invalid authentication' }); }
  const actor = await adminDb.collection('users').doc(uid).get();
  if (!['admin', 'super-admin'].includes(actor.data()?.role)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await activateLease(adminDb, adminAuth, uid, req.body);
    // No email is sent. An operator can securely share this account setup link.
    let accountSetupUrl: string | null = null;
    if (req.body.newTenant) {
      try { accountSetupUrl = await adminAuth.generatePasswordResetLink(req.body.newTenant.email); }
      catch { /* Activation succeeded; password reset can be requested separately. */ }
    }
    return res.status(200).json({ ...result, accountSetupUrl });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Lease activation failed' });
  }
}
