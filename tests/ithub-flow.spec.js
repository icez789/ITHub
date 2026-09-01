import { test, expect } from '@playwright/test';

const email = process.env.ITHUB_E2E_EMAIL;
const password = process.env.ITHUB_E2E_PASSWORD;
const onboardingStorageKey = 'ithub_onboarding_v2';

if (!email || !password) {
  throw new Error('Authenticated E2E requires ITHUB_E2E_EMAIL and ITHUB_E2E_PASSWORD. Use npm run test:e2e with .env.e2e.local.');
}

function onboarding(page) {
  const root = page.locator('[data-tour-root="true"]');
  return {
    root,
    dialog: root.getByRole('dialog'),
    spotlight: root.locator('.ithub-tour-spotlight-guard'),
    shades: root.locator('[data-tour-overlay="shade"]'),
    fallbackShade: root.locator('[data-tour-overlay="fallback"]'),
  };
}

async function expectTourStep(page, id, heading) {
  const tour = onboarding(page);
  await expect(tour.root).toHaveAttribute('data-tour-step', id);
  await expect(tour.dialog.getByRole('heading', { name: heading })).toBeVisible();
  await expect(tour.dialog.getByRole('button', { name: id === 'ai-safety' ? 'เริ่มใช้งาน' : 'ถัดไป' })).toBeEnabled();
  return tour;
}

async function expectBackdrop(page, tour) {
  await expect(tour.shades).toHaveCount(4);
  await expect.poll(() => tour.shades.evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element);
    const filter = style.backdropFilter || style.webkitBackdropFilter || '';
    if (element.dataset.tourShadeMode === 'fallback') {
      return style.backgroundColor.includes('0.64') && (!filter || filter === 'none');
    }
    return style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      && style.backgroundColor.includes('0.42')
      && filter.includes('blur(4px)')
      && filter.includes('brightness(0.88)');
  }))).toBe(true);

  await expect.poll(() => page.evaluate(() => {
    const points = [
      [1, 1],
      [window.innerWidth - 2, 1],
      [1, window.innerHeight - 2],
      [window.innerWidth - 2, window.innerHeight - 2],
    ];
    return points.every(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.ithub-tour-shade')));
  })).toBe(true);
}

async function expectTourFitsViewport(page) {
  await expect.poll(() => page.evaluate(() => {
    const dialog = document.querySelector('[data-tour-root="true"] [role="dialog"]');
    const spotlight = document.querySelector('.ithub-tour-spotlight-guard');
    if (!dialog || !spotlight) return { fits: false, reason: 'missing dialog or spotlight' };
    const dialogRect = dialog.getBoundingClientRect();
    const spotlightRect = spotlight.getBoundingClientRect();
    const overlaps = !(dialogRect.right <= spotlightRect.left
      || dialogRect.left >= spotlightRect.right
      || dialogRect.bottom <= spotlightRect.top
      || dialogRect.top >= spotlightRect.bottom);
    const fits = !overlaps
      && dialogRect.left >= 0
      && dialogRect.top >= 0
      && dialogRect.right <= window.innerWidth
      && dialogRect.bottom <= window.innerHeight
      && spotlightRect.left >= 0
      && spotlightRect.top >= 0
      && spotlightRect.right <= window.innerWidth
      && spotlightRect.bottom <= window.innerHeight;
    return JSON.stringify({
      fits,
      overlaps,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      dialog: { left: dialogRect.left, top: dialogRect.top, right: dialogRect.right, bottom: dialogRect.bottom },
      spotlight: { left: spotlightRect.left, top: spotlightRect.top, right: spotlightRect.right, bottom: spotlightRect.bottom },
    });
  })).toContain('"fits":true');
}

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.locator('[data-tour="create-topic"]:visible').first()).toBeVisible();
  await expect(page).toHaveURL('/');
}

