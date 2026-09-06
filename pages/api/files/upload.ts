import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requestActor } from '@/lib/serverRequest';
import { authorizeUpload, validateFile, MAX_FILE_BYTES, type FileKind } from '@/lib/attachments';
export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const actor = await requestActor(req);
    const kind = req.query.kind as FileKind;
    const propertyId = typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined;
    await authorizeUpload(adminDb, actor.uid, kind, propertyId);
    if (Number(req.headers['content-length']) > MAX_FILE_BYTES) return res.status(413).json({ message: 'File exceeds 5 MB' });
    const chunks: Buffer[] = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > MAX_FILE_BYTES) return res.status(413).json({ message: 'File exceeds 5 MB' });
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    const mime = req.headers['content-type'] || '';
    validateFile(bytes, kind, mime);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error('File storage is not configured');
    const id = randomUUID(); const path = `privateAttachments/${actor.uid}/${id}`;
    const file = getStorage(adminAuth.app).bucket(bucketName).file(path);
    await file.save(bytes, { resumable: false, metadata: { contentType: mime, cacheControl: 'private, no-store' } });
    try {
      await adminDb.doc(`fileAttachments/${id}`).create({ createdBy: actor.uid, kind,
        propertyId: kind === 'insurance' ? null : propertyId, storagePath: path, mime,
        fileName: String(req.query.name || 'attachment').slice(0, 180), size: bytes.length, boundTo: null, createdAt: Date.now() });
    } catch (error) { await file.delete(); throw error; }
    return res.status(201).json({ id });
  } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Upload failed' }); }
}
