import type { NextApiRequest } from 'next';
import { adminAuth, adminDb } from './firebase-admin';
export async function requestActor(req: NextApiRequest, roles?: string[]) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error('Authentication required');
  const { uid } = await adminAuth.verifyIdToken(token);
  const profile = (await adminDb.doc(`users/${uid}`).get()).data();
  if (!profile || (roles && !roles.includes(profile.role))) throw new Error('Access denied');
  return { uid, role: profile.role as string, profile };
}
export function recordId(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) throw new Error('Invalid record ID');
  return value;
}
