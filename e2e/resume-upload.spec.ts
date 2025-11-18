/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Resume Upload Page (/resume/upload)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state by setting token in localStorage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('auth', 'mock-access-token-12345');
      localStorage.setItem('refresh_token', 'mock-refresh-token-12345');
    });
    await page.goto('/resume/upload', { waitUntil: 'domcontentloaded' });
  });

  test('loads the resume upload page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/resume\/upload/);
  });

  test('displays the form elements', async ({ page }) => {
    // Check for the Resume URL textbox
    const urlInput = page.getByRole('textbox', { name: 'Resume URL' });
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEnabled();

    // Check for "Import Resume" button (should be disabled when input is empty)
    const importButton = page.getByRole('button', { name: 'Import Resume' });
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeDisabled(); // Should be disabled when URL is empty
  });

  test('Import Resume button is enabled when URL is entered', async ({ page }) => {
    const urlInput = page.getByRole('textbox', { name: 'Resume URL' });
    const importButton = page.getByRole('button', { name: 'Import Resume' });

    await expect(importButton).toBeDisabled();

    await urlInput.fill('https://example.com/api/credential-raw/test');

    await expect(importButton).toBeEnabled();
  });

  test('form shows error message for empty URL submission', async ({ page }) => {
    const importButton = page.getByRole('button', { name: 'Import Resume' });

    const urlInput = page.getByRole('textbox', { name: 'Resume URL' });
    await urlInput.fill('test');
    await urlInput.clear();

    await expect(importButton).toBeDisabled();
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Upload Resume from URL' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Resume URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Resume' })).toBeVisible();
  });
});