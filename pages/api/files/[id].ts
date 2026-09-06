import type { NextApiRequest, NextApiResponse } from 'next';
import { getStorage } from 'firebase-admin/storage';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requestActor, recordId } from '@/lib/serverRequest';
import { readableAttachment } from '@/lib/attachments';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'DELETE'].includes(req.method || '')) return res.status(405).end();
  try {
    const actor = await requestActor(req); const id = recordId(req.query.id);
    const file = await readableAttachment(adminDb, actor.uid, id);
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) throw new Error('Storage is not configured');
    const object = getStorage(adminAuth.app).bucket(bucket).file(file.storagePath);
    if (req.method === 'DELETE') {
      // Transactional removal prevents an upload from being attached while it is discarded.
      await adminDb.runTransaction(async tx => {
        const ref = adminDb.doc(`fileAttachments/${id}`); const current = (await tx.get(ref)).data();
        if (!current || current.boundTo || current.createdBy !== actor.uid) throw new Error('Attached files cannot be discarded');
        tx.delete(ref);
      });
      await object.delete({ ignoreNotFound: true });
      return res.status(200).json({ success: true });
    }
    res.setHeader('Content-Type', file.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    await new Promise<void>((resolve, reject) => object.createReadStream().on('error', reject).on('end', resolve).pipe(res));
  } catch (error) {
    if (res.headersSent) return res.destroy();
    return res.status(403).json({ message: error instanceof Error ? error.message : 'File unavailable' });
  }
}
