import { moneyToCents } from './ledger';

export type OwnerPeriod = 'year-to-date' | 'last-month' | 'all-time';
export interface FinancialRecord {
  id?: string;
  propertyId: string;
  amount: number;
  status: string;
  type?: string;
  category?: string;
  expenseType?: string;
  date?: unknown;
  paidDate?: unknown;
}

// Statements use UTC calendar boundaries in every browser and on the server.
export function statementDate(value: unknown): Date {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return statementDate(value.toDate());
  const date = value instanceof Date ? value : new Date(value as string);
  if (value == null || !Number.isFinite(date.getTime())) throw new Error('A posted financial record has no valid date');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value) throw new Error('A posted financial record has an invalid calendar date');
  return date;
}

export function ownerStatement(ledger: FinancialRecord[], expenses: FinancialRecord[], period: OwnerPeriod, now = new Date()) {
  const start = period === 'year-to-date' ? Date.UTC(now.getUTCFullYear(), 0, 1)
    : period === 'last-month' ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1) : -Infinity;
  const end = period === 'last-month' ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) : now.getTime() + 1;
  const inPeriod = (value: unknown) => { const time = statementDate(value).getTime(); return time >= start && time < end; };
  const byProperty: Record<string, { rent: number; expenses: number; fees: number; net: number }> = Object.create(null);
  const categories: Record<string, number> = Object.create(null);
  let rent = 0, operating = 0, fees = 0;
  const row = (id: string) => byProperty[id] ||= { rent: 0, expenses: 0, fees: 0, net: 0 };
  for (const e of ledger) {
    if (e.type !== 'payment' || e.category !== 'rent' || !['completed', 'paid', 'succeeded'].includes(e.status)) continue;
    if (!inPeriod(e.date)) continue;
    const cents = Math.abs(moneyToCents(e.amount));
    rent += cents; row(e.propertyId).rent += cents;
  }
  for (const e of expenses) {
    if (!['paid', 'reimbursed'].includes(e.status)) continue;
    if (!inPeriod(e.paidDate || e.date)) continue;
    const cents = moneyToCents(e.amount);
    if (cents < 0) throw new Error('A paid expense has a negative amount');
    const isFee = e.expenseType === 'management_fee' || e.category === 'management_fee';
    if (isFee) { fees += cents; row(e.propertyId).fees += cents; }
    else { operating += cents; row(e.propertyId).expenses += cents; }
    const category = isFee ? 'management_fee' : e.category || e.expenseType || 'other';
    categories[category] = (categories[category] || 0) + cents;
  }
  for (const data of Object.values(byProperty)) {
    data.net = data.rent - data.expenses - data.fees;
    for (const key of ['rent', 'expenses', 'fees', 'net'] as const) data[key] /= 100;
  }
  for (const key of Object.keys(categories)) categories[key] /= 100;
  return { rent: rent / 100, operatingExpenses: operating / 100, managementFees: fees / 100,
    totalExpenses: (operating + fees) / 100, net: (rent - operating - fees) / 100, categories, byProperty };
}
