import { test, expect } from '@playwright/test';

const email = process.env.ITHUB_E2E_EMAIL;
const password = process.env.ITHUB_E2E_PASSWORD;
const onboardingStorageKey = 'ithub_onboarding_v2';

function onboarding(page) {
  const root = page.locator('[data-tour-root="true"]');
  return {
    root,
    dialog: root.getByRole('dialog'),
    spotlight: root.locator('.ithub-tour-spotlight-guard'),
  };
}

async function expectTourStep(page, id, heading) {
  const tour = onboarding(page);
  await expect(tour.root).toHaveAttribute('data-tour-step', id);
  await expect(tour.dialog.getByRole('heading', { name: heading })).toBeVisible();
  await expect(tour.dialog.getByRole('button', { name: id === 'ai-safety' ? 'เริ่มใช้งาน' : 'ถัดไป' })).toBeEnabled();
  return tour;
}

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/?(?:\?notify=login_success)?$/);
}

test.describe('ITHub onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, onboardingStorageKey);
  });

  test('shows once and remembers when the user dismisses it', async ({ page }) => {
    await page.goto('/help');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');

    await expect(page).toHaveURL('/');
    await expect(tour.dialog.getByText('ขั้นตอน 1 จาก 6')).toBeVisible();
    await expect(tour.spotlight).toBeVisible();
    await expect.poll(() => page.locator('[data-tour-app-shell="true"]').evaluate((element) => element.inert)).toBe(true);

    const spotlightBox = await tour.spotlight.boundingBox();
    expect(spotlightBox).not.toBeNull();
    await expect.poll(() => page.evaluate(({ x, y }) => {
      return Boolean(document.elementFromPoint(x, y)?.closest('.ithub-tour-spotlight-guard'));
    }, {
      x: spotlightBox.x + spotlightBox.width / 2,
      y: spotlightBox.y + spotlightBox.height / 2,
    })).toBe(true);

    await tour.dialog.getByRole('button', { name: 'ปิดคำแนะนำ' }).click();
    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help');
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), onboardingStorageKey)).toBe('dismissed');

    await page.reload();
    await expect(tour.dialog).not.toBeVisible();
  });

  test('moves across the six spotlight steps, restores the start URL, and records completion', async ({ page }) => {
    await page.goto('/help?tour=playwright#getting-started');
    const initialHistoryLength = await page.evaluate(() => history.length);

    let tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'explore', 'เลือกดูกระทู้ที่น่าสนใจ');
    const hasTutorialTopic = await page.locator('[data-tour="topic-link"]').count() > 0;
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'create', 'เข้าสู่ระบบแล้วสร้างกระทู้');
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'engage', 'ถูกใจและบันทึกเก็บไว้');
    await expect(page).toHaveURL(hasTutorialTopic ? /\/topic\/\d+$/ : /\/$/);
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'personal', 'โปรไฟล์และการแจ้งเตือน');
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'ai-safety', 'ใช้ ITHub Bot อย่างเหมาะสม');
    await tour.dialog.getByRole('button', { name: 'เริ่มใช้งาน' }).click();

    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help?tour=playwright#getting-started');
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), onboardingStorageKey)).toBe('completed');
    await expect.poll(() => page.evaluate(() => history.length)).toBe(initialHistoryLength);
  });

  test('can be reopened from help and restores focus after Escape', async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'completed');
    }, onboardingStorageKey);
    await page.goto('/help');

    const launcher = page.getByRole('button', { name: 'เปิดคำแนะนำอีกครั้ง' });
    const tour = onboarding(page);
    await expect(tour.dialog).not.toBeVisible();
    await launcher.focus();
    await launcher.click();
    await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');

    for (let index = 0; index < 8; index += 1) await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => {
      const activeDialog = document.querySelector('[data-tour-root="true"] [role="dialog"]');
      return activeDialog?.contains(document.activeElement) ?? false;
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help');
    await expect(launcher).toBeFocused();
  });

  test('fits within a mobile viewport without horizontal overflow', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/help');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    const box = await tour.dialog.boundingBox();
    const spotlightBox = await tour.spotlight.boundingBox();

    expect(box).not.toBeNull();
    expect(spotlightBox).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(spotlightBox.x).toBeGreaterThanOrEqual(0);
    expect(spotlightBox.x + spotlightBox.width).toBeLessThanOrEqual(375);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => tour.dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgb(255, 255, 255)');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('falls back gracefully when a spotlight target is unavailable', async ({ page }) => {
    await page.goto('/');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await page.locator('[data-tour="topic-card"]').evaluateAll((elements) => {
      for (const element of elements) element.style.display = 'none';
    });
    await page.locator('[data-tour="topic-list"]').evaluateAll((elements) => {
      for (const element of elements) element.style.display = 'none';
    });

    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(tour.root).toHaveAttribute('data-tour-step', 'explore');
    await expect(tour.root).toHaveAttribute('data-tour-fallback', 'true', { timeout: 5_000 });
    await expect(tour.dialog.getByText(/ยังไม่พบส่วนนี้/)).toBeVisible();
    await expect(tour.dialog.getByRole('button', { name: 'ถัดไป' })).toBeEnabled();
  });

  test('spotlights the member create action when authenticated', async ({ page }) => {
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'completed');
    }, onboardingStorageKey);
    await login(page);
    await page.goto('/help');
    await page.getByRole('button', { name: 'เปิดคำแนะนำอีกครั้ง' }).click();

    let tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'explore', 'เลือกดูกระทู้ที่น่าสนใจ');
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    tour = await expectTourStep(page, 'create', 'เข้าสู่ระบบแล้วสร้างกระทู้');
    await expect(page.locator('[data-tour="create-topic"]:visible').first()).toBeVisible();
    await expect(tour.spotlight).toBeVisible();
  });
});

