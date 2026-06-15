import { test, expect } from '@playwright/test';

test('login page shows demo account hint', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('NovelReader 登录')).toBeVisible();
  await expect(page.getByText('demo@novel.local')).toBeVisible();
});
