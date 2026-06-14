import { test, expect } from '@playwright/test';
test('dummy', async ({ page }) => {
  console.log('Test running...');
  expect(1).toBe(1);
});
