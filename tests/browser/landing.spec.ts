import { test, expect } from '@playwright/test';
test('landing page renders every section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.agent-artifacts/landing.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '.agent-artifacts/landing-phone.png', fullPage: true });
});

test('login page renders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login/');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.agent-artifacts/login.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.agent-artifacts/login-phone.png', fullPage: true });
});

test('landlord sign-in entry point presents the owner console', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login/?next=%2Flandlord');
  await expect(page.getByText('Owner portal · Sign in')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in to the landlord console' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.screenshot({ path: '.agent-artifacts/login-landlord.png', fullPage: true });
});
