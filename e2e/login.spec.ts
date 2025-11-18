import { test, expect } from '@playwright/test';
/* eslint-disable testing-library/prefer-screen-queries */

test.describe('Google Login', () => {
  test('Home Google Login Button Exist', async ({ page }) => {
    await page.goto('/');
    const logoutBtn = page.getByRole('button', { name: 'Logout', exact: true });
    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click();
    }
    // Expected to have Login on the navbar not Logout
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout', exact: true })).not.toBeVisible();
   });
})