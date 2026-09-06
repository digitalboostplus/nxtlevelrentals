import { normalizeDate } from './date';

export interface BalanceEntry {
  amount: number;
  type: string;
  status: string;
  date?: unknown;
  dueDate?: unknown;
}

export function moneyToCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.00001) {
    throw new Error('Amount must be a finite number with at most two decimal places');
  }
  return cents;
}

// Legacy adjustments are signed; payments may be signed or positive.
export function ledgerDeltaCents(entry: BalanceEntry): number {
  if (['failed', 'cancelled', 'refunded', 'void'].includes(entry.status)) return 0;
  const amount = moneyToCents(entry.amount);
  if (entry.type === 'charge' && ['pending', 'completed', 'overdue', 'posted'].includes(entry.status)) return amount;
  if (entry.type === 'adjustment' && entry.status === 'completed') return amount;
  if (['payment', 'credit'].includes(entry.type) && ['completed', 'paid', 'succeeded'].includes(entry.status)) return -Math.abs(amount);
  return 0;
}

export function calculateBalance(entries: BalanceEntry[]): number {
  const cents = entries.reduce((sum, entry) => sum + ledgerDeltaCents(entry), 0);
  if (!Number.isSafeInteger(cents)) throw new Error('Balance exceeds supported range');
  return cents / 100;
}

// Apply credits to the oldest charges first until explicit allocations exist.
export function oldestUnpaidDate(entries: BalanceEntry[]): Date | null {
  const debits = entries.map(e => ({ cents: ledgerDeltaCents(e), date: normalizeDate(e.dueDate || e.date) }))
    .filter(e => e.cents > 0).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  let credits = entries.reduce((sum, e) => sum + Math.max(0, -ledgerDeltaCents(e)), 0);
  for (const debit of debits) {
    if (credits < debit.cents) return debit.date;
    credits -= debit.cents;
  }
  return null;
}
