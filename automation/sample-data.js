// Realistic sample dataset for demo mode and tests.
//
// Dates are computed relative to `today` so the demo queue is always alive no
// matter when you open it, and tests can pin `today` for determinism. The cast
// covers the edge cases the engine must handle: rent due soon / today / late
// at each step / already paid, onboarding mid-sequence, renewals at 90/60/30
// days, month-to-month (no lease end), inactive lease, a tenant with no email,
// a tenant with no GHL contact id, and maintenance in every state.

'use strict';

const { addDays, periodOf, dueDateForPeriod } = require('./engine');

function buildSampleData(today) {
  const period = periodOf(today);
  const dueThisMonth = dueDateForPeriod(period, 1);

  const tenants = [
    {
      id: 't-alice', displayName: 'Alice Nguyen', email: 'alice@example.com',
      phoneNumber: '+15550100001', ghlContactId: 'ghl-alice',
      address: '128 Maple St, Unit A', unit: 'Unit A', monthlyRent: 1450,
      leaseStart: addDays(today, -400), leaseEnd: addDays(today, 320), isLeaseActive: true,
      // dueDay override set in demo settings: rent due in 2 days -> upcoming reminder
    },
    {
      id: 't-bruno', displayName: 'Bruno Silva', email: 'bruno@example.com',
      phoneNumber: '+15550100002', ghlContactId: 'ghl-bruno',
      address: '128 Maple St, Unit B', unit: 'Unit B', monthlyRent: 1500,
      leaseStart: addDays(today, -200), leaseEnd: addDays(today, 165), isLeaseActive: true,
      // dueDay = today's day -> rent due today
    },
    {
      id: 't-carmen', displayName: 'Carmen Ortiz', email: 'carmen@example.com',
      phoneNumber: '+15550100003', ghlContactId: 'ghl-carmen',
      address: '74 Birch Ave', unit: '74 Birch Ave', monthlyRent: 1875,
      leaseStart: addDays(today, -500), leaseEnd: null, isLeaseActive: true, // month-to-month
      // due on the 1st, 4 days ago -> first late notice (assuming today >= 5th; tests pin the date)
    },
    {
      id: 't-dmitri', displayName: 'Dmitri Volkov', email: 'dmitri@example.com',
      phoneNumber: '+15550100004', ghlContactId: 'ghl-dmitri',
      address: '9 Cedar Ct, Unit 2', unit: 'Unit 2', monthlyRent: 1200,
      leaseStart: addDays(today, -300), leaseEnd: addDays(today, 58), isLeaseActive: true,
      // 15 days late -> final notice; lease ends in 58 days -> renewal follow-up too
    },
    {
      id: 't-erin', displayName: 'Erin Walsh', email: 'erin@example.com',
      phoneNumber: '+15550100005', ghlContactId: 'ghl-erin',
      address: '128 Maple St, Unit C', unit: 'Unit C', monthlyRent: 1450,
      leaseStart: addDays(today, -100), leaseEnd: addDays(today, 265), isLeaseActive: true,
      // paid this month (payment record below) -> no rent item
    },
    {
      id: 't-farah', displayName: 'Farah Haddad', email: 'farah@example.com',
      phoneNumber: '+15550100006', ghlContactId: 'ghl-farah',
      address: '31 Oak Ln', unit: '31 Oak Ln', monthlyRent: 2100,
      leaseStart: addDays(today, 3), leaseEnd: addDays(today, 368), isLeaseActive: true,
      // lease starts in 3 days -> welcome (day -7, catch-up) + portal setup (day -3) due
    },
    {
      id: 't-gus', displayName: 'Gus Peterson', email: 'gus@example.com',
      phoneNumber: '+15550100007', ghlContactId: 'ghl-gus',
      address: '9 Cedar Ct, Unit 1', unit: 'Unit 1', monthlyRent: 1150,
      leaseStart: addDays(today, -720), leaseEnd: addDays(today, 85), isLeaseActive: true,
      // lease ends in 85 days -> renewal offer; rent paid (marked below)
    },
    {
      id: 't-hana', displayName: 'Hana Kim', email: 'hana@example.com',
      phoneNumber: '', ghlContactId: 'ghl-hana',
      address: '128 Maple St, Unit D', unit: 'Unit D', monthlyRent: 1400,
      leaseStart: addDays(today, -650), leaseEnd: addDays(today, 25), isLeaseActive: true,
      // lease ends in 25 days -> move-out notice; no phone -> email only
    },
    {
      id: 't-ivan', displayName: 'Ivan Petrov', email: 'ivan@example.com',
      phoneNumber: '+15550100009', ghlContactId: null,
      address: '55 Pine Rd', unit: '55 Pine Rd', monthlyRent: 1650,
      leaseStart: addDays(today, -30), leaseEnd: addDays(today, 335), isLeaseActive: true,
      // no GHL contact id -> live send must resolve by email (or fail gracefully)
    },
    {
      id: 't-june', displayName: 'June Baker', email: 'june@example.com',
      phoneNumber: '+15550100010', ghlContactId: 'ghl-june',
      address: '2 Elm St', unit: '2 Elm St', monthlyRent: 1300,
      leaseStart: addDays(today, -900), leaseEnd: addDays(today, -60), isLeaseActive: false,
      // former tenant, inactive lease -> nothing should be generated
    },
  ];

  const maintenance = [
    {
      id: 'm-1001', tenantId: 't-alice', propertyId: 'p-maple',
      title: 'Kitchen faucet dripping', description: 'Steady drip from the kitchen faucet, getting worse over the week.',
      priority: 'medium', category: 'plumbing', status: 'submitted',
      createdAt: today, updatedAt: today,
    },
    {
      id: 'm-1002', tenantId: 't-carmen', propertyId: 'p-birch',
      title: 'AC not cooling', description: 'AC runs but blows warm air. It is very hot this week.',
      priority: 'high', category: 'hvac', status: 'in_progress',
      createdAt: addDays(today, -9), updatedAt: addDays(today, -6),
      // in progress, stale for 6 days -> tenant check-in nudge
    },
    {
      id: 'm-1003', tenantId: 't-erin', propertyId: 'p-maple',
      title: 'Bedroom window latch broken', description: 'Latch does not close fully.',
      priority: 'low', category: 'general', status: 'completed',
      createdAt: addDays(today, -12), updatedAt: addDays(today, -1),
      // completed yesterday -> completion/feedback message
    },
    {
      id: 'm-1004', tenantId: 't-june', propertyId: 'p-elm',
      title: 'Old request from former tenant', description: 'Should be ignored: tenant filtered out.',
      priority: 'low', category: 'general', status: 'submitted',
      createdAt: addDays(today, -90), updatedAt: addDays(today, -90),
    },
  ];

  const payments = [
    {
      id: 'pay-1', tenantId: 't-erin', type: 'rent', status: 'paid',
      amount: 1450, dueDate: dueThisMonth, paidAt: addDays(dueThisMonth, -1),
    },
    {
      id: 'pay-2', tenantId: 't-dmitri', type: 'rent', status: 'failed',
      amount: 1200, dueDate: dueThisMonth, // failed payment must NOT suppress reminders
    },
  ];

  // Demo settings: per-tenant due days that exercise each rent stage no matter
  // what today's calendar date is.
  const dayOf = (dateStr) => Number(dateStr.slice(8, 10));
  const settings = {
    companyName: 'Next Level Rentals',
    managerName: 'Jordan (Property Manager)',
    replyEmail: 'hello@nxtlevelrentals.com',
    replyPhone: '(555) 010-9900',
    portalUrl: 'https://rental-tracker-app-2026.web.app/portal',
    vendors: [
      { name: 'Mike @ RapidFlow Plumbing', trade: 'plumbing', email: 'mike@rapidflow.example', phone: '+15550200001' },
      { name: 'CoolAir HVAC', trade: 'hvac', email: 'dispatch@coolair.example', phone: '+15550200002' },
      { name: 'Handy Hank', trade: 'general', email: 'hank@handy.example', phone: '+15550200003' },
    ],
    tenantOverrides: {
      't-alice': { dueDay: dayOf(addDays(today, 2)) },   // due in 2 days -> upcoming
      't-bruno': { dueDay: dayOf(today) },               // due today
      't-carmen': { dueDay: dayOf(addDays(today, -4)) }, // 4 days late -> late-1
      't-dmitri': { dueDay: dayOf(addDays(today, -15)) },// 15 days late -> late-3
      't-gus': { dueDay: dayOf(addDays(today, -20)) },   // long past due but marked paid below
    },
  };

  // Pre-seeded log: Gus's rent marked paid (for the period his due date falls
  // in, which may be last month); Farah's welcome already sent.
  const gusPeriod = periodOf(addDays(today, -20));
  const log = [
    { key: `paid|t-gus|${gusPeriod}`, action: 'paid', at: today },
    { key: `onboard|t-farah|${addDays(today, 3)}|onboard-welcome`, action: 'sent', at: addDays(today, -3) },
  ];

  return { tenants, maintenance, payments, settings, log };
}

module.exports = { buildSampleData };
