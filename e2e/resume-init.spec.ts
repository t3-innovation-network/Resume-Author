/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Resume Import Page (/resume/import)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state by setting token in localStorage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('auth', 'mock-access-token-12345');
      localStorage.setItem('refresh_token', 'mock-refresh-token-12345');
    });
    await page.goto('/resume/import', { waitUntil: 'domcontentloaded' });
  });

  test('loads the resume import page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/resume\/import/);
  });

  test('displays the required elements', async ({ page }) => {
    // "Start from scratch" and "Upload Resume" are headings (Typography variant='h6')
    await expect(page.getByRole('heading', { name: 'Start from scratch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload Resume' })).toBeVisible();
    
    // "Go to My Resumes" is a button, not a heading
    await expect(page.getByRole('button', { name: 'Go to My Resumes' })).toBeVisible();
  });

  // responsive design
  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // "Start from scratch" and "Upload Resume" should be visible
    await expect(page.getByRole('heading', { name: 'Start from scratch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload Resume' })).toBeVisible();
  });
});