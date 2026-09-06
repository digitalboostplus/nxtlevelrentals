import { test, expect, type Page } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Renders the three console home screens (tenant, landlord, admin) against
// seeded emulator data and captures a screenshot of each to .agent-artifacts/.
const projectId = 'demo-nlr-integrity';
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== projectId || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Demo emulators only');
const app = initializeApp({ projectId }, 'home-screens'); const db = getFirestore(app); const auth = getAuth(app);
const password = 'Emulator-only-123!';

async function login(page: Page, role: string, next: string) {
  await page.goto(`/login/?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email address').fill(`browser-${role}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

test.beforeAll(async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 3);

  for (const role of ['tenant', 'admin', 'landlord']) {
    const uid = `browser-${role}`;
    await auth.createUser({ uid, email: `${uid}@example.com`, password }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
    await db.doc(`users/${uid}`).set({ role, email: `${uid}@example.com`, displayName: `Browser ${role}`, propertyIds: ['browser-property'] }, { merge: true });
  }
  await db.doc('properties/browser-property').set({ name: 'Browser Property', address: '123 Emulator St', landlordId: 'browser-landlord', status: 'occupied', available: false, units: [], rent: 1200, createdAt: new Date(), images: [] }, { merge: true });
  await db.doc('properties/browser-vacant').set({ name: 'Browser Vacant', address: '456 Emulator Ave', landlordId: 'browser-landlord', status: 'vacant', available: true, units: [], rent: 1300, createdAt: new Date(), images: [] });
  await db.doc('landlords/browser-landlord').set({ managementFee: { type: 'percentage', amount: 8 } }, { merge: true });

  await db.doc('leases/browser-lease').set({
    propertyId: 'browser-property', tenantId: 'browser-tenant', tenantName: 'Browser tenant', landlordId: 'browser-landlord',
    startDate: daysFromNow(-300), endDate: daysFromNow(60), monthlyRent: 1200, securityDeposit: 1200, paymentDueDay: 1,
    isActive: true, status: 'active', documents: [], createdAt: new Date(), updatedAt: new Date(),
  });

  // This month's rent is charged and unpaid; last month's was paid.
  await db.doc('ledger/browser-charge-now').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', landlordId: 'browser-landlord', type: 'charge', category: 'rent', amount: 1200, status: 'pending', date: monthStart, dueDate: monthStart, description: 'Monthly rent', createdAt: new Date() });
  await db.doc('ledger/browser-charge-last').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', landlordId: 'browser-landlord', type: 'charge', category: 'rent', amount: 1200, status: 'completed', date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1), description: 'Monthly rent', createdAt: new Date() });
  await db.doc('ledger/browser-payment-last').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', landlordId: 'browser-landlord', type: 'payment', category: 'rent', amount: 1200, status: 'completed', date: lastMonth, paymentMethod: 'ach', description: 'Rent payment', createdAt: new Date() });
  await db.doc('payments/browser-payment-last').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', landlordId: 'browser-landlord', amount: 1200, status: 'paid', type: 'rent', dueDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1), paidDate: lastMonth, paymentMethod: 'ach', createdAt: lastMonth });

  await db.doc('maintenanceRequests/browser-open').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', propertyName: 'Browser Property', title: 'Dishwasher leak', description: 'Leaking under the sink', category: 'Plumbing', priority: 'medium', status: 'in_progress', scheduledDate: daysFromNow(3), scheduledTime: '10am to 12pm', estimatedCost: 680, assignedVendorName: 'Ace Plumbing', images: [], createdAt: daysFromNow(-2), updatedAt: daysFromNow(-1) });
  await db.doc('maintenanceRequests/browser-done').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', propertyName: 'Browser Property', title: 'Porch light out', description: 'Bulb', category: 'Electrical', priority: 'low', status: 'completed', images: [], createdAt: daysFromNow(-9), updatedAt: daysFromNow(-6) });
  await db.doc('maintenanceRequests/browser-public').set({ tenantId: 'public', tenantName: 'Walk-in Renter', tenantPhone: '+18165550100', contactEmail: null, addressText: '456 Emulator Ave', propertyId: 'unassigned', title: 'Front door lock sticking', description: 'Key sticks in the deadbolt', category: 'Other', priority: 'High', status: 'submitted', source: 'public-form', images: [], createdAt: daysFromNow(-0.2), updatedAt: daysFromNow(-0.2) });

  await db.doc('landlordExpenses/browser-expense-paid').set({ landlordId: 'browser-landlord', propertyId: 'browser-property', propertyName: 'Browser Property', expenseType: 'repair', category: 'repair', amount: 250, vendor: 'Ace Plumbing', description: 'Faucet cartridge', date: monthStart, paidDate: monthStart, status: 'paid', createdAt: new Date(), updatedAt: new Date() });
  await db.doc('landlordExpenses/browser-expense-pending').set({ landlordId: 'browser-landlord', propertyId: 'browser-vacant', propertyName: 'Browser Vacant', expenseType: 'repair', category: 'repair', amount: 900, vendor: 'Roof Co', description: 'roof patch', date: now, status: 'pending', createdAt: new Date(), updatedAt: new Date() });
  await db.doc('payouts/browser-payout').set({ landlordId: 'browser-landlord', amount: 950, netAmount: 700, status: 'scheduled', scheduledDate: daysFromNow(9), createdAt: new Date() });
});

// Leave the shared emulator exactly as workflows.spec.ts expects to find it.
test.afterAll(async () => {
  const seeded = [
    'leases/browser-lease', 'ledger/browser-charge-now', 'ledger/browser-charge-last', 'ledger/browser-payment-last', 'payments/browser-payment-last',
    'maintenanceRequests/browser-open', 'maintenanceRequests/browser-done', 'maintenanceRequests/browser-public',
    'landlordExpenses/browser-expense-paid', 'landlordExpenses/browser-expense-pending', 'payouts/browser-payout', 'properties/browser-vacant',
  ];
  await Promise.all(seeded.map(path => db.doc(path).delete()));
});

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});

