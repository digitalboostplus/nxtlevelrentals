import type { Firestore } from 'firebase-admin/firestore';

export const UPLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export async function cleanupUploads(db: Firestore, remove: (path: string) => Promise<void>, apply = false, now = Date.now()) {
  const cutoff = now - UPLOAD_RETENTION_MS;
  const candidates = await db.collection('fileAttachments').where('boundTo', '==', null).where('createdAt', '<=', cutoff).orderBy('createdAt').limit(100).get();
  const result = { candidates: candidates.size, deleted: 0, failed: 0 };
  if (!apply) return result;
  for (const doc of candidates.docs) {
    const path = await db.runTransaction(async tx => {
      const file = (await tx.get(doc.ref)).data();
      if (!file || file.boundTo || file.createdAt > cutoff) return null;
      if (file.storagePath !== `privateAttachments/${file.createdBy}/${doc.id}`) throw new Error('Unexpected private file path');
      // A failed object deletion leaves a retryable tombstone. Binding must reject it.
      tx.update(doc.ref, { deleting: true });
      return file.storagePath as string;
    });
    if (!path) continue;
    try { await remove(path); await doc.ref.delete(); result.deleted++; }
    catch { result.failed++; }
  }
  return result;
}
