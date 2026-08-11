import { test, expect } from '@playwright/test';

const email = process.env.BYTEBOARD_E2E_EMAIL;
const password = process.env.BYTEBOARD_E2E_PASSWORD;

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/?(?:\?notify=login_success)?$/);
}

test.describe('ByteBoard critical flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens the AI chat without calling the external model', async ({ page }) => {
    await page.getByRole('button', { name: 'Open AI chat' }).click();
    await expect(page.getByText(/ITHub Bot/).first()).toBeVisible();
    await expect(page.locator('input[type="text"]').last()).toBeVisible();
  });

  test('logs in with the configured test account', async ({ page }) => {
    test.skip(!email || !password, 'Set BYTEBOARD_E2E_EMAIL and BYTEBOARD_E2E_PASSWORD');
    await login(page);
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('creates a topic', async ({ page }) => {
    test.skip(!email || !password, 'Set BYTEBOARD_E2E_EMAIL and BYTEBOARD_E2E_PASSWORD');
    await login(page);
    await page.goto('/create');
    await page.locator('input[name="title"]').fill(`Playwright topic ${Date.now()}`);
    await page.locator('select[name="category"]').selectOption('Software');
    await page.locator('.ql-editor').fill('Topic created by the isolated Playwright test account.');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/topic\/\d+/, { timeout: 15_000 });
  });

  test('toggles dark mode', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });
});
