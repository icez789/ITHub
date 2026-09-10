import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';

import db from '../lib/db.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';
import { authorizeVercelPreview } from './preview-access.mjs';

assertE2eSafety();

const password = process.env.ITHUB_E2E_PASSWORD;
const fixtureEmailPrefix = 'playwright.pilot.tasks.';
const fixtureTitlePrefix = 'Pilot five-task fixture';

async function createAccount(label, { loginEnabled = false } = {}) {
  const suffix = `${Date.now()}.${randomUUID().slice(0, 8)}`;
  const email = `${fixtureEmailPrefix}${label}.${suffix}@example.invalid`;
  const username = `pilot_task_${label}_${suffix}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 50);
  const passwordHash = loginEnabled
    ? await bcrypt.hash(password, 6)
    : 'not-a-login-account';
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, \'user\')',
    [username, email, passwordHash],
  );
  return { id: Number(result.insertId), email, username };
}

async function createSearchTopic(authorId, title) {
  const [result] = await db.query(
    `INSERT INTO topics (title, category, content, user_id)
     VALUES (?, 'Software', '<p>Pilot fixture without personal information</p>', ?)`,
    [title, authorId],
  );
  return Number(result.insertId);
}

async function cleanupFixtures() {
  await db.query('DELETE FROM topics WHERE title LIKE ?', [`${fixtureTitlePrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [`${fixtureEmailPrefix}%`]);
}

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('อีเมล').fill(account.email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
}

