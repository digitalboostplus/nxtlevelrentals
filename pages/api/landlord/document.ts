import type { NextApiRequest, NextApiResponse } from 'next';
import { getStorage } from 'firebase-admin/storage';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { ownerDocumentPath } from '@/lib/ownerData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).end();
  let uid: string;
  try { uid = (await adminAuth.verifyIdToken(req.headers.authorization?.replace(/^Bearer /, '') || '')).uid; }
  catch { return res.status(401).json({ message: 'Authentication required' }); }
  try {
    if (typeof req.query.id !== 'string') return res.status(400).end();
    const record = await ownerDocumentPath(adminDb, uid, req.query.id);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return res.status(503).json({ message: 'Document storage is not configured' });
    const file = getStorage(adminAuth.app).bucket(bucketName).file(record.storagePath);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ message: 'Document file is unavailable' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(record.fileName)}`);
    await new Promise<void>((resolve, reject) => file.createReadStream().on('error', reject).on('end', resolve).pipe(res));
  } catch (error) {
    if (res.headersSent) return res.destroy();
    return res.status(403).json({ message: 'Document unavailable or access denied' });
  }
}
