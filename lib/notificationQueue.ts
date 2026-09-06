import { createHash, randomUUID } from 'crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { DEFAULT_PREFERENCES } from './notificationPreferences';

type EventName = 'requestConfirmation' | 'statusChanges' | 'notesAdded' | 'technicianScheduled';
export type DeliveryJob = { userId: string; channel: 'email' | 'push' | 'inApp'; event: EventName; requestId: string; title: string; message: string; type: string };
export type Delivery = (id: string, job: DeliveryJob, email: string) => Promise<boolean>;

// Call after all other transaction reads and before its writes. Jobs and business
// changes commit together; a lost HTTP response cannot lose the notification.
export async function queueMaintenance(tx: Transaction, db: Firestore, eventId: string, ticket: any, events: EventName[]) {
  if (!events.length) return;
  const recipients = new Set<string>([ticket.tenantId]);
  if (events.includes('requestConfirmation')) {
    const admins = await tx.get(db.collection('users').where('role', 'in', ['admin', 'super-admin']).limit(101));
    if (admins.size > 100) throw new Error('Notification audience exceeds supported batch size');
    admins.docs.forEach(doc => recipients.add(doc.id));
  }
  const messages: Record<EventName, [string, string, string]> = {
    requestConfirmation: ['Maintenance request received', ticket.title, 'maintenance_created'],
    statusChanges: ['Maintenance status updated', `${ticket.title}: ${ticket.status}`, 'status_change'],
    notesAdded: ['Maintenance update', `${ticket.title}: ${ticket.newNotes || ''}`, 'notes_added'],
    technicianScheduled: ['Maintenance visit scheduled', `${ticket.title}: ${ticket.scheduledDate} ${ticket.scheduledTime} ${ticket.timeZone} — ${ticket.assignedVendorName}`, 'scheduled']
  };
  for (const userId of Array.from(recipients)) for (const event of events) for (const channel of ['email', 'push', 'inApp'] as const) {
    if (!userId) continue;
    const id = createHash('sha256').update(`${eventId}:${event}:${userId}:${channel}`).digest('hex');
    const [title, message, type] = messages[event];
    tx.create(db.doc(`notificationJobs/${id}`), { userId, channel, event, requestId: ticket.id, title, message, type,
      status: 'pending', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now() });
  }
}

export async function processNotifications(db: Firestore, deliver: Delivery, now = Date.now(), limit = 25) {
  const candidates = await db.collection('notificationJobs').where('nextAttemptAt', '<=', now).orderBy('nextAttemptAt').limit(Math.min(limit, 25)).get();
  const counts = { sent: 0, skipped: 0, retry: 0, failed: 0 };
  const startedAt = Date.now();
  for (const doc of candidates.docs) {
    // Leave time for one provider attempt before the HTTP worker deadline.
    if (Date.now() - startedAt > 15000) break;
    const claimId = randomUUID();
    const job = await db.runTransaction(async tx => {
      const current = (await tx.get(doc.ref)).data();
      if (!current || !['pending', 'processing'].includes(current.status) || current.nextAttemptAt > now) return null;
      if (current.attempts >= 8) {
        tx.update(doc.ref, { status: 'failed', nextAttemptAt: FieldValue.delete(), updatedAt: now });
        return null;
      }
      tx.update(doc.ref, { status: 'processing', claimId, attempts: current.attempts + 1, nextAttemptAt: now + 300000 });
      return { ...current, attempts: current.attempts + 1 } as DeliveryJob & { attempts: number };
    });
    if (!job) continue;
    let outcome: keyof typeof counts = 'retry';
    try {
      const [profile, preferences] = await Promise.all([db.doc(`users/${job.userId}`).get(), db.doc(`notificationPreferences/${job.userId}`).get()]);
      const settings = { ...DEFAULT_PREFERENCES[job.channel], ...preferences.data()?.[job.channel] } as Record<string, boolean>;
      if (!profile.exists || !settings.enabled || settings[job.event] === false) outcome = 'skipped';
      else if (job.channel === 'inApp') {
        // A deterministic notification ID survives a worker crash after delivery.
        await db.runTransaction(async tx => {
          const ref = db.doc(`notifications/${doc.id}`);
          if (!(await tx.get(ref)).exists) tx.create(ref, { userId: job.userId, type: job.type, title: job.title, message: job.message,
            maintenanceRequestId: job.requestId, read: false, createdAt: FieldValue.serverTimestamp() });
        });
        outcome = 'sent';
      } else if (await deliver(doc.id, job, profile.data()?.email || '')) outcome = 'sent';
    } catch { /* Do not persist provider errors containing addresses or tokens. */ }
    if (outcome === 'retry' && job.attempts >= 8) outcome = 'failed';
    await db.runTransaction(async tx => {
      if ((await tx.get(doc.ref)).data()?.claimId !== claimId) return;
      tx.update(doc.ref, { status: outcome === 'retry' ? 'pending' : outcome, claimId: FieldValue.delete(), updatedAt: now,
        nextAttemptAt: outcome === 'retry' ? now + Math.min(3600000, 30000 * 2 ** (job.attempts - 1)) : FieldValue.delete() });
    });
    counts[outcome]++;
  }
  return counts;
}