test('tenant home shows rent, attention items, activity and contact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'tenant', '/portal/');
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Browser\./ })).toBeVisible();
  await expect(page.getByText('Recorded balance due')).toBeVisible();
  await expect(page.getByText('Needs your attention')).toBeVisible();
  await expect(page.getByRole('strong').filter({ hasText: /^Dishwasher leak$/ })).toBeVisible();
  await expect(page.getByText(/Your lease ends/)).toBeVisible();
  await expect(page.getByText('Renters insurance not on file')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible();
  await expect(page.getByText('Rent payment received, $1,200.00').first()).toBeVisible();
  await page.screenshot({ path: '.agent-artifacts/home-tenant.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.agent-artifacts/home-tenant-phone.png', fullPage: true });
});

test('empty tenant account shows missing records without sample claims', async ({ page }) => {
  await auth.createUser({ uid: 'browser-empty', email: 'browser-empty@example.com', password }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
  await db.doc('users/browser-empty').set({ role: 'tenant', email: 'browser-empty@example.com', displayName: 'Empty Tenant', propertyIds: [] });
  await login(page, 'empty', '/portal/');
  await expect(page.getByText('No balance recorded', { exact: true })).toBeVisible();
  await expect(page.getByText('Not available', { exact: true })).toBeVisible();
  await expect(page.getByText('No payments recorded yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('No payments recorded.', { exact: true })).toBeVisible();
  await expect(page.getByText('No insurance policy recorded. Check your signed lease for coverage requirements.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('good standing');
  await expect(page.locator('body')).not.toContainText('Julia Chen');
  await expect(page.locator('body')).not.toContainText('$1,450');
  await expect(page.locator('body')).not.toContainText('2024');
  await expect(page.locator('body')).not.toContainText('$100,000');
  await page.screenshot({ path: '.agent-artifacts/tenant-empty-records.png', fullPage: true });
});

test('landlord overview shows the month, decisions, chart and property table', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'landlord', '/landlord/');
  await expect(page.getByRole('heading', { name: /at a glance/ })).toBeVisible();
  await expect(page.getByText('Collected this month')).toBeVisible();
  await expect(page.getByText('Needs your decision')).toBeVisible();
  await expect(page.getByText(/Approve repair estimate: \$680/)).toBeVisible();
  await expect(page.getByText('Browser Vacant is vacant')).toBeVisible();
  await expect(page.getByText(/Pending expense: \$900/)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Property' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Net income, last 6 months/ })).toBeVisible();
  await page.screenshot({ path: '.agent-artifacts/home-landlord.png', fullPage: true });
});

test('admin dashboard shows rent status, the queue, public requests and work orders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, 'admin', '/admin/');
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Browser\./ })).toBeVisible();
  await expect(page.getByText(/Rent collected, /)).toBeVisible();
  await expect(page.getByText("Today's queue")).toBeVisible();
  await expect(page.getByText('New maintenance requests to assign')).toBeVisible();
  await expect(page.getByText('Public requests not linked to a tenant')).toBeVisible();
  await expect(page.getByText('New from the public form')).toBeVisible();
  await expect(page.getByText('Front door lock sticking').first()).toBeVisible();
  await expect(page.getByText('Unmatched').first()).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Dishwasher leak' })).toBeVisible();
  await page.screenshot({ path: '.agent-artifacts/home-admin.png', fullPage: true });
});
