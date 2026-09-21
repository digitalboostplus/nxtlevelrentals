import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { recordId, requestActor } from '@/lib/serverRequest';
import { enqueueGhlSyncNow, processGhlSyncJobs } from '@/lib/ghlSyncJobs';

// POST re-runs the GoHighLevel custom-object mirror for one ticket, ignoring backoff.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  try {
    await requestActor(req, ['admin', 'super-admin']);
    const id = recordId(req.query.id);
    if (!(await adminDb.doc(`maintenanceRequests/${id}`).get()).exists) return res.status(404).json({ message: 'Ticket not found' });
    await enqueueGhlSyncNow(adminDb, id, 'resync');
    const counts = await processGhlSyncJobs(adminDb, { db: adminDb }, { onlyId: id, force: true, budgetMs: 12000 });
    const request = (await adminDb.doc(`maintenanceRequests/${id}`).get()).data();
    return res.status(200).json({ counts, ghlRecordId: request?.ghlRecordId ?? null, ghlSyncError: request?.ghlSyncError ?? null, ghlSyncedAt: request?.ghlSyncedAt ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message === 'Access denied' ? 403 : message === 'Authentication required' ? 401 : message === 'Invalid record ID' ? 400 : 500;
    return res.status(status).json({ message });
  }
}
