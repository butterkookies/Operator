import { test, expect } from '@playwright/test';

test('dummy test for compilation', async ({ page }) => {
  await page.goto('/');
  // Basic check to see if the app loads
  await expect(page).toHaveTitle(/temp-vite/i);
});
