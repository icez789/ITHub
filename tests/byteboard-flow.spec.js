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
    await page.locator('.ql-editor').click();
    await page.locator('button.ql-code-block').click();
    const languagePicker = page.locator('.ql-code-block-container select.ql-ui');
    await expect(languagePicker).toBeVisible();
    await expect(languagePicker.locator('option')).toHaveCount(14);
    await languagePicker.selectOption('javascript');
    await expect(languagePicker).toHaveValue('javascript');
    await page.locator('.ql-editor').fill('Topic created by the isolated Playwright test account.');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/topic\/\d+/, { timeout: 15_000 });
  });

  test('opens a search result without returning to the search page', async ({ page }) => {
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    test.skip(await firstTopic.count() === 0, 'The test database has no topics to search');

    const title = (await firstTopic.locator('h3').innerText()).trim();
    await page.getByLabel('ค้นหากระทู้').fill(title);
    await expect(page).toHaveURL((url) => url.searchParams.get('search') === title);

    const result = page.locator('section a[href^="/topic/"]').first();
    const topicPath = await result.getAttribute('href');
    await result.click();
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await page.waitForTimeout(750);
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await expect(page.getByLabel('ค้นหากระทู้')).toHaveValue('');
  });

  test('toggles dark mode', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('serves complete footer and information routes', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'กระทู้ยอดนิยม' })).toHaveAttribute('href', '/?sort=popular');
    await expect(footer.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' })).toHaveAttribute('href', '/privacy');

    for (const [path, heading] of [
      ['/privacy', 'นโยบายความเป็นส่วนตัว'],
      ['/terms', 'ข้อกำหนดการใช้งาน'],
      ['/help', 'ศูนย์ช่วยเหลือ'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('filters the AI and Data category with an encoded query', async ({ page }) => {
    await page.goto('/?category=AI%20%26%20Data');
    await expect(page.getByRole('heading', { name: /หมวดหมู่: AI & Data/ })).toBeVisible();
  });

  test('protects the notifications page from signed-out users', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login$/);
  });
});
