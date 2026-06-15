import { test, expect } from '@playwright/test';

test('desktop login screen shows demo defaults', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '登录同步书架' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '邮箱' })).toHaveValue('demo@novel.local');
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
});

test('desktop can skip login for local books', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '跳过登录，打开本地书籍' })).toBeVisible();
});
