import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { validateFile, MAX_FILE_BYTES, type FileKind } from './attachments';

const collections: Record<string, { kind: FileKind; field: string }> = {
  leases: { kind: 'lease', field: 'documents' },
  maintenanceRequests: { kind: 'maintenance', field: 'images' },
  landlordExpenses: { kind: 'expense', field: 'receiptUrls' },
  users: { kind: 'insurance', field: 'rentersInsurance.documentUrl' }
};
function sourceField(record: any, field: string): unknown {
  return field.split('.').reduce((value, key) => value?.[key], record);
}
export function legacyStoragePath(url: string, bucket: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS bucket URLs can be migrated');
  if (parsed.hostname === 'firebasestorage.googleapis.com') {
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (match && decodeURIComponent(match[1]) === bucket) return decodeURIComponent(match[2]);
  }
  if (parsed.hostname === 'storage.googleapis.com' && parsed.pathname.startsWith(`/${bucket}/`)) return decodeURIComponent(parsed.pathname.slice(bucket.length + 2));
  throw new Error('Source is outside the configured bucket; manual review required');
}

export async function migrateAttachment(db: Firestore, bucket: Bucket, actor: string, recordPath: string, index = 0, apply = false) {
  const [collection, documentId, extra] = recordPath.split('/'); const config = collections[collection];
  if (!config || !documentId || extra) throw new Error('Unsupported record');
  if (!['admin', 'super-admin'].includes((await db.doc(`users/${actor}`).get()).data()?.role)) throw new Error('Admin required');
  const ref = db.doc(recordPath); const record = (await ref.get()).data();
  if (!record) throw new Error('Record missing');
  const original = sourceField(record, config.field);
  const source = Array.isArray(original) ? original[index] : index === 0 ? original : null;
  if (typeof source !== 'string' || !source) throw new Error('No source attachment at this index');
  let bytes: Buffer; let mime: string;
  if (source.startsWith('data:')) {
    const match = source.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[2].length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 4) throw new Error('Invalid inline attachment');
    mime = match[1]; bytes = Buffer.from(match[2], 'base64');
  } else {
    const path = legacyStoragePath(source, bucket.name); const object = bucket.file(path);
    const [metadata] = await object.getMetadata();
    if (!Number.isFinite(Number(metadata.size)) || Number(metadata.size) > MAX_FILE_BYTES) throw new Error('Source exceeds size limit');
    mime = metadata.contentType || ''; [bytes] = await object.download();
  }
  validateFile(bytes, config.kind, mime);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const id = createHash('sha256').update(`${recordPath}:${config.field}:${source}`).digest('hex');
  const destination = `privateAttachments/${actor}/${id}`;
  if (!apply) return { recordPath, kind: config.kind, bytes: bytes.length, sha256: hash, id, applied: false };
  const object = bucket.file(destination);
  await object.save(bytes, { resumable: false, metadata: { contentType: mime, cacheControl: 'private, no-store' } });
  const [copied] = await object.download();
  if (createHash('sha256').update(copied).digest('hex') !== hash) throw new Error('Copy verification failed');
  const fileRef = db.doc(`fileAttachments/${id}`);
  await db.runTransaction(async tx => {
    if (!(await tx.get(fileRef)).exists) tx.create(fileRef, { createdBy: actor, kind: config.kind,
      propertyId: config.kind === 'insurance' ? null : record.propertyId, boundTo: null, storagePath: destination, mime,
      fileName: `migrated-${id.slice(0, 8)}.${mime === 'application/pdf' ? 'pdf' : mime.split('/')[1]}`,
      size: bytes.length, createdAt: Date.now(), sha256: hash, migrated: true });
  });
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    const previous = await tx.get(fileRef);
    if (previous.exists && previous.data()?.boundTo === recordPath) return;
    if (JSON.stringify(sourceField(current, config.field)) !== JSON.stringify(original)) throw new Error('Record changed; re-run dry run');
    const existing = config.kind === 'insurance' ? current?.rentersInsurance?.fileIds || [] : current?.fileIds || [];
    if (existing.length >= 6) throw new Error('Attachment limit reached');
    if (previous.data()?.deleting || previous.data()?.boundTo || previous.data()?.createdBy !== actor) throw new Error('Migration file cannot be bound');
    tx.update(fileRef, { boundTo: recordPath });
    const remaining = Array.isArray(original) ? original.filter((_, i) => i !== index) : '';
    tx.update(ref, { [config.field]: remaining, [config.kind === 'insurance' ? 'rentersInsurance.fileIds' : 'fileIds']: [...existing, id] });
  });
  // Original objects/tokens are intentionally retained until references outside
  // this record are inventoried. This operation does not claim URL revocation.
  return { recordPath, kind: config.kind, bytes: bytes.length, sha256: hash, id, applied: true };
}
