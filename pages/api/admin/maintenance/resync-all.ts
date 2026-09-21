import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { requestActor } from '@/lib/serverRequest';
import { enqueueGhlSyncNow, processGhlSyncJobs } from '@/lib/ghlSyncJobs';

// POST queues every ticket that has never reached GoHighLevel (or all of them
// with ?force=1) and drains as many as fit in one request; the scheduled
// run-operations worker finishes the rest.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  try {
    await requestActor(req, ['admin', 'super-admin']);
    const force = req.query.force === '1' || req.body?.force === true;
    const tickets = await adminDb.collection('maintenanceRequests').get();
    let queued = 0;
    for (const doc of tickets.docs) {
      const t = doc.data();
      if (!force && typeof t.ghlRecordId === 'string' && t.ghlRecordId && !t.ghlSyncError) continue;
      await enqueueGhlSyncNow(adminDb, doc.id, 'backfill');
      queued++;
    }
    const counts = await processGhlSyncJobs(adminDb, { db: adminDb }, { limit: 25, budgetMs: 15000 });
    return res.status(200).json({ queued, total: tickets.size, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message === 'Access denied' ? 403 : message === 'Authentication required' ? 401 : 500;
    return res.status(status).json({ message });
  }
}