async function enableAnalytics(page, userId) {
  await page.goto('/feedback');
  await page.locator('input[name="acknowledged"]').check();
  await page.getByRole('button', { name: 'ยินยอม Research Analytics' }).click();
  await expect(page.getByText('ยินยอมอยู่')).toBeVisible();
  await expect.poll(async () => {
    const [[consent]] = await db.query(
      'SELECT subject_key, status FROM analytics_consents WHERE user_id = ? LIMIT 1',
      [userId],
    );
    return consent?.status === 'active' ? consent.subject_key : null;
  }).toMatch(/^[a-f0-9]{64}$/);
  const [[consent]] = await db.query(
    'SELECT subject_key FROM analytics_consents WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return consent.subject_key;
}

async function observedPilotTasks(subjectKey) {
  const [[row]] = await db.query(
    `SELECT
       EXISTS(
         SELECT 1 FROM analytics_events searched
         INNER JOIN analytics_events opened
           ON opened.subject_key = searched.subject_key
          AND opened.session_key = searched.session_key
          AND opened.event_name = 'search_result_opened'
          AND opened.occurred_at >= searched.occurred_at
          AND opened.occurred_at <= DATE_ADD(searched.occurred_at, INTERVAL 5 MINUTE)
         WHERE searched.subject_key = ? AND searched.event_name = 'search_performed'
       ) AS task_1,
       EXISTS(
         SELECT 1 FROM analytics_events
         WHERE subject_key = ? AND event_name = 'topic_created' AND outcome = 'success'
       ) AS task_2,
       EXISTS(
         SELECT 1 FROM analytics_events
         WHERE subject_key = ? AND event_name = 'comment_created' AND outcome = 'success'
       ) AS task_3,
       EXISTS(
         SELECT 1 FROM analytics_events
         WHERE subject_key = ? AND event_name IN ('like_changed', 'bookmark_changed')
           AND JSON_UNQUOTE(JSON_EXTRACT(properties, '$.active')) = 'true'
       ) AS task_4,
       EXISTS(
         SELECT 1 FROM analytics_events followed
         INNER JOIN analytics_events feed
           ON feed.subject_key = followed.subject_key
          AND feed.event_name = 'feed_viewed'
          AND JSON_UNQUOTE(JSON_EXTRACT(feed.properties, '$.feed')) IN ('following', 'for_you')
         WHERE followed.subject_key = ?
           AND followed.event_name IN ('category_follow_changed', 'author_follow_changed')
           AND JSON_UNQUOTE(JSON_EXTRACT(followed.properties, '$.active')) = 'true'
       ) AS task_5`,
    [subjectKey, subjectKey, subjectKey, subjectKey, subjectKey],
  );
  return [row.task_1, row.task_2, row.task_3, row.task_4, row.task_5]
    .map((value) => Number(value));
}

async function expectPilotTaskObserved(subjectKey, taskIndex) {
  await expect.poll(
    async () => (await observedPilotTasks(subjectKey))[taskIndex - 1],
    { timeout: 30_000 },
  ).toBe(1);
}

test.describe('Research Pilot five-task external-service boundary', () => {
  test.describe.configure({ mode: 'serial', timeout: 240_000 });

  test.beforeEach(async ({ page }) => {
    await cleanupFixtures();
    await page.addInitScript(() => {
      window.localStorage.setItem('ithub_onboarding_v2', 'completed');
      window.localStorage.setItem('theme', 'light');
      window.localStorage.setItem('ithub_palette_v1', 'classic');
    });
    await authorizeVercelPreview(page);
  });

  test.afterEach(async () => cleanupFixtures());

  test('completes all five Pilot tasks without Pusher, Gemini, or Cloudinary', async ({ page }) => {
    const actor = await createAccount('actor', { loginEnabled: true });
    const author = await createAccount('author');
    const suffix = randomUUID().slice(0, 8);
    const searchTitle = `${fixtureTitlePrefix} searchable ${suffix}`;
    const createdTitle = `${fixtureTitlePrefix} created ${suffix}`;
    const commentText = `Pilot task comment ${suffix}`;
    const searchTopicId = await createSearchTopic(author.id, searchTitle);

    await login(page, actor);
    const subjectKey = await enableAnalytics(page, actor.id);

    await page.goto('/');
    const searchInput = page.locator('input[aria-label="ค้นหากระทู้"]:visible');
    await searchInput.fill(searchTitle);
    await expect(page).toHaveURL((url) => url.searchParams.get('search') === searchTitle);
    const searchCard = page.locator('#topic-feed article').filter({
      has: page.getByRole('heading', { level: 3, name: searchTitle }),
    });
    await expect(searchCard).toBeVisible();
    await searchCard.locator('a[href^="/topic/"]').click();
    await expect(page).toHaveURL((url) => url.pathname === `/topic/${searchTopicId}`);
    await expect(page.getByRole('heading', { level: 1, name: searchTitle })).toBeVisible();
    await expectPilotTaskObserved(subjectKey, 1);

    await page.goto('/create');
    await page.locator('input[name="title"]').fill(createdTitle);
    await page.locator('select[name="category"]').selectOption('Software');
    await page.locator('.ql-editor').fill('Pilot topic content without personal information.');
    await page.getByRole('button', { name: 'โพสต์กระทู้' }).click();
    await expect(page).toHaveURL(/\/topic\/\d+$/);
    const createdTopicId = Number(new URL(page.url()).pathname.split('/').pop());
    await expect.poll(async () => {
      const [[topic]] = await db.query(
        'SELECT image_url FROM topics WHERE id = ? AND user_id = ? AND title = ?',
        [createdTopicId, actor.id, createdTitle],
      );
      return topic ? { found: true, imageUrl: topic.image_url } : { found: false, imageUrl: 'missing' };
    }).toEqual({ found: true, imageUrl: null });
    await expectPilotTaskObserved(subjectKey, 2);

    await page.goto(`/topic/${searchTopicId}`);
    await page.locator('.ql-editor').last().fill(commentText);
    await page.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM comments WHERE topic_id = ? AND user_id = ?',
      [searchTopicId, actor.id],
    ))[0][0].count)).toBe(1);
    await expect(page.getByText(commentText, { exact: true })).toBeVisible();
    await expectPilotTaskObserved(subjectKey, 3);

    const likeButton = page.getByRole('button', { name: /ถูกใจกระทู้|ยกเลิกถูกใจ/ });
    const bookmarkButton = page.getByRole('button', { name: /บันทึกกระทู้|นำกระทู้ออก/ });
    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true');
    await bookmarkButton.click();
    await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
    await expectPilotTaskObserved(subjectKey, 4);

    const followButton = page.getByRole('button', { name: `ติดตาม ${author.username}` });
    await followButton.click();
    await expect(followButton).toHaveAttribute('aria-pressed', 'true');
    await page.goto(`/?feed=following&search=${encodeURIComponent(searchTitle)}`);
    await expect(page).toHaveURL((url) => url.searchParams.get('feed') === 'following');
    await expect(page.getByRole('heading', { level: 3, name: searchTitle })).toBeVisible();
    await expectPilotTaskObserved(subjectKey, 5);

    await expect.poll(
      () => observedPilotTasks(subjectKey),
      { timeout: 30_000 },
    ).toEqual([1, 1, 1, 1, 1]);
  });
});