test.describe('ITHub critical flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'completed');
    }, onboardingStorageKey);
  });

  test('opens the AI chat without calling the external model', async ({ page }) => {
    await page.goto('/help');
    await page.getByRole('button', { name: 'Open AI chat' }).click();
    await expect(page.getByText(/ITHub Bot/).first()).toBeVisible();
    await expect(page.locator('input[type="text"]').last()).toBeVisible();
  });

  test('logs in with the configured test account', async ({ page }) => {
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
    await login(page);
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  });

  test('creates a topic', async ({ page }) => {
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
    await login(page);
    await page.goto('/create');
    let created = false;
    try {
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
      created = true;
    } finally {
      if (created) {
        await page.getByRole('button', { name: '🗑️ ลบกระทู้นี้' }).click();
        await expect(page).toHaveURL((url) => url.pathname === '/');
      }
    }
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
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
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

    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'คู่มือ ITHub ใน 4 ขั้นตอน' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'เปิดคำแนะนำอีกครั้ง' })).toBeVisible();
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

  test('keeps desktop content clear of the collapsed sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/help');
    const sidebarBox = await page.locator('aside').boundingBox();
    const mainBox = await page.locator('#main-content').boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(mainBox.x);
  });

  test('requires authentication for Pusher channel subscriptions', async ({ page }) => {
    const signedOutResponse = await page.request.post('/api/pusher/auth', {
      form: { socket_id: '123.456', channel_name: 'private-user-1' },
    });
    expect(signedOutResponse.status()).toBe(401);
  });

  test('authorizes only the current user Pusher channel', async ({ page }) => {
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
    await login(page);
    const bell = page.getByRole('button', { name: 'เปิดการแจ้งเตือน' });
    const userId = await bell.getAttribute('data-user-id');
    expect(userId).toMatch(/^\d+$/);

    const forbiddenResponse = await page.request.post('/api/pusher/auth', {
      form: { socket_id: '123.456', channel_name: 'private-user-999999999' },
    });
    expect(forbiddenResponse.status()).toBe(403);

    const ownChannelResponse = await page.request.post('/api/pusher/auth', {
      form: { socket_id: '123.456', channel_name: `private-user-${userId}` },
    });
    expect(ownChannelResponse.status()).toBe(200);
  });

  test('does not partially update a profile when the old password is wrong', async ({ page }) => {
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
    await login(page);
    await page.goto('/profile/edit');
    const usernameInput = page.locator('input[name="username"]');
    const originalUsername = await usernameInput.inputValue();
    await usernameInput.fill(`pwcheck_${Date.now()}`.slice(0, 40));
    await page.locator('input[name="oldPassword"]').fill('definitely-not-the-current-password');
    await page.locator('input[name="newPassword"]').fill('Temporary-password-123');
    await page.locator('input[name="confirmNewPassword"]').fill('Temporary-password-123');
    await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click();
    await expect(page).toHaveURL(/notify=wrong_old_password/);
    await expect(page.locator('input[name="username"]')).toHaveValue(originalUsername);
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
    test.skip(!email || !password, 'Set ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD');
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
