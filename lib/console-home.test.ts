import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageDaysToClose,
  formatPropertyAddress,
  landlordMonth,
  leasesEndingWithin,
  monthlyNet,
  requestAge,
  sortOpenWorkOrders,
  tenantActivity,
  tenantAttentionItems,
} from './console-home';
import type { Lease, MaintenanceRequest, Payment, Property } from '@/types/schema';

const now = new Date(2026, 8, 6, 9, 0, 0); // Sep 6, 2026, 9am

const property = (id: string, name: string, rent = 1000): Property =>
  ({ id, name, address: { street: name, city: 'Kansas City', state: 'MO', zipCode: '64131' }, status: 'occupied', rent }) as unknown as Property;

const lease = (propertyId: string, overrides: Partial<Lease> = {}): Lease =>
  ({
    id: `lease-${propertyId}`,
    propertyId,
    tenantId: `tenant-${propertyId}`,
    tenantName: `Tenant ${propertyId}`,
    landlordId: 'owner',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRent: 1000,
    securityDeposit: 1000,
    paymentDueDay: 1,
    isActive: true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }) as Lease;

const request = (overrides: Partial<MaintenanceRequest>): MaintenanceRequest =>
  ({
    id: 'r1',
    tenantId: 't',
    propertyId: 'p1',
    title: 'Dishwasher leak',
    description: '',
    priority: 'medium',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }) as MaintenanceRequest;

test('formatPropertyAddress handles string and object addresses', () => {
  assert.equal(formatPropertyAddress('1622 E 89th Ter, Kansas City, MO'), '1622 E 89th Ter, Kansas City, MO');
  assert.equal(formatPropertyAddress({ street: '1622 E 89th Ter', city: 'Kansas City', state: 'MO', zipCode: '64132' }), '1622 E 89th Ter, Kansas City, MO 64132');
  assert.equal(formatPropertyAddress(undefined), '');
});

test('tenantAttentionItems surfaces balance, open repairs, lease end and missing insurance', () => {
  const items = tenantAttentionItems({
    maintenanceRequests: [request({ status: 'in_progress', scheduledDate: '2026-09-09', scheduledTime: '10am to 12pm' })],
    lease: lease('p1', { endDate: '2026-10-31' }),
    hasRentersInsurance: false,
    currentBalance: 1450,
    nextDueDate: new Date(2026, 8, 1),
    now,
  });
  assert.deepEqual(
    items.map((item) => item.kind),
    ['balance', 'maintenance', 'lease', 'insurance']
  );
  assert.equal(items[0].tone, 'error'); // 5 days past due
  assert.match(items[1].meta, /Scheduled Wed, Sep 9, 10am to 12pm/);
  assert.equal(items[2].label, '55 days');
});

test('tenantAttentionItems is empty when everything is in order', () => {
  const items = tenantAttentionItems({
    maintenanceRequests: [request({ status: 'completed' })],
    lease: lease('p1', { endDate: '2027-08-31' }),
    hasRentersInsurance: true,
    currentBalance: 0,
    nextDueDate: null,
    now,
  });
  assert.deepEqual(items, []);
});

test('tenantActivity merges payments and maintenance newest first', () => {
  const payments = [
    { id: 'a', amount: 1450, status: 'paid', paidAt: new Date(2026, 8, 1), paymentMethod: 'bank_account' },
    { id: 'b', amount: 1450, status: 'paid', paidAt: new Date(2026, 7, 1) },
  ] as unknown as Payment[];
  const items = tenantActivity({
    payments,
    maintenanceRequests: [request({ createdAt: new Date(2026, 8, 2), updatedAt: new Date(2026, 8, 4), status: 'in_progress' })],
  });
  assert.deepEqual(
    items.map((item) => item.title),
    ['Dishwasher leak: in progress', 'You reported: Dishwasher leak', 'Rent payment received, $1,450.00', 'Rent payment received, $1,450.00']
  );
  assert.equal(items[2].meta, 'bank account');
});

