import { test, expect } from '@playwright/test';

test('guest can enter shelf from login', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '游客继续使用（无需登录）' }).click();
  await expect(page.getByRole('heading', { name: '我的书架' })).toBeVisible();
  await expect(page.getByText('本地书架，登录后可同步到云端')).toBeVisible();
});
