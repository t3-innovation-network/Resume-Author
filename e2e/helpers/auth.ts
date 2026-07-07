import { Page } from '@playwright/test';

export const MOCK_ACCESS_TOKEN = 'mock-access-token-12345';
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token-12345';

/** Seed auth tokens before any page script runs so Redux reads them on init. */
export async function seedAuthStorage(page: Page) {
  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem('auth', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    },
    { accessToken: MOCK_ACCESS_TOKEN, refreshToken: MOCK_REFRESH_TOKEN }
  );
}

/** Clear auth tokens before any page script runs. */
export async function clearAuthStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('auth');
    localStorage.removeItem('refresh_token');
  });
}

/**
 * Block Google API calls so /myresumes does not treat mock tokens as expired
 * and auto-logout (which races with ProtectedRoute and redirects to /login).
 */
export async function blockGoogleApis(page: Page) {
  await page.route('**/*googleapis.com/**', route => route.abort('failed'));
}
