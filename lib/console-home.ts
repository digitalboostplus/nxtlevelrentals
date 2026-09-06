// Pure helpers behind the three console home screens (tenant, landlord,
// admin). Everything here is a plain function over already-loaded records so
// it can be unit tested without Firestore.

import { normalizeDate } from '@/lib/date';
import { moneyToCents } from '@/lib/ledger';
import type { FinancialRecord } from '@/lib/ownerFinancials';
import type { Lease, MaintenanceRequest, Payment, Payout, Property } from '@/types/schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES: MaintenanceRequest['status'][] = ['submitted', 'in_progress'];

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export function formatMoney(amount: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  }).format(amount);
}

export function formatPropertyAddress(address: Property['address'] | undefined | null): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const line = [address.street, address.city, address.state].filter(Boolean).join(', ');
  return address.zipCode ? `${line} ${address.zipCode}` : line;
}

export function shortAddress(address: Property['address'] | undefined | null, fallback = ''): string {
  if (!address) return fallback;
  if (typeof address === 'string') return address.split(',')[0].trim() || fallback;
  return address.street || fallback;
}

export function isOpenRequest(request: Pick<MaintenanceRequest, 'status'>): boolean {
  return OPEN_STATUSES.includes(request.status);
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------- tenant --

export type AttentionItem = {
  id: string;
  kind: 'maintenance' | 'lease' | 'insurance' | 'balance';
  title: string;
  meta: string;
  tone: Tone;
  label: string;
  href: string;
};

export function tenantAttentionItems(input: {
  maintenanceRequests: MaintenanceRequest[];
  lease: Lease | null;
  hasRentersInsurance: boolean;
  currentBalance: number;
  nextDueDate: Date | null;
  now?: Date;
}): AttentionItem[] {
  const now = input.now ?? new Date();
  const items: AttentionItem[] = [];

  if (input.currentBalance > 0) {
    const due = input.nextDueDate;
    const overdue = due ? daysBetween(due, now) : 0;
    items.push({
      id: 'balance',
      kind: 'balance',
      title: `${formatMoney(input.currentBalance, { cents: true })} balance on your account`,
      meta: overdue > 0 ? `Oldest charge was due ${overdue} day${overdue === 1 ? '' : 's'} ago` : due ? 'Review the recorded charge and its due date.' : 'No due date recorded. Contact management for details.',
      tone: overdue > 0 ? 'error' : 'warning',
      label: overdue > 0 ? 'Past due' : due ? 'Due soon' : 'Review',
      href: '#payments',
    });
  }

  input.maintenanceRequests
    .filter(isOpenRequest)
    .slice(0, 2)
    .forEach((request) => {
      const scheduled = normalizeDate(request.scheduledDate);
      const meta = scheduled
        ? `Scheduled ${scheduled.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${request.scheduledTime ? `, ${request.scheduledTime}` : ''}`
        : request.status === 'in_progress'
          ? 'Being worked on now'
          : 'Received. No appointment recorded yet.';
      items.push({
        id: request.id,
        kind: 'maintenance',
        title: request.title,
        meta,
        tone: 'info',
        label: request.status === 'in_progress' ? 'In progress' : 'Submitted',
        href: '#maintenance',
      });
    });

  const leaseEnd = normalizeDate(input.lease?.endDate);
  if (leaseEnd) {
    const daysLeft = daysBetween(now, leaseEnd);
    if (daysLeft >= 0 && daysLeft <= 90) {
      items.push({
        id: 'lease-end',
        kind: 'lease',
        title: `Your lease ends ${leaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        meta: daysLeft <= 30 ? 'Less than a month left. Let us know your plans.' : 'Renewal details will be in Documents when ready.',
        tone: 'warning',
        label: `${daysLeft} days`,
        href: '#documents',
      });
    }
  }

  if (!input.hasRentersInsurance) {
    items.push({
      id: 'insurance',
      kind: 'insurance',
      title: 'Renters insurance not on file',
      meta: 'Upload your policy so we have it if something happens.',
      tone: 'neutral',
      label: 'Upload',
      href: '#documents',
    });
  }

  return items;
}

export type ActivityItem = {
  id: string;
  date: Date;
  title: string;
  meta: string;
  tag: string;
  tone: Tone;
};

export function tenantActivity(input: { payments: Payment[]; maintenanceRequests: MaintenanceRequest[]; limit?: number }): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const payment of input.payments) {
    const date = normalizeDate(payment.paidAt) ?? normalizeDate(payment.dueDate);
    if (!date) continue;
    const paid = ['paid', 'completed', 'succeeded'].includes(String(payment.status));
    items.push({
      id: `pay-${payment.id}`,
      date,
      title: paid ? `Rent payment received, ${formatMoney(payment.amount, { cents: true })}` : `Payment ${payment.status}, ${formatMoney(payment.amount, { cents: true })}`,
      meta: payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : payment.description || '',
      tag: 'Payment',
      tone: paid ? 'success' : 'warning',
    });
  }

  for (const request of input.maintenanceRequests) {
    const created = normalizeDate(request.createdAt);
    if (created) {
      items.push({
        id: `mnt-${request.id}-created`,
        date: created,
        title: `You reported: ${request.title}`,
        meta: request.category ? `${request.category}${request.priority ? ` · ${request.priority} priority` : ''}` : '',
        tag: 'Maintenance',
        tone: 'info',
      });
    }
    const updated = normalizeDate(request.updatedAt);
    if (updated && created && updated.getTime() - created.getTime() > 60_000 && request.status !== 'submitted') {
      items.push({
        id: `mnt-${request.id}-${request.status}`,
        date: updated,
        title: `${request.title}: ${request.status.replace('_', ' ')}`,
        meta: request.adminNotes || '',
        tag: 'Maintenance',
        tone: request.status === 'completed' ? 'success' : 'info',
      });
    }
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, input.limit ?? 5);
}

// -------------------------------------------------------------- landlord --

export type Decision = {
  id: string;
  kind: 'estimate' | 'late-rent' | 'vacant' | 'expense';
  title: string;
  meta: string;
  tone: Tone;
  actionLabel: string;
  href: string;
};

export type PropertyRow = {
  propertyId: string;
  name: string;
  tenantName: string;
  rent: number;
  monthStatus: 'paid' | 'late' | 'due' | 'vacant';
  monthLabel: string;
  leaseEnd: Date | null;
  openWork: number;
};

export type LandlordMonth = {
  collected: number;
  expected: number;
  collectionRate: number;
  expensesThisMonth: number;
  net: number;
  nextPayout: { amount: number; date: Date | null } | null;
  occupied: number;
  total: number;
  decisions: Decision[];
  rows: PropertyRow[];
};

type ExpenseLike = FinancialRecord & { description?: string; vendor?: string; propertyName?: string };

function isCompletedRent(entry: FinancialRecord): boolean {
  return entry.type === 'payment' && entry.category === 'rent' && ['completed', 'paid', 'succeeded'].includes(entry.status);
}

function isPaidExpense(entry: FinancialRecord): boolean {
  return ['paid', 'reimbursed'].includes(entry.status);
}

export function monthlyNet(ledger: FinancialRecord[], expenses: FinancialRecord[], now: Date, months = 6): { label: string; month: Date; value: number }[] {
  const out: { label: string; month: Date; value: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let cents = 0;
    for (const entry of ledger) {
      if (!isCompletedRent(entry)) continue;
      const date = normalizeDate(entry.date);
      if (date && sameMonth(date, month)) cents += Math.abs(moneyToCents(entry.amount));
    }
    for (const entry of expenses) {
      if (!isPaidExpense(entry)) continue;
      const date = normalizeDate(entry.paidDate ?? entry.date);
      if (date && sameMonth(date, month)) cents -= moneyToCents(entry.amount);
    }
    out.push({ label: month.toLocaleDateString('en-US', { month: 'short' }), month, value: cents / 100 });
  }
  return out;
}

export function landlordMonth(input: {
  properties: Property[];
  leases: Lease[];
  ledger: FinancialRecord[];
  expenses: ExpenseLike[];
  payouts: Payout[];
  maintenanceRequests: MaintenanceRequest[];
  now?: Date;
}): LandlordMonth {
  const now = input.now ?? new Date();
  const activeLeases = input.leases.filter((lease) => lease.isActive && lease.status === 'active');
  const leaseByProperty = new Map<string, Lease>();
  for (const lease of activeLeases) {
    if (!leaseByProperty.has(lease.propertyId)) leaseByProperty.set(lease.propertyId, lease);
  }

  const paidThisMonthByProperty = new Map<string, number>();
  let collectedCents = 0;
  for (const entry of input.ledger) {
    if (!isCompletedRent(entry)) continue;
    const date = normalizeDate(entry.date);
    if (!date || !sameMonth(date, now)) continue;
    const cents = Math.abs(moneyToCents(entry.amount));
    collectedCents += cents;
    paidThisMonthByProperty.set(entry.propertyId, (paidThisMonthByProperty.get(entry.propertyId) ?? 0) + cents);
  }

  let expenseCents = 0;
  for (const entry of input.expenses) {
    if (!isPaidExpense(entry)) continue;
    const date = normalizeDate(entry.paidDate ?? entry.date);
    if (date && sameMonth(date, now)) expenseCents += moneyToCents(entry.amount);
  }

  const expectedCents = activeLeases.reduce((sum, lease) => sum + moneyToCents(lease.monthlyRent || lease.rentAmount || 0), 0);

  const scheduled = input.payouts
    .filter((payout) => payout.status === 'scheduled')
    .map((payout) => ({ amount: payout.netAmount, date: normalizeDate(payout.scheduledDate) }))
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  const openByProperty = new Map<string, number>();
  for (const request of input.maintenanceRequests) {
    if (isOpenRequest(request)) openByProperty.set(request.propertyId, (openByProperty.get(request.propertyId) ?? 0) + 1);
  }

  const decisions: Decision[] = [];
  const rows: PropertyRow[] = [];

  for (const property of input.properties) {
    const lease = leaseByProperty.get(property.id) ?? null;
    const rent = lease?.monthlyRent || lease?.rentAmount || property.defaultRentAmount || property.rent || 0;
    const name = property.name || shortAddress(property.address, 'Property');
    let monthStatus: PropertyRow['monthStatus'] = 'vacant';
    let monthLabel = 'Vacant';

    if (lease) {
      const paidCents = paidThisMonthByProperty.get(property.id) ?? 0;
      const dueDay = lease.paymentDueDay || 1;
      const grace = lease.lateFeeGraceDays ?? lease.lateFeeConfig?.gracePeriodDays ?? 0;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      const daysLate = daysBetween(dueDate, now) - grace;
      if (paidCents >= moneyToCents(rent) && rent > 0) {
        monthStatus = 'paid';
        monthLabel = 'Paid';
      } else if (daysLate > 0) {
        monthStatus = 'late';
        monthLabel = `${daysLate} day${daysLate === 1 ? '' : 's'} late`;
        decisions.push({
          id: `late-${property.id}`,
          kind: 'late-rent',
          title: `Rent ${monthLabel.toLowerCase()}: ${formatMoney(rent - paidCents / 100)}`,
          meta: `${name}${lease.tenantName ? ` · ${lease.tenantName}` : ''}${paidCents > 0 ? ` · ${formatMoney(paidCents / 100)} paid so far` : ''}`,
          tone: 'error',
          actionLabel: 'View ledger',
          href: `/landlord/properties/${property.id}`,
        });
      } else {
        monthStatus = 'due';
        monthLabel = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
    } else {
      decisions.push({
        id: `vacant-${property.id}`,
        kind: 'vacant',
        title: `${name} is vacant`,
        meta: rent ? `Target rent ${formatMoney(rent)} per month` : 'No target rent set',
        tone: 'info',
        actionLabel: 'See property',
        href: `/landlord/properties/${property.id}`,
      });
    }

    rows.push({
      propertyId: property.id,
      name,
      tenantName: lease?.tenantName || (lease ? 'Tenant' : 'Vacant'),
      rent,
      monthStatus,
      monthLabel,
      leaseEnd: normalizeDate(lease?.endDate),
      openWork: openByProperty.get(property.id) ?? 0,
    });
  }

  for (const request of input.maintenanceRequests) {
    if (!isOpenRequest(request) || !request.estimatedCost || request.actualCost) continue;
    decisions.unshift({
      id: `estimate-${request.id}`,
      kind: 'estimate',
      title: `Approve repair estimate: ${formatMoney(request.estimatedCost)} ${request.title.toLowerCase()}`,
      meta: `${request.propertyName || shortAddress(input.properties.find((p) => p.id === request.propertyId)?.address, 'Property')}${request.assignedVendorName ? ` · Quote from ${request.assignedVendorName}` : ''}`,
      tone: 'warning',
      actionLabel: 'Review',
      href: '/landlord/maintenance',
    });
  }

  for (const expense of input.expenses) {
    if (expense.status !== 'pending') continue;
    decisions.push({
      id: `expense-${expense.id ?? expense.propertyId}-${expense.amount}`,
      kind: 'expense',
      title: `Pending expense: ${formatMoney(expense.amount)}${expense.description ? ` ${expense.description}` : ''}`,
      meta: [expense.propertyName, expense.vendor].filter(Boolean).join(' · ') || 'Awaiting approval',
      tone: 'neutral',
      actionLabel: 'Review',
      href: '/landlord/expenses',
    });
  }

  const order: PropertyRow['monthStatus'][] = ['late', 'due', 'vacant', 'paid'];
  rows.sort((a, b) => order.indexOf(a.monthStatus) - order.indexOf(b.monthStatus) || a.name.localeCompare(b.name));

  return {
    collected: collectedCents / 100,
    expected: expectedCents / 100,
    collectionRate: expectedCents > 0 ? Math.round((collectedCents / expectedCents) * 100) : 0,
    expensesThisMonth: expenseCents / 100,
    net: (collectedCents - expenseCents) / 100,
    nextPayout: scheduled[0] ?? null,
    occupied: input.properties.filter((property) => leaseByProperty.has(property.id)).length,
    total: input.properties.length,
    decisions,
    rows,
  };
}

// ----------------------------------------------------------------- admin --

export function averageDaysToClose(requests: MaintenanceRequest[]): number | null {
  const durations: number[] = [];
  for (const request of requests) {
    if (request.status !== 'completed') continue;
    const created = normalizeDate(request.createdAt);
    const closed = normalizeDate(request.updatedAt);
    if (created && closed && closed >= created) durations.push((closed.getTime() - created.getTime()) / DAY_MS);
  }
  if (durations.length === 0) return null;
  return Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 10) / 10;
}

export function requestAge(request: Pick<MaintenanceRequest, 'createdAt'>, now = new Date()): string {
  const created = normalizeDate(request.createdAt);
  if (!created) return '';
  const hours = Math.max(0, Math.round((now.getTime() - created.getTime()) / (60 * 60 * 1000)));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function leasesEndingWithin(leases: Lease[], days: number, now = new Date()): Lease[] {
  return leases
    .filter((lease) => lease.isActive && lease.status === 'active')
    .filter((lease) => {
      const end = normalizeDate(lease.endDate);
      if (!end) return false;
      const left = daysBetween(now, end);
      return left >= 0 && left <= days;
    })
    .sort((a, b) => (normalizeDate(a.endDate)?.getTime() ?? 0) - (normalizeDate(b.endDate)?.getTime() ?? 0));
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortOpenWorkOrders(requests: MaintenanceRequest[]): MaintenanceRequest[] {
  return requests
    .filter(isOpenRequest)
    .sort((a, b) => {
      const pa = PRIORITY_RANK[String(a.priority).toLowerCase()] ?? 9;
      const pb = PRIORITY_RANK[String(b.priority).toLowerCase()] ?? 9;
      if (pa !== pb) return pa - pb;
      return (normalizeDate(a.createdAt)?.getTime() ?? 0) - (normalizeDate(b.createdAt)?.getTime() ?? 0);
    });
}
