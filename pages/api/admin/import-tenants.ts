import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { applyTenantDirectory, DirectoryError, listTenantDirectory, previewTenantDirectory } from '@/lib/ghlTenantDirectory';

export const config = { maxDuration: 300 };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).json({ message: 'Method not allowed' });
  const token = req.headers.authorization;
  if (!token?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  let uid: string;
  try { uid = (await adminAuth.verifyIdToken(token.slice(7), true)).uid; }
  catch { return res.status(401).json({ message: 'Invalid authentication' }); }
  try {
    const role = (await adminDb.doc(`users/${uid}`).get()).data()?.role;
    if (!['admin', 'super-admin'].includes(role)) return res.status(403).json({ message: 'Admin access required' });
    const deps = { db: adminDb, auth: adminAuth };
    if (req.method === 'GET') return res.status(200).json(await listTenantDirectory(deps));
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['action', 'previewId', 'contactIds'].includes(key))) throw new DirectoryError('Use action: preview or apply; tag overrides are not supported', 400);
    const action = body.action ?? 'preview';
    if (action === 'preview') return res.status(200).json(await previewTenantDirectory(deps, uid));
    if (action !== 'apply') throw new DirectoryError('Unknown import action', 400);
    return res.status(200).json(await applyTenantDirectory(deps, uid, body.previewId, body.contactIds));
  } catch (error) {
    if (error instanceof DirectoryError) return res.status(error.status).json({ message: error.message });
    console.error('GHL directory request failed');
    return res.status(502).json({ message: 'Could not complete GHL directory request. Preview again or retry your selection.' });
  }
}
