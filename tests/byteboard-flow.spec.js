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
  test('opens the AI chat without calling the external model', async ({ page }) => {
    await page.goto('/help');
    await page.getByRole('button', { name: 'Open AI chat' }).click();
    await expect(page.getByText(/ITHub Bot/).first()).toBeVisible();
    await expect(page.locator('input[type="text"]').last()).toBeVisible();
  });

  test('logs in with the configured test account', async ({ page }) => {
    test.skip(!email || !password, 'Set BYTEBOARD_E2E_EMAIL and BYTEBOARD_E2E_PASSWORD');
    await login(page);
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
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
    await page.goto('/');
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    test.skip(await firstTopic.count() === 0, 'The test database has no topics to search');

    const title = (await firstTopic.locator('h3').innerText()).trim();
    await page.locator('input[aria-label="ค้นหากระทู้"]:visible').fill(title);
    await expect(page).toHaveURL((url) => url.searchParams.get('search') === title);

    const result = page.locator('section a[href^="/topic/"]').first();
    const topicPath = await result.getAttribute('href');
    await result.click();
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await page.waitForTimeout(750);
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await expect(page.locator('input[aria-label="ค้นหากระทู้"]:visible')).toHaveValue('');
  });

  test('toggles dark mode', async ({ page }) => {
    await page.goto('/help');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('serves complete footer and information routes', async ({ page }) => {
    await page.goto('/help');
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

  test('protects topic creation and returns the user after login', async ({ page }) => {
    await page.goto('/create');
    await expect(page).toHaveURL((url) => url.pathname === '/login' && url.searchParams.get('next') === '/create');
  });

  test('keeps mobile search and AI chat clear of the bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/help');

    await expect(page.locator('input[aria-label="ค้นหากระทู้"]:visible')).toBeVisible();
    const chatButton = page.getByRole('button', { name: 'Open AI chat' });
    const bottomNav = page.getByRole('navigation', { name: 'เมนูมือถือ' });
    const chatBox = await chatButton.boundingBox();
    const navBox = await bottomNav.boundingBox();
    expect(chatBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(chatBox.y + chatBox.height).toBeLessThanOrEqual(navBox.y);

    await chatButton.click();
    await expect(page.getByRole('dialog', { name: 'ITHub Bot' })).toBeVisible();
  });

  test('keeps engagement controls disabled for signed-out users', async ({ page }) => {
    await page.goto('/');
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    test.skip(await firstTopic.count() === 0, 'The test database has no topics');
    await firstTopic.click();

    const likeButton = page.getByRole('button', { name: /ถูกใจกระทู้|ยกเลิกถูกใจ/ });
    const bookmarkButton = page.getByRole('button', { name: /บันทึกกระทู้|นำกระทู้ออก/ });
    await expect(likeButton).toBeDisabled();
    await expect(bookmarkButton).toBeDisabled();

    // Simulate a session expiring after the page rendered. The action should
    // report a local error instead of replacing the whole route with error.js.
    await likeButton.evaluate((button) => { button.disabled = false; });
    await likeButton.click();
    await expect(page.getByRole('alert').filter({ hasText: 'กรุณาเข้าสู่ระบบอีกครั้ง' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'โหลดข้อมูลไม่สำเร็จ' })).toHaveCount(0);
  });

  test('toggles likes and bookmarks without leaving the topic', async ({ page }) => {
    test.skip(!email || !password, 'Set BYTEBOARD_E2E_EMAIL and BYTEBOARD_E2E_PASSWORD');
    await login(page);
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    test.skip(await firstTopic.count() === 0, 'The test database has no topics');
    const topicPath = await firstTopic.getAttribute('href');
    await firstTopic.click();

    const likeButton = page.getByRole('button', { name: /ถูกใจกระทู้|ยกเลิกถูกใจ/ });
    const bookmarkButton = page.getByRole('button', { name: /บันทึกกระทู้|นำกระทู้ออก/ });
    const initialLike = await likeButton.getAttribute('aria-pressed');
    const initialBookmark = await bookmarkButton.getAttribute('aria-pressed');

    try {
      await likeButton.click();
      await expect(likeButton).toHaveAttribute('aria-pressed', initialLike === 'true' ? 'false' : 'true');
      await expect(page).toHaveURL((url) => url.pathname === topicPath);

      await bookmarkButton.click();
      await expect(bookmarkButton).toHaveAttribute('aria-pressed', initialBookmark === 'true' ? 'false' : 'true');
      await expect(page).toHaveURL((url) => url.pathname === topicPath);
      await expect(page.getByRole('heading', { name: 'โหลดข้อมูลไม่สำเร็จ' })).toHaveCount(0);
    } finally {
      if (await likeButton.getAttribute('aria-pressed') !== initialLike) await likeButton.click();
      if (await bookmarkButton.getAttribute('aria-pressed') !== initialBookmark) await bookmarkButton.click();
    }
  });
});
