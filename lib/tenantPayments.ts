import { normalizeDate } from '@/lib/date';
import type { Payment } from '@/types/schema';

export function paymentDates(payment: { dueDate?: unknown; paidAt?: unknown; paidDate?: unknown }) {
  return {
    dueDate: normalizeDate(payment.dueDate) ?? undefined,
    paidAt: normalizeDate(payment.paidAt) ?? normalizeDate(payment.paidDate) ?? undefined,
  };
}

export function lastRecordedPayment(payments: Payment[]) {
  const recorded = payments.flatMap(payment => {
    const date = normalizeDate(payment.paidAt);
    if (!['paid', 'completed', 'succeeded'].includes(String(payment.status)) || !date || !Number.isFinite(payment.amount)) return [];
    return [{ amount: payment.amount, date, method: payment.paymentMethod, receiptUrl: payment.receiptUrl }];
  });
  return recorded.sort((a, b) => b.date.getTime() - a.date.getTime())[0] ?? null;
}
