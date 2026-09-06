import type { Firestore, Transaction } from 'firebase-admin/firestore';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export type FileKind = 'lease' | 'maintenance' | 'insurance' | 'expense';
export function validateFile(bytes: Buffer, kind: string, mime: string) {
  if (!['lease', 'maintenance', 'insurance', 'expense'].includes(kind) || bytes.length === 0 || bytes.length > MAX_FILE_BYTES) throw new Error('Unsupported file or file exceeds 5 MB');
  const pdf = bytes.subarray(0, 5).toString() === '%PDF-';
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  const valid = (mime === 'application/pdf' && pdf && kind !== 'maintenance') ||
    (kind !== 'lease' && ((mime === 'image/png' && png) || (mime === 'image/jpeg' && jpg) || (mime === 'image/webp' && webp)));
  if (!valid) throw new Error('File content does not match an allowed PDF or image format');
}
export async function authorizeUpload(db: Firestore, uid: string, kind: FileKind, propertyId?: string) {
  const user = (await db.doc(`users/${uid}`).get()).data();
  const admin = ['admin', 'super-admin'].includes(user?.role);
  if (kind === 'insurance' && user?.role === 'tenant') return;
  if (!propertyId || propertyId.includes('/')) throw new Error('Property required');
  const property = (await db.doc(`properties/${propertyId}`).get()).data();
  if (!property || property.archived) throw new Error('Property unavailable');
  if (admin && ['lease', 'maintenance', 'expense'].includes(kind)) return;
  if (kind === 'maintenance' && user?.role === 'tenant' && user.propertyIds?.includes(propertyId)) return;
  if (kind === 'expense' && user?.role === 'landlord' && property.landlordId === uid) return;
  throw new Error('Upload access denied');
}
export async function attachmentRefs(tx: Transaction, db: Firestore, ids: unknown, uid: string, kind: FileKind, propertyId: string | null, boundTo: string) {
  if (!Array.isArray(ids) || ids.length > 6 || new Set(ids).size !== ids.length) throw new Error('Provide at most six distinct attachments');
  const refs = ids.map(id => {
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new Error('Invalid attachment');
    return db.doc(`fileAttachments/${id}`);
  });
  for (const ref of refs) {
    const file = (await tx.get(ref)).data();
    if (!file || file.deleting || file.createdBy !== uid || file.kind !== kind || file.propertyId !== propertyId || (file.boundTo && file.boundTo !== boundTo)) throw new Error('Attachment does not belong to this operation');
  }
  return refs;
}
export async function readableAttachment(db: Firestore, uid: string, id: string) {
  if (!/^[\w-]{1,128}$/.test(id)) throw new Error('File unavailable');
  const file = (await db.doc(`fileAttachments/${id}`).get()).data();
  const user = (await db.doc(`users/${uid}`).get()).data();
  if (!file || !user) throw new Error('File unavailable');
  if (['admin', 'super-admin'].includes(user.role)) return file;
  if (!file.boundTo && file.createdBy === uid) return file;
  if (file.boundTo) {
    const record = (await db.doc(file.boundTo).get()).data();
    if (file.kind === 'insurance' && file.boundTo === `users/${uid}` && record?.rentersInsurance?.fileIds?.includes(id)) return file;
    if (record?.fileIds?.includes(id)) {
      if (record.tenantId === uid) return file;
      const property = record.propertyId ? (await db.doc(`properties/${record.propertyId}`).get()).data() : null;
      if (user.role === 'landlord' && property?.landlordId === uid && file.kind !== 'insurance') return file;
    }
  }
  throw new Error('File access denied');
}