test('landlordMonth classifies paid, late, due and vacant homes and builds decisions', () => {
  const properties = [property('p1', 'Paid House'), property('p2', 'Late House'), property('p3', 'Vacant House', 1300), property('p4', 'Grace House')];
  const leases = [lease('p1'), lease('p2'), lease('p4', { paymentDueDay: 1, lateFeeGraceDays: 10 })];
  const ledger = [
    { propertyId: 'p1', amount: 1000, status: 'completed', type: 'payment', category: 'rent', date: '2026-09-02' },
    { propertyId: 'p2', amount: 1000, status: 'completed', type: 'payment', category: 'rent', date: '2026-08-01' }, // last month, not this one
  ];
  const expenses = [
    { id: 'e1', propertyId: 'p1', amount: 250, status: 'paid', category: 'repair', date: '2026-09-03', description: 'faucet', vendor: 'Plumber' },
    { id: 'e2', propertyId: 'p1', amount: 900, status: 'pending', category: 'repair', date: '2026-09-04', description: 'roof patch' },
  ];
  const result = landlordMonth({
    properties,
    leases,
    ledger,
    expenses,
    payouts: [{ id: 'po', landlordId: 'owner', amount: 700, netAmount: 700, status: 'scheduled', scheduledDate: '2026-09-15' }] as any,
    maintenanceRequests: [request({ propertyId: 'p2', estimatedCost: 680, assignedVendorName: 'Ace Plumbing', title: 'Water heater' })],
    now,
  });

  assert.equal(result.collected, 1000);
  assert.equal(result.expected, 3000);
  assert.equal(result.collectionRate, 33);
  assert.equal(result.expensesThisMonth, 250);
  assert.equal(result.net, 750);
  assert.equal(result.nextPayout?.amount, 700);
  assert.equal(result.occupied, 3);
  assert.equal(result.total, 4);

  const byId = Object.fromEntries(result.rows.map((row) => [row.propertyId, row]));
  assert.equal(byId.p1.monthStatus, 'paid');
  assert.equal(byId.p2.monthStatus, 'late');
  assert.equal(byId.p2.monthLabel, '5 days late');
  assert.equal(byId.p3.monthStatus, 'vacant');
  assert.equal(byId.p4.monthStatus, 'due'); // inside the 10-day grace window
  assert.equal(byId.p2.openWork, 1);

  assert.deepEqual(
    result.decisions.map((d) => d.kind),
    ['estimate', 'late-rent', 'vacant', 'expense']
  );
  assert.match(result.decisions[0].title, /\$680 water heater/);
  assert.match(result.decisions[0].meta, /Ace Plumbing/);
  assert.equal(result.rows[0].monthStatus, 'late'); // late rows sort first
});

test('monthlyNet returns one bar per month, rent minus paid expenses', () => {
  const ledger = [
    { propertyId: 'p1', amount: 1000, status: 'completed', type: 'payment', category: 'rent', date: '2026-09-02' },
    { propertyId: 'p1', amount: 1000, status: 'completed', type: 'payment', category: 'rent', date: '2026-07-02' },
    { propertyId: 'p1', amount: 1000, status: 'pending', type: 'payment', category: 'rent', date: '2026-08-02' },
  ];
  const expenses = [{ propertyId: 'p1', amount: 300, status: 'paid', date: '2026-07-10' }];
  const series = monthlyNet(ledger, expenses, now, 3);
  assert.deepEqual(series.map((s) => s.label), ['Jul', 'Aug', 'Sep']);
  assert.deepEqual(series.map((s) => s.value), [700, 0, 1000]);
});

test('admin helpers: average days to close, request age, leases ending, work order sort', () => {
  const completed = [
    request({ id: 'c1', status: 'completed', createdAt: new Date(2026, 8, 1), updatedAt: new Date(2026, 8, 4) }),
    request({ id: 'c2', status: 'completed', createdAt: new Date(2026, 8, 1), updatedAt: new Date(2026, 8, 6) }),
    request({ id: 'o1', status: 'submitted' }),
  ];
  assert.equal(averageDaysToClose(completed), 4);
  assert.equal(averageDaysToClose([]), null);

  assert.equal(requestAge(request({ createdAt: new Date(2026, 8, 6, 7) }), now), '2 hours');
  assert.equal(requestAge(request({ createdAt: new Date(2026, 8, 3, 9) }), now), '3 days');

  const ending = leasesEndingWithin([lease('a', { endDate: '2026-11-30' }), lease('b', { endDate: '2027-06-30' }), lease('c', { endDate: '2026-10-15' })], 120, now);
  assert.deepEqual(ending.map((l) => l.propertyId), ['c', 'a']);

  const sorted = sortOpenWorkOrders([
    request({ id: 'low', priority: 'low', createdAt: new Date(2026, 8, 1) }),
    request({ id: 'high-new', priority: 'high', createdAt: new Date(2026, 8, 5) }),
    request({ id: 'high-old', priority: 'high', createdAt: new Date(2026, 8, 2) }),
    request({ id: 'done', priority: 'urgent', status: 'completed' }),
  ]);
  assert.deepEqual(sorted.map((r) => r.id), ['high-old', 'high-new', 'low']);
});
