import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerStatement } from './ownerFinancials';
const now = new Date('2026-09-05T12:00:00Z');
const payment = (amount: number, date: string, propertyId = 'a') => ({ amount, date, propertyId, type: 'payment', category: 'rent', status: 'completed' });
const expense = (amount: number, date: string, propertyId = 'a') => ({ amount, date, propertyId, category: 'repair', status: 'paid' });
test('periods, statuses, categories and property breakdown reconcile exactly', () => {
  const ledger = [payment(1000, '2026-08-01'), payment(700, '2026-09-01', 'b'), payment(100, '2025-12-31'),
    { ...payment(500, '2026-08-01'), status: 'failed' }, { ...payment(300, '2026-08-01'), category: 'deposit' }];
  const expenses = [expense(100, '2026-08-02'), { ...expense(70, '2026-09-02', 'b'), category: 'management_fee' },
    { ...expense(400, '2026-08-03'), status: 'approved' }, { ...expense(800, '2026-08-03'), status: 'rejected' }];
  const ytd = ownerStatement(ledger, expenses, 'year-to-date', now);
  assert.equal(ytd.rent, 1700); assert.equal(ytd.totalExpenses, 170); assert.equal(ytd.net, 1530);
  assert.equal(Object.values(ytd.categories).reduce((a, b) => a + b, 0), ytd.totalExpenses);
  assert.equal(Object.values(ytd.byProperty).reduce((a, b) => a + b.net, 0), ytd.net);
  const last = ownerStatement(ledger, expenses, 'last-month', now);
  assert.equal(last.rent, 1000); assert.equal(last.totalExpenses, 100);
  assert.equal(ownerStatement(ledger, expenses, 'all-time', now).rent, 1800);
});
test('January boundary, paid date, cents and invalid records', () => {
  const data = ownerStatement([payment(0.1, '2025-12-01'), payment(0.2, '2026-01-01')], [{ ...expense(0.02, '2025-11-01'), paidDate: '2025-12-31' }], 'last-month', new Date('2026-01-05'));
  assert.equal(data.rent, 0.1); assert.equal(data.net, 0.08);
  assert.throws(() => ownerStatement([payment(1, 'invalid')], [], 'all-time', now));
  assert.throws(() => ownerStatement([payment(1, '2026-02-30')], [], 'all-time', now));
  assert.throws(() => ownerStatement([], [expense(NaN, '2026-01-01')], 'all-time', now));
  assert.equal(ownerStatement([], [{ ...expense(10, '2026-01-01', '__proto__'), category: 'constructor' }], 'all-time', now).categories.constructor, 10);
});
