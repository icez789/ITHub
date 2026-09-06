import { test, expect, request as apiRequest } from '@playwright/test';
import db from '../lib/db.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';

assertE2eSafety();

const email = process.env.ITHUB_E2E_EMAIL;
const password = process.env.ITHUB_E2E_PASSWORD;
const prefix = 'Phase 2 fixture';

async function account() {
  const [[user]] = await db.query('SELECT id, username FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) throw new Error('Missing E2E account');
  return user;
}

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL((url) => url.pathname === '/', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  await expect(page).toHaveURL('/', { timeout: 15_000 });
}

async function createUser(suffix, { banned = false } = {}) {
  const username = `p2_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
  const userEmail = `playwright.phase2.${suffix}@example.invalid`;
  const [result] = await db.query(
    "INSERT INTO users (username, email, password, is_banned) VALUES (?, ?, 'not-a-login-account', ?)",
    [username, userEmail, banned ? 1 : 0],
  );
  return { id: result.insertId, username, email: userEmail };
}

async function createTopic(title, userId, category = 'Hardware') {
  const [result] = await db.query(
    'INSERT INTO topics (title, category, content, user_id, views) VALUES (?, ?, ?, ?, 8)',
    [title, category, '<p>เนื้อหาสำหรับตรวจ Personalized Discovery</p>', userId],
  );
  return result.insertId;
}

async function replayFollow(page, actionRequest, args, client = page.request) {
  const response = await client.post(actionRequest.url(), {
    headers: {
      'next-action': actionRequest.headers()['next-action'],
      'content-type': 'text/plain;charset=UTF-8',
      origin: new URL(page.url()).origin,
    },
    data: JSON.stringify(args),
  });
  expect(response.ok()).toBe(true);
  return response.text();
}

async function cleanup() {
  const actor = await account();
  await db.query('DELETE FROM topics WHERE title LIKE ?', [`${prefix}%`]);
  await db.query("DELETE FROM users WHERE email LIKE 'playwright.phase2.%@example.invalid'");
  await db.query('DELETE FROM user_category_follows WHERE user_id = ?', [actor.id]);
  await db.query('DELETE FROM user_author_follows WHERE follower_id = ?', [actor.id]);
  await db.query('DELETE FROM notification_preferences WHERE user_id = ?', [actor.id]);
}

test.describe('Phase 2 personalized discovery', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ithub_onboarding_v2', 'completed'));
    await cleanup();
  });

  test.afterEach(async () => cleanup());

  test('keeps personalized data behind authentication', async ({ page }) => {
    await page.goto('/?category=Hardware&notify=login_success#topic-feed');
    await expect(page).toHaveURL('/?category=Hardware#topic-feed');
    await page.goto('/?feed=following');
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล' })).toBeVisible();
    await expect(page.getByLabel('รายการกระทู้').getByRole('link', { name: 'เข้าสู่ระบบ' })).toHaveAttribute('href', /next=/);
    await page.goto('/?feed=for-you');
    const forYouEnabled = process.env.ITHUB_DISCOVERY_FOR_YOU_ENABLED === 'true';
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล' })).toHaveCount(forYouEnabled ? 1 : 0);
    await expect(page.getByLabel('เรียงลำดับกระทู้')).toHaveCount(forYouEnabled ? 0 : 1);
    await expect(page.getByRole('link', { name: 'สำหรับคุณ', exact: true })).toHaveCount(forYouEnabled ? 1 : 0);
    if (!forYouEnabled) await expect(page.locator('#topic-feed article').first()).toBeVisible();
    await page.goto('/profile/following');
    await expect(page).toHaveURL('/login?next=%2Fprofile%2Ffollowing');
  });

  test('follows a category and author, deduplicates Following, and explains For You', async ({ page }, testInfo) => {
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const author = await createUser(`author_${suffix}`);
    const categoryAuthor = await createUser(`category_${suffix}`);
    const searchTerm = `${prefix} rank ${suffix}`;
    const title = `${searchTerm} both-old`;
    const newerBothTitle = `${searchTerm} both-new`;
    const authorOnlyTitle = `${searchTerm} author-only`;
    const categoryOnlyTitle = `${searchTerm} category-only`;
    const topicId = await createTopic(title, author.id);
    await createTopic(newerBothTitle, author.id);
    await createTopic(authorOnlyTitle, author.id, 'Software');
    await createTopic(categoryOnlyTitle, categoryAuthor.id);

    await login(page);
    await page.goto('/?feed=for-you');
    await expect(page.getByRole('heading', { name: 'เริ่มจากเลือกหมวดที่คุณสนใจ' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^ติดตาม หมวด/ })).toHaveCount(5);
    await expect(page.getByRole('heading', { name: 'กำลังได้รับความนิยมในชุมชน' })).toBeVisible();
    await page.goto('/?category=Hardware');
    const categoryButton = page.getByRole('button', { name: 'ติดตาม หมวด Hardware' });
    await categoryButton.focus();
    await categoryButton.press('Enter');
    await expect(categoryButton).toHaveAttribute('aria-pressed', 'true');

    await page.goto(`/topic/${topicId}`);
    const authorButton = page.getByRole('button', { name: `ติดตาม ${author.username}` });
    await authorButton.click();
    await expect(authorButton).toHaveAttribute('aria-pressed', 'true');

    await page.goto(`/?feed=following&search=${encodeURIComponent(searchTerm)}`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await expect(page.getByText(newerBothTitle, { exact: true })).toHaveCount(1);
    await expect(page.getByText(authorOnlyTitle, { exact: true })).toHaveCount(1);
    await expect(page.getByText(categoryOnlyTitle, { exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /จัดการสิ่งที่ติดตาม/ })).toBeVisible();

    await page.goto(`/?feed=for-you&search=${encodeURIComponent(searchTerm)}&sort=likes`);
    await expect(page.getByText(title, { exact: true })).toHaveCount(1);
    await expect(page.getByText('ติดตามผู้เขียนและหมวดนี้', { exact: true })).toHaveCount(2);
    await expect(page.getByText('ติดตามผู้เขียน', { exact: true })).toBeVisible();
    await expect(page.getByText('ติดตามหมวดนี้', { exact: true })).toBeVisible();
    await expect(page.locator('#topic-feed h3')).toHaveText([
      newerBothTitle,
      title,
      authorOnlyTitle,
      categoryOnlyTitle,
    ]);
    await expect(page.getByLabel('เรียงลำดับกระทู้')).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.searchParams.get('feed') === 'for-you');

    for (let index = 0; index < 6; index += 1) {
      await createTopic(`${searchTerm} page-${index}`, author.id, 'Software');
    }
    await page.goto('/?feed=for-you');
    await expect(page.getByRole('region', { name: 'กำลังได้รับความนิยมในชุมชน' }).getByText(searchTerm, { exact: false })).toHaveCount(0);
    await page.goto(`/?feed=for-you&search=${encodeURIComponent(searchTerm)}&sort=likes`);
    const forYouNextPage = page.getByRole('link', { name: 'ถัดไป' });
    await expect(forYouNextPage).toHaveAttribute('href', /feed=for-you/);
    await expect(forYouNextPage).not.toHaveAttribute('href', /sort=/);

    await page.goto(`/?feed=following&search=${encodeURIComponent(searchTerm)}&sort=popular`);
    await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
    const nextPage = page.getByRole('link', { name: 'ถัดไป' });
    await expect(nextPage).toHaveAttribute('href', /feed=following/);
    await expect(nextPage).toHaveAttribute('href', /sort=popular/);
    await nextPage.click();
    await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2');

    await page.goto(`/?feed=following&search=${encodeURIComponent(searchTerm)}&category=Software&sort=popular`);
    await expect(page.getByText(authorOnlyTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(categoryOnlyTitle, { exact: true })).toHaveCount(0);

    await page.goto('/profile/following');
    await expect(page.getByRole('heading', { name: 'สิ่งที่ติดตาม' })).toBeVisible();
    await expect(page.getByText(author.username, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'เลิกติดตาม หมวด Hardware' })).toBeVisible();
  });

  test('keeps follow mutations idempotent and validates direct action requests', async ({ page }, testInfo) => {
    const actor = await account();
    const author = await createUser(`idempotent_${Date.now()}_${testInfo.project.name}`);
    const topicId = await createTopic(`${prefix} idempotent ${author.id}`, author.id);
    await login(page);
    await page.goto('/?category=Hardware');
    const categoryRequest = page.waitForRequest((request) => request.method() === 'POST'
      && Boolean(request.headers()['next-action']) && request.postData() === JSON.stringify(['Hardware', true]));
    await page.getByRole('button', { name: 'ติดตาม หมวด Hardware' }).click();
    const categoryAction = await categoryRequest;
    await expect(page.getByRole('button', { name: 'เลิกติดตาม หมวด Hardware' })).toBeEnabled();
    await replayFollow(page, categoryAction, ['Hardware', true]);
    await replayFollow(page, categoryAction, ['Hardware', 'invalid']);
    await replayFollow(page, categoryAction, ['invalid-category', true]);
    const [[categories]] = await db.query('SELECT COUNT(*) AS count FROM user_category_follows WHERE user_id = ?', [actor.id]);
    expect(Number(categories.count)).toBe(1);

    await page.getByRole('navigation', { name: 'หมวดหมู่', exact: true }).getByRole('link', { name: 'Software', exact: true }).click();
    await expect(page.getByRole('button', { name: 'ติดตาม หมวด Software' })).toHaveAttribute('aria-pressed', 'false');
    await replayFollow(page, categoryAction, ['Hardware', false]);
    await replayFollow(page, categoryAction, ['Hardware', false]);

    await page.goto(`/topic/${topicId}`);
    const authorRequest = page.waitForRequest((request) => request.method() === 'POST'
      && Boolean(request.headers()['next-action']) && request.postData() === JSON.stringify([author.id, true]));
    await page.getByRole('button', { name: `ติดตาม ${author.username}` }).click();
    const authorAction = await authorRequest;
    await expect(page.getByRole('button', { name: `เลิกติดตาม ${author.username}` })).toBeEnabled();
    await replayFollow(page, authorAction, [author.id, true]);
    await replayFollow(page, authorAction, [actor.id, true]);
    await replayFollow(page, authorAction, [2_147_483_647, true]);
    const [[authors]] = await db.query('SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = ?', [actor.id]);
    expect(Number(authors.count)).toBe(1);
    expect(await replayFollow(page, authorAction, [author.id, false])).toContain('เลิกติดตามผู้เขียนแล้ว');
    expect(await replayFollow(page, authorAction, [author.id, false])).toContain('เลิกติดตามผู้เขียนแล้ว');
    const guest = await apiRequest.newContext();
    try {
      expect(await replayFollow(page, authorAction, [author.id, true], guest)).toContain('เปลี่ยนการติดตามผู้เขียนไม่สำเร็จ');
      expect(await replayFollow(page, categoryAction, ['Hardware', true], guest)).toContain('เปลี่ยนการติดตามหมวดไม่สำเร็จ');
    } finally {
      await guest.dispose();
    }
    const [[after]] = await db.query(`SELECT
      (SELECT COUNT(*) FROM user_category_follows WHERE user_id = ?) AS categories,
      (SELECT COUNT(*) FROM user_author_follows WHERE follower_id = ?) AS authors`, [actor.id, actor.id]);
    expect(Number(after.categories)).toBe(0);
    expect(Number(after.authors)).toBe(0);
  });

  test('rejects unavailable authors and hides self-follow', async ({ page }, testInfo) => {
    const actor = await account();
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const banned = await createUser(`banned_${suffix}`, { banned: true });
    const bannedTopicId = await createTopic(`${prefix} banned ${suffix}`, banned.id);
    const ownTopicId = await createTopic(`${prefix} own ${suffix}`, actor.id, 'General');

    await login(page);
    await page.goto(`/topic/${bannedTopicId}`);
    await page.getByRole('button', { name: `ติดตาม ${banned.username}` }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ไม่พบบัญชีผู้เขียนหรือบัญชีนี้ไม่พร้อมใช้งาน' })).toHaveText('ไม่พบบัญชีผู้เขียนหรือบัญชีนี้ไม่พร้อมใช้งาน');
    const [[followRow]] = await db.query(
      'SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = ? AND author_id = ?',
      [actor.id, banned.id],
    );
    expect(Number(followRow.count)).toBe(0);

    await page.goto(`/topic/${ownTopicId}`);
    await expect(page.getByRole('button', { name: `ติดตาม ${actor.username}` })).toHaveCount(0);

    // A member must be able to remove a follow after its author is suspended.
    await db.query('INSERT INTO user_author_follows (follower_id, author_id) VALUES (?, ?)', [actor.id, banned.id]);
    await page.goto('/profile/following');
    await page.getByRole('button', { name: `เลิกติดตาม ${banned.username}` }).click();
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = ? AND author_id = ?',
      [actor.id, banned.id],
    ))[0][0].count), { timeout: 15_000 }).toBe(0);
  });

  test('enforces the private 200-author follow limit', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The data-layer limit is covered once; cross-browser behavior is covered by the other follow tests.');
    const actor = await account();
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const target = await createUser(`limit_target_${suffix}`);
    const targetTopicId = await createTopic(`${prefix} limit ${suffix}`, target.id);
    const userRows = Array.from({ length: 200 }, (_, index) => [
      `p2_limit_${suffix}_${index}`.slice(0, 50),
      `playwright.phase2.limit.${suffix}.${index}@example.invalid`,
      'not-a-login-account',
    ]);
    await db.query('INSERT INTO users (username, email, password) VALUES ?', [userRows]);
    const [followedAuthors] = await db.query(
      "SELECT id FROM users WHERE email LIKE 'playwright.phase2.limit.%@example.invalid' ORDER BY id",
    );
    await db.query(
      'INSERT INTO user_author_follows (follower_id, author_id) VALUES ?',
      [followedAuthors.map((author) => [actor.id, author.id])],
    );

    await login(page);
    await page.goto(`/topic/${targetTopicId}`);
    await page.getByRole('button', { name: `ติดตาม ${target.username}` }).click();
    await expect(page.getByText('ติดตามผู้เขียนได้สูงสุด 200 คน')).toBeVisible();
    const [[countRow]] = await db.query(
      'SELECT COUNT(*) AS count FROM user_author_follows WHERE follower_id = ?',
      [actor.id],
    );
    expect(Number(countRow.count)).toBe(200);
    await page.goto('/profile/following');
    await expect(page.locator('#main-content article')).toHaveCount(20);
    await page.getByRole('navigation', { name: 'หน้ารายการผู้เขียนที่ติดตาม' }).getByRole('link', { name: 'ถัดไป' }).click();
    await expect(page).toHaveURL('/profile/following?page=2');
    await expect(page.locator('#main-content article')).toHaveCount(20);
  });

  test('uses default notification preferences and persists explicit changes', async ({ page }) => {
    const actor = await account();
    const [[before]] = await db.query('SELECT COUNT(*) AS count FROM notification_preferences WHERE user_id = ?', [actor.id]);
    expect(Number(before.count)).toBe(0);

    await login(page);
    await page.goto('/notifications');
    const comments = page.locator('input[name="comments_enabled"]');
    const likes = page.locator('input[name="likes_enabled"]');
    const solutions = page.locator('input[name="solutions_enabled"]');
    const followedCategories = page.locator('input[name="followed_categories_enabled"]');
    const followedAuthors = page.locator('input[name="followed_authors_enabled"]');
    await expect(comments).toBeChecked();
    await expect(likes).toBeChecked();
    await expect(solutions).toBeChecked();
    await expect(followedCategories).not.toBeChecked();
    await expect(followedAuthors).not.toBeChecked();
    const [[afterRead]] = await db.query('SELECT COUNT(*) AS count FROM notification_preferences WHERE user_id = ?', [actor.id]);
    expect(Number(afterRead.count)).toBe(0);

    await comments.uncheck();
    await followedCategories.check();
    await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'บันทึกการตั้งค่าการแจ้งเตือนแล้ว' })).toBeVisible();
    await expect.poll(async () => {
      const [[row]] = await db.query(
        'SELECT comments_enabled, followed_categories_enabled FROM notification_preferences WHERE user_id = ?',
        [actor.id],
      );
      return `${row.comments_enabled}:${row.followed_categories_enabled}`;
    }, { timeout: 15_000 }).toBe('0:1');

    await page.reload();
    await expect(page.locator('input[name="comments_enabled"]')).not.toBeChecked();
    await expect(page.locator('input[name="followed_categories_enabled"]')).toBeChecked();
  });

  test('honors disabled activity preferences while preserving moderation notifications', async ({ page }, testInfo) => {
    const actor = await account();
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const owner = await createUser(`quiet_${suffix}`);
    await db.query("UPDATE users SET role = 'teacher' WHERE id = ?", [owner.id]);
    const topicId = await createTopic(`${prefix} quiet ${suffix}`, owner.id, 'General');
    await db.query(
      'INSERT INTO notification_preferences (user_id, comments_enabled, likes_enabled) VALUES (?, 0, 0)',
      [owner.id],
    );

    await login(page);
    await page.goto(`/topic/${topicId}`);
    const likeButton = page.locator('#main-content button[data-tour="engagement-focus"]:visible').first();
    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
    await page.locator('.ql-editor').last().fill('ความคิดเห็นที่ไม่ควรสร้าง notification');
    await page.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM comments WHERE topic_id = ? AND user_id = ?',
      [topicId, actor.id],
    ))[0][0].count), { timeout: 15_000 }).toBe(1);
    const [[notificationRow]] = await db.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND actor_id = ? AND topic_id = ? AND type IN ('comment', 'like')",
      [owner.id, actor.id, topicId],
    );
    expect(Number(notificationRow.count)).toBe(0);
    await page.getByRole('button', { name: 'แจ้งเนื้อหาไม่เหมาะสม' }).first().click();
    await page.locator('textarea[name="reason"]').fill('รายงานทดสอบที่ต้องส่งให้ผู้ดูแลเสมอ');
    await page.getByRole('button', { name: 'ส่งแจ้งเตือน', exact: true }).click();
    await expect.poll(async () => Number((await db.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND topic_id = ? AND type = 'report'",
      [owner.id, topicId],
    ))[0][0].count), { timeout: 15_000 }).toBe(1);
  });

  test('creates one follow notification for overlapping signals and a solution notification', async ({ page }, testInfo) => {
    const actor = await account();
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const recipient = await createUser(`recipient_${suffix}`);
    const quietRecipient = await createUser(`default_off_${suffix}`);
    await db.query('INSERT INTO user_category_follows (user_id, category) VALUES (?, ?)', [quietRecipient.id, 'Hardware']);
    await db.query('INSERT INTO user_author_follows (follower_id, author_id) VALUES (?, ?)', [quietRecipient.id, actor.id]);
    await db.query('INSERT INTO user_category_follows (user_id, category) VALUES (?, ?)', [recipient.id, 'Hardware']);
    await db.query('INSERT INTO user_author_follows (follower_id, author_id) VALUES (?, ?)', [recipient.id, actor.id]);
    await db.query(
      'INSERT INTO notification_preferences (user_id, followed_categories_enabled, followed_authors_enabled) VALUES (?, 1, 1)',
      [recipient.id],
    );

    await login(page);
    await page.goto('/create');
    const title = `${prefix} fanout ${suffix}`;
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="category"]').selectOption('Hardware');
    await page.locator('.ql-editor').fill('รายละเอียดสำหรับทดสอบ personalized notification');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/topic\/\d+/, { timeout: 15_000 });
    const topicId = Number(new URL(page.url()).pathname.split('/').pop());

    await expect.poll(async () => Number((await db.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND topic_id = ? AND type = 'follow_topic'",
      [recipient.id, topicId],
    ))[0][0].count), { timeout: 15_000 }).toBe(1);

    const [[quiet]] = await db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND topic_id = ?', [quietRecipient.id, topicId]);
    expect(Number(quiet.count)).toBe(0);

    const [commentResult] = await db.query(
      'INSERT INTO comments (topic_id, content, user_id) VALUES (?, ?, ?)',
      [topicId, '<p>คำตอบจากผู้ติดตาม</p>', recipient.id],
    );
    await page.reload();
    await page.getByRole('button', { name: 'เลือกความคิดเห็นนี้เป็นคำตอบ' }).click();
    await page.getByTestId('confirm-solution-dialog').getByTestId('confirm-delete-submit').click();
    await expect.poll(async () => Number((await db.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND topic_id = ? AND type = 'solution'",
      [recipient.id, topicId],
    ))[0][0].count), { timeout: 15_000 }).toBe(1);
    await expect.poll(async () => Number((await db.query(
      'SELECT is_solution FROM comments WHERE id = ?',
      [commentResult.insertId],
    ))[0][0].is_solution), { timeout: 15_000 }).toBe(1);
    await db.query('UPDATE notification_preferences SET solutions_enabled = 0 WHERE user_id = ?', [recipient.id]);
    const [secondComment] = await db.query('INSERT INTO comments (topic_id, content, user_id) VALUES (?, ?, ?)', [topicId, '<p>คำตอบถัดไปที่ไม่ต้องแจ้งเตือน</p>', recipient.id]);
    await page.reload();
    await page.getByRole('button', { name: 'เลือกความคิดเห็นนี้เป็นคำตอบ' }).click();
    await page.getByTestId('confirm-solution-dialog').getByTestId('confirm-delete-submit').click();
    await expect.poll(async () => Number((await db.query('SELECT is_solution FROM comments WHERE id = ?', [secondComment.insertId]))[0][0].is_solution), { timeout: 15_000 }).toBe(1);
    const [[solutionNotifications]] = await db.query("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND topic_id = ? AND type = 'solution'", [recipient.id, topicId]);
    expect(Number(solutionNotifications.count)).toBe(1);
  });

  test('keeps discovery surfaces inside every palette and target viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The full visual matrix runs once; functional discovery tests run in every browser.');
    test.setTimeout(300_000);
    const actor = await account();
    const suffix = `${Date.now()}_${testInfo.project.name}`;
    const author = await createUser(`visual_${suffix}`);
    const title = `${prefix} visual ${suffix}`;
    await createTopic(title, author.id);
    await db.query('INSERT INTO user_category_follows (user_id, category) VALUES (?, ?)', [actor.id, 'Hardware']);
    await db.query('INSERT INTO user_author_follows (follower_id, author_id) VALUES (?, ?)', [actor.id, author.id]);
    await login(page);

    const palettes = ['classic', 'ocean', 'forest', 'violet', 'amber'];
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1024, height: 900 },
      { width: 1440, height: 1000 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const mode of ['light', 'dark']) {
        for (const palette of palettes) {
          await page.evaluate(([nextMode, nextPalette]) => {
            localStorage.setItem('theme', nextMode);
            localStorage.setItem('ithub_palette_v1', nextPalette);
          }, [mode, palette]);
          await page.goto('/?feed=for-you');
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
          await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
          const ratios = await page.evaluate(() => {
            const styles = getComputedStyle(document.documentElement);
            const luminance = (token) => {
              const rawColor = styles.getPropertyValue(token).trim().replace('#', '');
              const color = rawColor.length === 3 ? [...rawColor].map((digit) => digit + digit).join('') : rawColor;
              const rgb = [0, 2, 4].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
                .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
              return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
            };
            return [
              ['--app-text', '--app-surface'],
              ['--app-text-muted', '--app-surface'],
              ['--app-text-muted', '--app-surface-subtle'],
              ['--app-accent-text', '--app-primary-soft'],
              ['--app-primary-contrast', '--app-primary'],
            ].map(([foreground, background]) => {
              const a = luminance(foreground);
              const b = luminance(background);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            });
          });
          for (const ratio of ratios) expect(ratio, `${palette} ${mode} text/control contrast`).toBeGreaterThanOrEqual(4.5);
          await expect(page.getByRole('link', { name: 'สำหรับคุณ' })).toHaveAttribute('aria-current', 'page');
          await expect(page.locator('#topic-feed').getByText(title, { exact: true })).toBeVisible();
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
          const mainBox = await page.locator('#main-content').boundingBox();
          expect(mainBox).not.toBeNull();
          expect(mainBox.x).toBeGreaterThanOrEqual(0);
          expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(viewport.width);
          if (viewport.width === 390) {
            const topicCard = page.locator('#topic-feed article').filter({ hasText: title });
            const topicBox = await topicCard.getByText(title, { exact: true }).boundingBox();
            const metadataBox = await topicCard.locator('[aria-label*="ความคิดเห็น"]').boundingBox();
            expect(topicBox).not.toBeNull();
            expect(metadataBox).not.toBeNull();
            expect(topicBox.y).toBeLessThan(viewport.height);
            expect(metadataBox.y + metadataBox.height).toBeLessThanOrEqual(viewport.height);
          }
          if (viewport.width === 390 || viewport.width === 1440) {
            const screenshot = await page.screenshot({ path: testInfo.outputPath(`for-you-${viewport.width}-${palette}-${mode}.png`), fullPage: true, animations: 'disabled' });
            await testInfo.attach(`for-you-${viewport.width}-${palette}-${mode}`, { body: screenshot, contentType: 'image/png' });
          }
        }
      }
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ['/', '/?feed=following', '/notifications', '/profile/following']) {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize(viewport);
        await page.goto(route);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
        if (route === '/notifications' && viewport.width === 390) {
          // The floating chat control must not cover the mobile checkboxes.
          for (const checkbox of await page.getByRole('checkbox').all()) {
            await checkbox.scrollIntoViewIfNeeded();
            await expect.poll(() => checkbox.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
              return hit === element || element.contains(hit);
            })).toBe(true);
          }
          await page.evaluate(() => {
            document.getElementById('main-content').scrollTop = 0;
            window.scrollTo(0, 0);
          });
        }
        const label = route === '/' ? 'community' : route === '/notifications' ? 'notification-settings' : route === '/profile/following' ? 'follow-management' : 'following';
        const screenshot = await page.screenshot({ path: testInfo.outputPath(`${label}-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
        await testInfo.attach(`${label}-${viewport.width}`, { body: screenshot, contentType: 'image/png' });
        const control = page.locator('#main-content button').first();
        if (await control.count()) {
          const duration = await control.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
          expect(duration).toBeLessThanOrEqual(0.00001);
        }
      }
    }
  });
});
