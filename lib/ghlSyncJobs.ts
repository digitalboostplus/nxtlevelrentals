// Durable "reconcile ticket X to GoHighLevel" queue.
//
// Routes enqueue inside the same transaction as the business change, so the
// job cannot be lost, then run one immediate attempt before responding. The
// scheduled /api/admin/run-operations worker retries whatever did not land.
// One job document per ticket: repeated changes coalesce into a single
// pending job because the mirror always writes the ticket's current state.

import { randomUUID } from 'crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { mirrorMaintenanceToGHL, type Dependencies } from './ghl-maintenance-object';

export const GHL_SYNC_JOBS = 'ghlSyncJobs';
const MAX_ATTEMPTS = 8;
const CLAIM_LEASE_MS = 300000;

export type SyncCounts = { sent: number; retry: number; failed: number; skipped: number };

/** Call after the transaction's reads. `reason` is informational (created | status | resync | backfill). */
export function enqueueGhlSync(tx: Transaction, db: Firestore, requestId: string, reason: string, now: number = Date.now()) {
  tx.set(db.doc(`${GHL_SYNC_JOBS}/${requestId}`), {
    requestId, reason, status: 'pending', attempts: 0, nextAttemptAt: now, enqueuedAt: now, updatedAt: now, lastError: FieldValue.delete(),
  }, { merge: true });
}

/** Same as enqueueGhlSync for callers outside a transaction (backfills). */
export async function enqueueGhlSyncNow(db: Firestore, requestId: string, reason: string, now: number = Date.now()) {
  await db.runTransaction(async tx => { enqueueGhlSync(tx, db, requestId, reason, now); });
}

const backoff = (attempts: number) => Math.min(3600000, 30000 * 2 ** Math.max(0, attempts - 1));

/**
 * Claim and run due jobs. `onlyId` targets one ticket (the inline attempt after
 * a route commits, or a manual resync); `force` ignores the backoff and the
 * attempt cap for that ticket. `budgetMs` keeps the worker under the HTTP deadline.
 */
export async function processGhlSyncJobs(
  db: Firestore,
  deps: Dependencies,
  opts: { now?: number; limit?: number; onlyId?: string; force?: boolean; budgetMs?: number } = {}
): Promise<SyncCounts> {
  const now = opts.now ?? Date.now();
  const budget = opts.budgetMs ?? 15000;
  const counts: SyncCounts = { sent: 0, retry: 0, failed: 0, skipped: 0 };
  const refs = opts.onlyId
    ? [db.doc(`${GHL_SYNC_JOBS}/${opts.onlyId}`)]
    : (await db.collection(GHL_SYNC_JOBS).where('nextAttemptAt', '<=', now).orderBy('nextAttemptAt').limit(Math.min(opts.limit ?? 10, 25)).get()).docs.map(d => d.ref);
  const startedAt = Date.now();
  for (const ref of refs) {
    if (Date.now() - startedAt > budget) break;
    const claimId = randomUUID();
    const claimed = await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (!current || !['pending', 'processing'].includes(current.status)) return null;
      if (!opts.force && (current.nextAttemptAt === undefined || current.nextAttemptAt > now)) return null;
      const attempts = opts.force ? 1 : current.attempts + 1;
      if (!opts.force && current.attempts >= MAX_ATTEMPTS) {
        tx.update(ref, { status: 'failed', nextAttemptAt: FieldValue.delete(), updatedAt: now });
        return null;
      }
      tx.update(ref, { status: 'processing', claimId, attempts, nextAttemptAt: now + CLAIM_LEASE_MS, updatedAt: now });
      return { attempts, enqueuedAt: current.enqueuedAt as number | undefined };
    });
    if (!claimed) { counts.skipped++; continue; }
    let outcome: keyof SyncCounts = 'retry';
    let error: string | null = null;
    try {
      const result = await mirrorMaintenanceToGHL(deps, ref.id);
      if (result.ok) outcome = 'sent'; else error = result.error;
    } catch (err) {
      error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    }
    if (outcome === 'retry' && claimed.attempts >= MAX_ATTEMPTS) outcome = 'failed';
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (!current || current.claimId !== claimId) return;
      // Re-enqueued while we were running: the ticket changed again, so run once more.
      const stale = current.enqueuedAt !== claimed.enqueuedAt;
      const status = stale ? 'pending' : outcome === 'retry' ? 'pending' : outcome;
      tx.update(ref, {
        status, claimId: FieldValue.delete(), updatedAt: now,
        nextAttemptAt: stale ? now : outcome === 'retry' ? now + backoff(claimed.attempts) : FieldValue.delete(),
        lastError: error ?? FieldValue.delete(),
      });
    });
    counts[outcome]++;
  }
  return counts;
}

/** Best-effort inline attempt after a route commits; never throws. */
export async function attemptGhlSync(db: Firestore, requestId: string, deps: Dependencies = { db }): Promise<SyncCounts | null> {
  try {
    return await processGhlSyncJobs(db, deps, { onlyId: requestId, budgetMs: 8000 });
  } catch (err) {
    console.error(`[ghl-sync] inline attempt for ${requestId} failed:`, err);
    return null;
  }
}