async function postPusherAuth(page, channelName) {
  return page.evaluate(async (channel) => {
    const body = new URLSearchParams({ socket_id: '123.456', channel_name: channel });
    const response = await fetch('/api/pusher/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    return response.status;
  }, channelName);
}

test.describe('ITHub onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => window.localStorage.removeItem(storageKey), onboardingStorageKey);
  });

  test('shows once, blocks the background, and remembers dismissal', async ({ page }) => {
    await page.goto('/help');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await expect(page).toHaveURL('/');
    await expect(tour.spotlight).toBeVisible();
    await expect.poll(() => page.locator('[data-tour-app-shell="true"]').evaluate((element) => element.inert)).toBe(true);
    await expectBackdrop(page, tour);

    const spotlightBox = await tour.spotlight.boundingBox();
    expect(spotlightBox).not.toBeNull();
    await expect.poll(() => page.evaluate(({ x, y }) => (
      Boolean(document.elementFromPoint(x, y)?.closest('.ithub-tour-spotlight-guard'))
    ), { x: spotlightBox.x + spotlightBox.width / 2, y: spotlightBox.y + spotlightBox.height / 2 })).toBe(true);

    await tour.dialog.getByRole('button', { name: 'ปิดคำแนะนำ' }).click();
    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help');
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), onboardingStorageKey)).toBe('dismissed');
    await page.reload();
    await expect(tour.dialog).not.toBeVisible();
  });

  test('moves through six steps, restores URL/hash/history, and records completion', async ({ page }) => {
    await page.addInitScript((storageKey) => window.localStorage.setItem(storageKey, 'completed'), onboardingStorageKey);
    await page.goto('/help?tour=playwright#getting-started');
    const initialHistoryLength = await page.evaluate(() => history.length);
    const launcher = page.getByRole('button', { name: 'เปิดคำแนะนำอีกครั้ง' });
    await launcher.click();

    const sequence = [
      ['search', 'ค้นหากระทู้ที่ตรงกับคุณ'],
      ['explore', 'เลือกดูกระทู้ที่น่าสนใจ'],
      ['create', 'เข้าสู่ระบบแล้วสร้างกระทู้'],
      ['engage', 'ถูกใจและบันทึกเก็บไว้'],
      ['personal', 'โปรไฟล์และการแจ้งเตือน'],
      ['ai-safety', 'ใช้ ITHub Bot อย่างเหมาะสม'],
    ];
    let tour;
    for (const [index, [id, heading]] of sequence.entries()) {
      tour = await expectTourStep(page, id, heading);
      await expectBackdrop(page, tour);
      await expectTourFitsViewport(page);
      if (index < sequence.length - 1) await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    }

    const dialogHandle = await tour.dialog.elementHandle();
    const spotlightHandle = await tour.spotlight.elementHandle();
    for (let index = sequence.length - 2; index >= 0; index -= 1) {
      await tour.dialog.getByRole('button', { name: 'ย้อนกลับ' }).click();
      await expectTourStep(page, sequence[index][0], sequence[index][1]);
      await expectTourFitsViewport(page);
    }
    for (let index = 1; index < sequence.length; index += 1) {
      await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
      await expectTourStep(page, sequence[index][0], sequence[index][1]);
      await expectTourFitsViewport(page);
    }
    expect(await dialogHandle.evaluate((element) => element.isConnected)).toBe(true);
    expect(await spotlightHandle.evaluate((element) => element.isConnected)).toBe(true);
    await tour.dialog.getByRole('button', { name: 'เริ่มใช้งาน' }).click();

    tour = onboarding(page);
    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help?tour=playwright#getting-started');
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), onboardingStorageKey)).toBe('completed');
    await expect.poll(() => page.evaluate(() => history.length)).toBe(initialHistoryLength);
  });

  test('traps focus and restores the help launcher after Escape', async ({ page }) => {
    await page.addInitScript((storageKey) => window.localStorage.setItem(storageKey, 'completed'), onboardingStorageKey);
    await page.goto('/help');
    const launcher = page.getByRole('button', { name: 'เปิดคำแนะนำอีกครั้ง' });
    await launcher.focus();
    await launcher.click();
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    for (let index = 0; index < 8; index += 1) await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => document.querySelector('[data-tour-root="true"] [role="dialog"]')?.contains(document.activeElement) ?? false)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(tour.dialog).not.toBeVisible();
    await expect(page).toHaveURL('/help');
    await expect(launcher).toBeFocused();
  });

  test('fits all six steps on mobile dark mode with reduced motion', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const headings = [
      ['search', 'ค้นหากระทู้ที่ตรงกับคุณ'], ['explore', 'เลือกดูกระทู้ที่น่าสนใจ'],
      ['create', 'เข้าสู่ระบบแล้วสร้างกระทู้'], ['engage', 'ถูกใจและบันทึกเก็บไว้'],
      ['personal', 'โปรไฟล์และการแจ้งเตือน'], ['ai-safety', 'ใช้ ITHub Bot อย่างเหมาะสม'],
    ];
    for (const [index, [id, heading]] of headings.entries()) {
      const tour = await expectTourStep(page, id, heading);
      await expectBackdrop(page, tour);
      await expectTourFitsViewport(page);
      if (index < headings.length - 1) await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    }
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('keeps all steps in view across the design breakpoint matrix', async ({ browser }) => {
    const matrix = [
      { width: 390, height: 844, theme: 'light', reducedMotion: 'no-preference' },
      { width: 768, height: 900, theme: 'dark', reducedMotion: 'no-preference' },
      { width: 1024, height: 900, theme: 'light', reducedMotion: 'reduce' },
      { width: 1440, height: 1000, theme: 'dark', reducedMotion: 'no-preference' },
    ];
    const headings = [
      ['search', 'ค้นหากระทู้ที่ตรงกับคุณ'], ['explore', 'เลือกดูกระทู้ที่น่าสนใจ'],
      ['create', 'เข้าสู่ระบบแล้วสร้างกระทู้'], ['engage', 'ถูกใจและบันทึกเก็บไว้'],
      ['personal', 'โปรไฟล์และการแจ้งเตือน'], ['ai-safety', 'ใช้ ITHub Bot อย่างเหมาะสม'],
    ];

    for (const entry of matrix) {
      const context = await browser.newContext({
        viewport: { width: entry.width, height: entry.height },
        colorScheme: entry.theme,
        reducedMotion: entry.reducedMotion,
      });
      const matrixPage = await context.newPage();
      await matrixPage.addInitScript(({ key, theme }) => {
        window.localStorage.removeItem(key);
        window.localStorage.setItem('theme', theme);
      }, { key: onboardingStorageKey, theme: entry.theme });
      await matrixPage.goto('/');
      for (const [index, [id, heading]] of headings.entries()) {
        const tour = await expectTourStep(matrixPage, id, heading);
        await expectTourFitsViewport(matrixPage);
        await expect.poll(() => matrixPage.evaluate(() => document.documentElement.scrollWidth)).toBe(entry.width);
        if (index < headings.length - 1) await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
      }
      await expect(matrixPage.locator('html')).toHaveClass(entry.theme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await context.close();
    }
  });

  test('falls back gracefully when a target is unavailable', async ({ page }) => {
    await page.goto('/');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await page.addStyleTag({ content: '[data-tour="topic-card"], [data-tour="topic-list"] { display: none !important; }' });
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(tour.root).toHaveAttribute('data-tour-step', 'explore');
    await expect(tour.root).toHaveAttribute('data-tour-fallback', 'true', { timeout: 5_000 });
    await expect(tour.dialog.getByText(/ยังไม่พบส่วนนี้/)).toBeVisible();
    await expect(tour.fallbackShade).toBeVisible();
    await expect(tour.spotlight).toHaveCSS('opacity', '0');
    await expect(tour.root).not.toHaveAttribute('data-tour-placement', /center/);
  });

  test('keeps the previous geometry while the next target is still locating', async ({ page }) => {
    await page.goto('/');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    const initialDialogBox = await tour.dialog.boundingBox();
    const initialSpotlightBox = await tour.spotlight.boundingBox();
    expect(initialDialogBox).not.toBeNull();
    expect(initialSpotlightBox).not.toBeNull();

    const hiddenTargets = await page.addStyleTag({ content: '[data-tour="topic-card"], [data-tour="topic-list"] { display: none !important; }' });
    await hiddenTargets.evaluate((element) => { element.id = 'delayed-tour-targets'; });
    await page.evaluate(() => window.setTimeout(() => document.getElementById('delayed-tour-targets')?.remove(), 600));
    await tour.dialog.getByRole('button', { name: 'ถัดไป' }).click();

    await expect(tour.root).toHaveAttribute('data-tour-phase', 'locating');
    await expect(tour.root).toHaveAttribute('data-tour-step', 'search');
    await expect(tour.root).toHaveAttribute('data-tour-pending-step', 'explore');
    await page.waitForTimeout(150);
    const locatingDialogBox = await tour.dialog.boundingBox();
    const locatingSpotlightBox = await tour.spotlight.boundingBox();
    expect(Math.abs(locatingDialogBox.x - initialDialogBox.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(locatingDialogBox.y - initialDialogBox.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(locatingSpotlightBox.x - initialSpotlightBox.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(locatingSpotlightBox.y - initialSpotlightBox.y)).toBeLessThanOrEqual(2);
    await expect(tour.fallbackShade).toHaveCount(0);
    await expect(tour.root).not.toHaveAttribute('data-tour-placement', /center/);

    await expectTourStep(page, 'explore', 'เลือกดูกระทู้ที่น่าสนใจ');
    await expect(tour.root).toHaveAttribute('data-tour-phase', 'settled');
    await expectTourFitsViewport(page);
  });

  test('uses an opaque fallback when backdrop filters are unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const nativeSupports = window.CSS.supports.bind(window.CSS);
      window.CSS.supports = (property, value) => {
        if (property === 'backdrop-filter' || property === '-webkit-backdrop-filter') return false;
        return value === undefined ? nativeSupports(property) : nativeSupports(property, value);
      };
    });
    await page.goto('/');
    const tour = await expectTourStep(page, 'search', 'ค้นหากระทู้ที่ตรงกับคุณ');
    await expect(tour.shades.first()).toHaveAttribute('data-tour-shade-mode', 'fallback');
    await expect.poll(() => tour.shades.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return style.backgroundColor.includes('0.64') && (!(style.backdropFilter || style.webkitBackdropFilter) || (style.backdropFilter || style.webkitBackdropFilter) === 'none');
    })).toBe(true);
  });

  test('spotlights the member create action when authenticated', async ({ page }) => {
    await page.addInitScript((storageKey) => window.localStorage.setItem(storageKey, 'completed'), onboardingStorageKey);
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
    await page.getByRole('button', { name: 'เปิด ITHub Bot' }).click();
    await expect(page.getByText(/ITHub Bot/).first()).toBeVisible();
    await expect(page.locator('input[type="text"]').last()).toBeVisible();
  });

  test('logs in with the configured test account', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  });

  test('creates a topic', async ({ page }) => {
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
        const deleteTrigger = page.getByRole('button', { name: /ลบกระทู้/ });
        await deleteTrigger.focus();
        await deleteTrigger.click();
        const dialog = page.getByTestId('confirm-delete-dialog');
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(deleteTrigger).toBeFocused();

        await deleteTrigger.click();
        const confirmDelete = dialog.getByTestId('confirm-delete-submit');
        const deleteRequest = page.waitForRequest((request) => request.method() === 'POST');
        await confirmDelete.click();
        await expect(confirmDelete).toBeDisabled();
        await deleteRequest;
        await expect(page).toHaveURL((url) => url.pathname === '/');
      }
    }
  });

  test('clears ITHub Bot history with the in-app confirmation dialog', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ithub_bot_chat', JSON.stringify([
        { role: 'user', text: 'temporary message' },
      ]));
    });
    await page.goto('/help');
    await page.getByRole('button', { name: 'เปิด ITHub Bot' }).click();
    const clearTrigger = page.getByRole('button', { name: 'ล้างประวัติแชท' });
    await clearTrigger.click();
    const dialog = page.getByTestId('confirm-delete-dialog');
    await expect(dialog.getByRole('heading', { name: 'ล้างประวัติ ITHub Bot?' })).toBeVisible();
    await page.mouse.click(1, 1);
    await expect(dialog).not.toBeVisible();
    await expect(clearTrigger).toBeFocused();
    await clearTrigger.click();
    await dialog.getByTestId('confirm-delete-submit').click();
    await expect(dialog).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ithub_bot_chat'))[0].text)).toContain('รีเซ็ตระบบเรียบร้อย');
  });

  test('opens a search result without returning to the search page', async ({ page }) => {
    await page.goto('/');
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    await expect(firstTopic).toBeVisible();

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

  test('searches rich-text content in Thai and English', async ({ page }) => {
    for (const query of ['content-only-needle', 'เนื้อหาสำหรับทดสอบ']) {
      await page.goto(`/?search=${encodeURIComponent(query)}`);
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(query) })).toBeVisible();
      await expect(page.locator('#topic-feed').getByRole('heading', { level: 3, name: 'ITHub E2E Baseline Topic' })).toBeVisible();
    }
  });

  test('treats percent and underscore as literal search characters', async ({ page }) => {
    for (const query of ['%', '_']) {
      await page.goto(`/?search=${encodeURIComponent(query)}`);
      await expect(page.locator('#topic-feed').getByRole('heading', { level: 3, name: 'ITHub E2E Baseline Topic' })).toBeVisible();
    }
    for (const query of ['%%%%', '_____']) {
      await page.goto(`/?search=${encodeURIComponent(query)}`);
      await expect(page.getByText('ยังไม่พบกระทู้ที่ตรงกับเงื่อนไข')).toBeVisible();
    }
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
    await expect(page.getByRole('heading', { name: /หมวดหมู่ AI & Data/ })).toBeVisible();
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
    const chatButton = page.getByRole('button', { name: 'เปิด ITHub Bot' });
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
    const sidebarBox = await page.getByTestId('desktop-sidebar').boundingBox();
    const mainBox = await page.locator('#main-content').boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(mainBox.x);
  });

  test('requires authentication for Pusher channel subscriptions', async ({ page }) => {
    await page.goto('/');
    expect(await postPusherAuth(page, 'private-user-1')).toBe(401);
  });

  test('authorizes only the current user Pusher channel', async ({ page }) => {
    await login(page);
    const bell = page.getByRole('button', { name: 'เปิดการแจ้งเตือน' });
    const userId = await bell.getAttribute('data-user-id');
    expect(userId).toMatch(/^\d+$/);

    expect(await postPusherAuth(page, 'private-user-999999999')).toBe(403);
    expect(await postPusherAuth(page, `private-user-${userId}`)).toBe(200);
  });

  test('does not partially update a profile when the old password is wrong', async ({ page }) => {
    await login(page);
    await page.goto('/profile/edit');
    const usernameInput = page.locator('input[name="username"]');
    const originalUsername = await usernameInput.inputValue();
    await usernameInput.fill(`pwcheck_${Date.now()}`.slice(0, 40));
    await page.locator('input[name="oldPassword"]').fill('definitely-not-the-current-password');
    await page.locator('input[name="newPassword"]').fill('Temporary-password-123');
    await page.locator('input[name="confirmNewPassword"]').fill('Temporary-password-123');
    const submitProfile = page.getByRole('button', { name: 'บันทึกการแก้ไข' });
    await expect.poll(() => submitProfile.evaluate((button) => (
      Object.keys(button).some((key) => key.startsWith('__reactProps'))
    ))).toBe(true);
    await expect.poll(() => submitProfile.evaluate((button) => button.form?.checkValidity() ?? false)).toBe(true);
    await Promise.all([
      page.waitForURL(/notify=wrong_old_password/, { timeout: 15_000 }),
      submitProfile.click(),
    ]);
    await expect(page.locator('input[name="username"]')).toHaveValue(originalUsername);
  });

  test('offers a clear login action for signed-out engagement', async ({ page }) => {
    await page.goto('/');
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    await expect(firstTopic).toBeVisible();
    const topicPath = await firstTopic.getAttribute('href');
    await page.goto(topicPath);
    await expect(page).toHaveURL((url) => url.pathname === topicPath);
    await expect(page.locator('main h1')).toBeVisible();

    await expect(page.getByRole('button', { name: /ถูกใจกระทู้|ยกเลิกถูกใจ/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /บันทึกกระทู้|นำกระทู้ออก/ })).toHaveCount(0);
    const loginLink = page.locator('a[href^="/login?next=/topic/"]').first();
    await expect(loginLink).toHaveAttribute('href', /\/login\?next=\/topic\//);
  });

  test('toggles likes and bookmarks without leaving the topic', async ({ page }) => {
    await login(page);
    const firstTopic = page.locator('section a[href^="/topic/"]').first();
    await expect(firstTopic).toBeVisible();
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

  test('leaves no temporary Playwright topics behind', async ({ page }) => {
    await page.goto('/?search=Playwright%20topic');
    await expect(page.getByText('ยังไม่พบกระทู้ที่ตรงกับเงื่อนไข')).toBeVisible();
  });
});

test.describe('ITHub responsive layout regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'completed');
    }, onboardingStorageKey);
  });

  test('keeps shell, first topic, and floating controls within all target viewports', async ({ page }, testInfo) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1024, height: 900 },
      { width: 1440, height: 1000 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('#main-content')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

      const mainBox = await page.locator('#main-content').boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox.x).toBeGreaterThanOrEqual(0);
      expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(viewport.width);

      if (viewport.width >= 768) {
        const sidebar = page.getByTestId('desktop-sidebar');
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox).not.toBeNull();
        expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(mainBox.x);
        await expect(sidebar.getByRole('button', { name: /เมนูด้านข้าง/ })).toBeEnabled();
      } else {
        const firstTopic = page.locator('#topic-feed article').first();
        if (await firstTopic.count()) {
          await expect(firstTopic.locator('h3')).toBeVisible();
          await expect(firstTopic.locator('[aria-label*="ความคิดเห็น"]')).toBeVisible();
          const firstTopicBox = await firstTopic.boundingBox();
          expect(firstTopicBox).not.toBeNull();
          expect(firstTopicBox.y).toBeLessThan(viewport.height);
        }

        const chatBox = await page.getByRole('button', { name: 'เปิด ITHub Bot' }).boundingBox();
        const bottomNavBox = await page.getByRole('navigation', { name: 'เมนูมือถือ' }).boundingBox();
        expect(chatBox).not.toBeNull();
        expect(bottomNavBox).not.toBeNull();
        expect(chatBox.y + chatBox.height).toBeLessThanOrEqual(bottomNavBox.y);
      }

      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      expect(screenshot.byteLength).toBeGreaterThan(10_000);
      await testInfo.attach(`home-${viewport.width}-light`, { body: screenshot, contentType: 'image/png' });
    }
  });

  test('preserves readable hierarchy in dark mode and reduced motion', async ({ page }, testInfo) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      expect(screenshot.byteLength).toBeGreaterThan(10_000);
      await testInfo.attach(`home-${viewport.width}-dark-reduced-motion`, { body: screenshot, contentType: 'image/png' });
    }
  });

  test('keeps the shared shell stable while a sidebar route is loading', async ({ page }, testInfo) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });

    const leaderboardPrefetch = page.waitForResponse((response) => {
      const url = new URL(response.url());
      const headers = response.request().headers();
      return url.pathname === '/leaderboard'
        && url.searchParams.has('_rsc')
        && (headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch');
    });

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = request.headers();
      const isPrefetch = headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch';

      if (url.pathname === '/leaderboard' && url.searchParams.has('_rsc') && !isPrefetch) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      await route.continue();
    });

    await page.goto('/help');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await leaderboardPrefetch;

    const sidebar = page.getByTestId('desktop-sidebar');
    const main = page.locator('#main-content');
    await sidebar.getByRole('link', { name: 'อันดับสมาชิก' }).click({ noWaitAfter: true });

    const skeleton = page.getByTestId('route-loading-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(1);
    await expect(skeleton.locator('nav, main, [class*="fixed"], [class*="overflow-y-auto"]')).toHaveCount(0);

    const [sidebarBox, mainBox, skeletonBox] = await Promise.all([
      sidebar.boundingBox(),
      main.boundingBox(),
      skeleton.boundingBox(),
    ]);
    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(skeletonBox).not.toBeNull();
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(mainBox.x);
    expect(skeletonBox.x).toBeGreaterThanOrEqual(mainBox.x);
    expect(skeletonBox.x + skeletonBox.width).toBeLessThanOrEqual(mainBox.x + mainBox.width);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);

    const screenshot = await page.screenshot({ animations: 'disabled' });
    await testInfo.attach('sidebar-route-loading-dark-shell', { body: screenshot, contentType: 'image/png' });

    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(page.getByRole('heading', { level: 1, name: 'อันดับสมาชิก' })).toBeVisible();
  });

  test('toggles the desktop sidebar by keyboard without covering content', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/');
    const sidebar = page.getByTestId('desktop-sidebar');
    const toggle = sidebar.getByRole('button', { name: /เมนูด้านข้าง/ });
    const initialState = await toggle.getAttribute('aria-expanded');

    await toggle.focus();
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', initialState === 'true' ? 'false' : 'true');

    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await page.locator('#main-content').boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(mainBox.x);
  });

  test('keeps topic text within the reading measure on desktop and mobile', async ({ page }, testInfo) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const firstTopic = page.locator('#topic-feed a[href^="/topic/"]').first();
      await expect(firstTopic).toBeVisible();
      const topicPath = await firstTopic.getAttribute('href');

      for (const theme of ['light', 'dark']) {
        await page.evaluate((nextTheme) => window.localStorage.setItem('theme', nextTheme), theme);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(topicPath);
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
        const content = page.locator('.view-ql-editor:visible').first();
        await expect(content).toBeVisible();

        const contentBox = await content.boundingBox();
        expect(contentBox).not.toBeNull();
        expect(contentBox.width).toBeLessThanOrEqual(860);
        expect(contentBox.x).toBeGreaterThanOrEqual(0);
        expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(viewport.width);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

        const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
        expect(screenshot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`topic-${viewport.width}-${theme}`, { body: screenshot, contentType: 'image/png' });
      }
    }
  });
});
