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
