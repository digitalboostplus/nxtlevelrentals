import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requestActor } from '@/lib/serverRequest';
import { processNotifications } from '@/lib/notificationQueue';
import { cleanupUploads } from '@/lib/uploadCleanup';
import { sendEmailNotification, sendPushNotification } from '@/lib/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).end();
  try {
    const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
    const secret = process.env.OPERATIONS_CRON_SECRET || '';
    const scheduled = secret.length >= 32 && supplied.length === secret.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
    if (!scheduled || req.method === 'GET') await requestActor(req, ['admin', 'super-admin']);
    if (req.method === 'GET') {
      const counts = await Promise.all(['pending', 'processing', 'sent', 'skipped', 'failed'].map(async status => [status, (await adminDb.collection('notificationJobs').where('status', '==', status).count().get()).data().count]));
      return res.status(200).json({ counts: Object.fromEntries(counts) });
    }
    const notifications = await processNotifications(adminDb, async (_id, job, email) => {
      if (job.channel === 'push') return sendPushNotification(job.userId, job.title, job.message, { maintenanceRequestId: job.requestId });
      if (!email) return false;
      const escaped = job.message.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
      return sendEmailNotification(email, job.title, `<p>${escaped}</p>`, job.message);
    });
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const cleanup = await cleanupUploads(adminDb, async path => {
      if (!bucket) throw new Error('Storage bucket required');
      await getStorage(adminAuth.app).bucket(bucket).file(path).delete({ ignoreNotFound: true });
    }, req.body?.cleanup === true);
    return res.status(200).json({ notifications, cleanup });
  } catch { return res.status(403).json({ message: 'Operations require authorization and configured services' }); }
}
