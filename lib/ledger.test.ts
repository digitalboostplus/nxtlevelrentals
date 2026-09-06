import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalance, moneyToCents, oldestUnpaidDate } from './ledger';

test('balances include signed adjustments and only settled credits', () => {
  assert.equal(calculateBalance([
    { type: 'charge', amount: 1000, status: 'pending' },
    { type: 'adjustment', amount: 50, status: 'completed' },
    { type: 'adjustment', amount: -75, status: 'completed' },
    { type: 'payment', amount: 900, status: 'completed' },
    { type: 'payment', amount: 500, status: 'processing' },
    { type: 'payment', amount: 500, status: 'failed' },
    { type: 'credit', amount: 25, status: 'completed' }
  ]), 50);
});
test('empty balances, overpayment and cents remain exact', () => {
  assert.equal(calculateBalance([]), 0);
  assert.equal(calculateBalance([{ type: 'payment', amount: -20, status: 'completed' }]), -20);
  assert.equal(calculateBalance([0.1, 0.2].map(amount => ({ type: 'charge', amount, status: 'pending' }))), 0.3);
  for (const bad of [NaN, Infinity, 0.001]) assert.throws(() => moneyToCents(bad));
});
test('credits pay the oldest obligation first', () => {
  const due = oldestUnpaidDate([
    { type: 'charge', amount: 100, status: 'pending', date: '2026-01-01' },
    { type: 'charge', amount: 100, status: 'pending', date: '2026-02-01' },
    { type: 'payment', amount: 150, status: 'completed' }
  ]);
  assert.equal(due?.getMonth(), 1);
});
