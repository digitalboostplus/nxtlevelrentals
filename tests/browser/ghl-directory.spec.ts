import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-nlr-integrity') throw new Error('Demo emulators only');
const app = initializeApp({ projectId: 'demo-nlr-integrity' }, 'directory-browser');
test('admin can review warnings, resolve a stale preview and apply a selected directory change', async ({ page }) => {
  const uid = 'directory-browser-admin';
  const password = 'Emulator-only-123!';
  await getAuth(app).createUser({ uid, email: `${uid}@example.com`, password }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
  await getFirestore(app).doc(`users/${uid}`).set({ role: 'admin', email: `${uid}@example.com`, displayName: 'Directory operator' });
  let applied = false;
  let attempts = 0;
  let previewCount = 0;
  // UI contract fixture only; server import behavior is covered against Firestore/Auth emulators.
  await page.route('**/api/admin/import-tenants*', async route => {
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    let data: unknown;
    if (!body) data = { entries: applied ? [{ id: 'loc_one', name: 'Directory Resident', email: null, propertyName: 'Test Home', status: 'active', hasPortalAccount: false, warnings: ['Missing email; directory only'] }] : [], legacy: [] };
    else if (body.action === 'preview') {
      previewCount++;
      data = { previewId: `preview-${previewCount}`, expiresAt: new Date(Date.now() + 900000).toISOString(), appliedContactIds: [], counts: { create: 1, conflict: 1 }, rows: [
        { contactId: 'one', name: 'Directory Resident', email: null, propertyName: 'Test Home', action: 'create', reasons: [], warnings: ['Missing email; directory only'], hasPortalAccount: false },
        { contactId: 'blocked', name: 'Conflicting Resident', email: null, propertyName: '', action: 'conflict', reasons: ['Multiple occupied properties need review'], warnings: [], hasPortalAccount: false }
      ] };
    } else {
      expect(body.contactIds).toEqual(['one']);
      attempts++;
      if (attempts === 1) { await route.fulfill({ status: 409, json: { message: 'App data changed; preview again' } }); return; }
      applied = true; data = { results: [{ contactId: 'one', status: 'applied' }] };
    }
    await route.fulfill({ json: data });
  });
  await page.goto('/login/?next=%2Fadmin%2Ftenants%2F');
  await page.getByLabel('Email address').fill(`${uid}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'GHL tenant directory', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview GHL changes', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Import Conflicting Resident', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Apply 0 selected changes' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Import Directory Resident', exact: true }).check();
  await page.getByRole('button', { name: 'Apply 1 selected changes' }).click();
  await expect(page.getByRole('region', { name: 'GHL tenant directory', exact: true }).getByRole('alert')).toHaveText('App data changed; preview again');
  await page.getByRole('button', { name: 'Preview GHL changes', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Import Directory Resident', exact: true }).check();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.screenshot({ path: '.agent-artifacts/ghl-directory-preview.png', fullPage: true });
  await page.getByRole('button', { name: 'Apply 1 selected changes' }).click();
  await expect(page.getByRole('region', { name: 'GHL tenant directory', exact: true }).getByRole('status')).toContainText('Applied 1 directory changes');
  await expect(page.getByRole('table', { name: 'GHL tenant directory', exact: true })).toContainText('Not created');
  await expect(page.getByRole('checkbox', { name: 'Import Directory Resident', exact: true })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: '.agent-artifacts/ghl-directory-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
