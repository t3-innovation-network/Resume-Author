/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test.describe('Unauthenticated Access', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure user is logged out by clearing localStorage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.removeItem('auth');
        localStorage.removeItem('refresh_token');
      });
    });

    test('redirects to login when accessing /resume/new', async ({ page }) => {
      await page.goto('/resume/new', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing /resume/import', async ({ page }) => {
      await page.goto('/resume/import', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing /resume/upload', async ({ page }) => {
      await page.goto('/resume/upload', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing /resume/view', async ({ page }) => {
      await page.goto('/resume/view', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing /myresumes', async ({ page }) => {
      await page.goto('/myresumes', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing protected route with ID', async ({ page }) => {
      await page.goto('/resume/view/test-id-123', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authenticated Access', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated state by setting token in localStorage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.setItem('auth', 'mock-access-token-12345');
        localStorage.setItem('refresh_token', 'mock-refresh-token-12345');
      });
    });

    test('allows access to /resume/new when authenticated', async ({ page }) => {
      await page.goto('/resume/new', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/new/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('allows access to /resume/import when authenticated', async ({ page }) => {
      await page.goto('/resume/import', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/import/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('allows access to /resume/upload when authenticated', async ({ page }) => {
      await page.goto('/resume/upload', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/upload/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('allows access to /resume/view when authenticated', async ({ page }) => {
      await page.goto('/resume/view', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/view/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('allows access to /myresumes when authenticated', async ({ page }) => {
      await page.goto('/myresumes', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/myresumes/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('allows access to /resume/view/:id when authenticated', async ({ page }) => {
      await page.goto('/resume/view/test-id-123', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/view\/test-id-123/);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('Authentication State Changes', () => {
    test('redirects when token is removed after initial load', async ({ page }) => {
      // Start authenticated
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.setItem('auth', 'mock-access-token-12345');
      });
      
      await page.goto('/resume/new', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/new/);
      
      // Remove token
      await page.evaluate(() => {
        localStorage.removeItem('auth');
      });
      
      // Navigate to another protected route
      await page.goto('/resume/import', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });

    test('allows access when token is added after initial load', async ({ page }) => {
      // Start unauthenticated
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.removeItem('auth');
      });
      
      await page.goto('/resume/new', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
      
      // Add token
      await page.evaluate(() => {
        localStorage.setItem('auth', 'mock-access-token-12345');
      });
      
      // Navigate to protected route
      await page.goto('/resume/import', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/resume\/import/);
    });
  });

  test.describe('Public Routes Remain Accessible', () => {
    test('allows unauthenticated access to public routes', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.removeItem('auth');
      });
      
      // Test public routes
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/');
      
      await page.goto('/faq', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/faq/);
      
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

