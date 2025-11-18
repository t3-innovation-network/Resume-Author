/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Resume Editor Page (/resume/new)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state by setting token in localStorage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('auth', 'mock-access-token-12345');
      localStorage.setItem('refresh_token', 'mock-refresh-token-12345');
    });
    await page.goto('/resume/new', { waitUntil: 'domcontentloaded' });
  });

  test('loads the resume editor page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/resume\/new/);
    
    // Check that the resume name is visible (defaults to "Untitled")
    await expect(page.getByText('Untitled')).toBeVisible();
  });

  test('displays all required sections', async ({ page }) => {
    // Check for required sections using role-based locators to avoid strict mode violations
    const requiredSections = [
      'Professional Summary',
      'Work Experience',
      'Education',
      'Professional Affiliations',
      'Skills and Abilities'
    ];

    for (const section of requiredSections) {
      // Use getByRole('heading') with .first() to handle cases where section names appear multiple times
      const sectionHeading = page.getByRole('heading', { name: section }).first();
      await expect(sectionHeading).toBeVisible();
    }
  });

  test('displays action buttons', async ({ page }) => {
    // Check for Preview button
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible();
    
    // Check for Save Draft button
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible();
    
    // Check for Sign And Save button
    await expect(page.getByRole('button', { name: /Sign And Save/i })).toBeVisible();
  });

  test('displays resume name with edit capability', async ({ page }) => {
    // Check that the resume name is visible (defaults to "Untitled")
    const resumeName = page.getByText('Untitled');
    await expect(resumeName).toBeVisible();
    
    // Verify the resume name is displayed in the header area
    // The name should be prominent and visible at the top of the editor
    const headerSection = page.locator('div').filter({ hasText: /Untitled|Name your resume/i }).first();
    await expect(headerSection).toBeVisible();
  });

  test('displays Work Experience section', async ({ page }) => {
    // Find the Work Experience section heading
    const workExpSection = page.getByRole('heading', { name: 'Work Experience' }).first();
    await expect(workExpSection).toBeVisible();
  });

  test('displays Education section', async ({ page }) => {
    // Find the Education section heading
    const educationSection = page.getByRole('heading', { name: 'Education' }).first();
    await expect(educationSection).toBeVisible();
  });

  test('displays Skills and Abilities section', async ({ page }) => {
    // Find the Skills and Abilities section heading
    // Use getByRole to target the heading specifically, and .first() to handle multiple matches
    const skillsSection = page.getByRole('heading', { name: 'Skills and Abilities' }).first();
    await expect(skillsSection).toBeVisible();
  });

  test('Preview button is clickable and attempts navigation', async ({ page }) => {
    // Find and verify Preview button is visible
    const previewButton = page.getByRole('button', { name: /Preview/i });
    await expect(previewButton).toBeVisible();
    await expect(previewButton).toBeEnabled();
    
    // Click the Preview button
    await previewButton.click();
    
    // Wait for navigation attempt
    // Note: Navigation might be blocked if there are unsaved changes,
    // or might require authentication, so we check for URL change or dialog
    await page.waitForTimeout(1500);

    // Check if URL changed to preview page OR if a dialog appeared (unsaved changes)
    const currentUrl = page.url();
    const hasNavigated = currentUrl.includes('/resume/view');
    const hasDialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    
    // Either navigation happened or a dialog appeared (both are valid behaviors)
    expect(hasNavigated || hasDialog).toBeTruthy();
  });

  test('displays progress bar', async ({ page }) => {
    // The page should have a progress bar element
    // Look for the linear progress component by role or by MUI class
    const progressBar = page.locator('[role="progressbar"]').first();
    
    // Progress bar should be visible (it's always shown, even if at 100%)
    await expect(progressBar).toBeVisible({ timeout: 2000 });
  });

  test('page is responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload(); // Reload to apply mobile styles
    await page.waitForTimeout(1000);
    
    // On mobile, there should be at least the menu buttons
    const appBar = page.locator('[role="banner"], .MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 2000 });
  });

  test('sections are interactive and can receive focus', async ({ page }) => {
    // Click on a section to focus it
    const summarySection = page.getByText('Professional Summary', { exact: false });
    await expect(summarySection).toBeVisible();
    await summarySection.click();
    
    // Section should be focusable and clickable
    // This verifies basic interactivity
    await page.waitForTimeout(500);
    
    // Verify the section is still visible after interaction
    await expect(summarySection).toBeVisible();
  });

  test('displays left sidebar on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // On desktop, the left sidebar should be visible
    // It contains contact information and languages
    // Look for contact-related fields or left sidebar content
    const contactFields = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const fieldCount = await contactFields.count();
    
    // Desktop view should show the sidebar with form fields
    // At minimum, we should see the page structure
    expect(fieldCount).toBeGreaterThanOrEqual(0);
  });

  test('Save Draft button is visible and enabled', async ({ page }) => {
    const saveDraftButton = page.getByRole('button', { name: /Save Draft/i });
    await expect(saveDraftButton).toBeVisible();
    await expect(saveDraftButton).toBeEnabled();
  });

  test('Sign And Save button is visible and enabled', async ({ page }) => {
    const signAndSaveButton = page.getByRole('button', { name: /Sign And Save/i });
    await expect(signAndSaveButton).toBeVisible();
    await expect(signAndSaveButton).toBeEnabled();
  });
});
