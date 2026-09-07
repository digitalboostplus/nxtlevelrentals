import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { requestActor } from '@/lib/serverRequest';

// Small read-only summary for the admin sidebar: how many accounts exist per role and
// when a tenant record was last synced from GoHighLevel.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  try {
    await requestActor(req, ['admin', 'super-admin']);
    const snapshot = await adminDb.collection('users').select('role', 'lastSyncedAt').get();
    const counts: Record<string, number> = { tenant: 0, landlord: 0, admin: 0, 'super-admin': 0 };
    let lastSyncedAt: string | null = null;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const role = typeof data.role === 'string' ? data.role : 'tenant';
      counts[role] = (counts[role] ?? 0) + 1;
      if (typeof data.lastSyncedAt === 'string' && (!lastSyncedAt || data.lastSyncedAt > lastSyncedAt)) lastSyncedAt = data.lastSyncedAt;
    }
    return res.status(200).json({ counts, lastSyncedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load summary';
    return res.status(message === 'Access denied' ? 403 : message === 'Authentication required' ? 401 : 500).json({ message });
  }
}
