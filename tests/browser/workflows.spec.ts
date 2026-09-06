import { test, expect, type Page } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
const projectId = 'demo-nlr-integrity';
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== projectId || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Demo emulators only');
const app = initializeApp({ projectId }, 'browser-tests'); const db = getFirestore(app); const auth = getAuth(app);
const password = 'Emulator-only-123!';
async function login(page: Page, role: string, next: string) {
  await page.goto(`/login/?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email address').fill(`browser-${role}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
test.beforeAll(async () => {
  for (const role of ['tenant', 'admin', 'landlord']) {
    const uid = `browser-${role}`;
    await auth.createUser({ uid, email: `${uid}@example.com`, password }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
    await db.doc(`users/${uid}`).set({ role, email: `${uid}@example.com`, displayName: `Browser ${role}`, propertyIds: ['browser-property'] });
    await db.doc(`notificationPreferences/${uid}`).set({ email: { enabled: false }, push: { enabled: false }, inApp: { enabled: true } });
  }
  await db.doc('properties/browser-property').set({ name: 'Browser Property', address: '123 Emulator St', landlordId: 'browser-landlord', status: 'vacant', available: true, units: [], rent: 1200, createdAt: new Date(), images: [] });
  await db.doc('landlords/browser-landlord').set({ managementFee: { type: 'percentage', amount: 8 } });
});
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});
test('tenant uploads photo, submits maintenance and persists notification choices', async ({ page }) => {
  await login(page, 'tenant', '/portal/');
  await page.locator('#requestTitle').fill('Browser test leaking sink');
  await page.locator('#requestDescription').fill('The kitchen sink leaks when the tap is running.');
  await page.locator('#maintenance input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwZkAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByRole('button', { name: 'Discard upload' })).toBeVisible();
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.getByText('Request received!', { exact: false })).toBeVisible();
  const tickets = await db.collection('maintenanceRequests').where('tenantId', '==', 'browser-tenant').get();
  expect(tickets.size).toBe(1); expect(tickets.docs[0].data().fileIds).toHaveLength(1);
  await page.goto('/account/'); await page.getByRole('button', { name: /Notifications/ }).click();
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeEnabled();
  const email = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: /^email$/ }) }).last();
  await email.getByLabel('Enable channel').check();
  await email.getByLabel('Maintenance status changes').uncheck();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences saved.')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: /Notifications/ }).click();
  await expect(email.getByLabel('Maintenance status changes')).not.toBeChecked();
  await page.route(/\/api\/notifications\/preferences\/?(?:\?.*)?$/, route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) : route.continue());
  await email.getByLabel('Maintenance status changes').check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences were not saved. Please retry.')).toBeVisible();
  await expect(page.getByText('Preferences saved.')).not.toBeVisible();
  await page.screenshot({ path: '.agent-artifacts/tenant-preferences.png', fullPage: true });
});
test('admin schedules work and archives/restores idle inventory', async ({ page }) => {
  await db.doc('maintenanceRequests/browser-work').set({ tenantId: 'browser-tenant', propertyId: 'browser-property', title: 'Browser scheduling ticket', description: 'Test work order', status: 'submitted', priority: 'medium', category: 'plumbing', createdAt: Date.now() });
  await login(page, 'admin', '/admin/maintenance/');
  await page.getByRole('row').filter({ hasText: 'Browser scheduling ticket' }).getByRole('button', { name: 'Update' }).click();
  await page.getByLabel('Scheduled Date').fill('2026-10-10'); await page.getByLabel('Scheduled Time').fill('10:30');
  await page.getByLabel('Technician Name').fill('Browser Vendor');
  await page.getByRole('button', { name: 'Save work order' }).click();
  await expect(page.getByRole('heading', { name: 'Update Maintenance Request' })).not.toBeVisible();
  expect((await db.doc('maintenanceRequests/browser-work').get()).data()?.scheduledTime).toBe('10:30');
  await db.doc('properties/browser-idle').set({ name: 'Idle Inventory', rent: 800, address: 'Idle St', units: [], status: 'vacant', available: true, createdAt: new Date() });
  await page.goto('/admin/properties/browser-idle/edit/'); await page.getByLabel('Name', { exact: true }).fill('Edited Inventory');
  await page.getByLabel('Archive property', { exact: false }).check(); await page.getByRole('button', { name: 'Save property' }).click();
  await expect(page).toHaveURL(/browser-idle\/$/); expect((await db.doc('properties/browser-idle').get()).data()?.archived).toBe(true);
  await page.goto('/admin/properties/browser-idle/edit/'); await page.getByLabel('Archive property', { exact: false }).uncheck();
  await page.getByRole('button', { name: 'Save property' }).click(); await expect(page).toHaveURL(/browser-idle\/$/);
  expect((await db.doc('properties/browser-idle').get()).data()?.available).toBe(true);
});
test('owner sees owned inventory and can submit an expense with private receipt', async ({ page }) => {
  await login(page, 'landlord', '/landlord/expenses/');
  await page.getByRole('button', { name: /Log expense/ }).click();
  await page.locator('form select').first().selectOption('browser-property');
  await page.locator('form input[type=file]').setInputFiles({ name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 Browser receipt') });
  await expect(page.getByRole('button', { name: 'Discard upload' })).toBeVisible();
  await page.getByPlaceholder('Who you paid').fill('Browser Vendor');
  await page.locator('form input[type=number]').fill('75');
  await page.locator('form textarea').fill('Browser expense receipt');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByRole('cell', { name: /Browser expense receipt/ })).toBeVisible();
  const expense = await db.collection('landlordExpenses').where('landlordId', '==', 'browser-landlord').get();
  expect(expense.docs[0].data().fileIds).toHaveLength(1); expect(expense.docs[0].data().status).toBe('pending');
});
