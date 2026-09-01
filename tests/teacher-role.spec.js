import { test, expect } from '@playwright/test';
import db from '../lib/db.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';
import { ASSIGNABLE_ROLES, isAdminRole, isContentModeratorRole } from '../lib/roles.js';

assertE2eSafety();

const email = process.env.ITHUB_E2E_EMAIL;
const password = process.env.ITHUB_E2E_PASSWORD;
const fixtureTitlePrefix = 'Teacher cascade fixture';
const fixtureEmailPrefix = 'playwright.teacher.';

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

async function accountId() {
  const [[user]] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) throw new Error('Missing configured E2E account');
  return user.id;
}

async function setAccountRole(role) {
  await db.query('UPDATE users SET role = ?, is_banned = 0 WHERE email = ?', [role, email]);
}

async function cleanupFixtures() {
  await db.query('DELETE FROM topics WHERE title LIKE ?', [`${fixtureTitlePrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [`${fixtureEmailPrefix}%`]);
  const id = await accountId();
  const [[counters]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM topics WHERE user_id = ?) AS post_count,
       (SELECT COUNT(*) * 10 FROM topics WHERE user_id = ?)
       + (SELECT COUNT(*) * 2 FROM comments WHERE user_id = ?)
       + (SELECT COUNT(*) * 20 FROM comments c INNER JOIN topics t ON t.id = c.topic_id
          WHERE c.user_id = ? AND c.is_solution = 1 AND c.user_id <> t.user_id)
       + (SELECT COUNT(*) FROM poll_votes WHERE user_id = ?) AS xp`,
    [id, id, id, id, id],
  );
  await db.query('UPDATE users SET post_count = ?, xp = ? WHERE id = ?', [
    Number(counters.post_count),
    Number(counters.xp),
    id,
  ]);
  await setAccountRole('user');
}

test.describe('Teacher content moderation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('ithub_onboarding_v2', 'completed');
    });
    await cleanupFixtures();
  });

  test.afterEach(async () => {
    await cleanupFixtures();
  });

  test('allows content moderation but blocks account and edit privileges', async ({ page }, testInfo) => {
    const actorId = await accountId();
    const suffix = `${Date.now()}.${testInfo.project.name.replace(/\W/g, '')}`;
    const targetEmail = `${fixtureEmailPrefix}${suffix}@example.invalid`;
    const targetUsername = `teacher_target_${suffix}`.slice(0, 50);
    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-account', 'user')",
      [targetUsername, targetEmail],
    );
    const [[target]] = await db.query('SELECT id FROM users WHERE email = ?', [targetEmail]);
    const [topicResult] = await db.query(
      "INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>Teacher edit guard</p>', ?)",
      [`${fixtureTitlePrefix} edit guard ${suffix}`, target.id],
    );
    await setAccountRole('teacher');

    await login(page);
    await expect(page.getByRole('link', { name: 'ศูนย์ดูแลเนื้อหา' })).toBeVisible();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'ศูนย์ดูแลเนื้อหา' })).toBeVisible();
    await expect(page.getByText('จัดการสมาชิก', { exact: true })).toHaveCount(0);

    await page.goto('/admin/topics');
    await expect(page.getByRole('heading', { level: 1, name: 'จัดการกระทู้' })).toBeVisible();
    await page.goto('/admin/comments');
    await expect(page.getByRole('heading', { level: 1, name: 'จัดการความคิดเห็น' })).toBeVisible();

    await page.goto('/admin/users');
    await expect(page).toHaveURL('/');
    await page.goto(`/edit/${topicResult.insertId}`);
    await expect(page).toHaveURL('/');

    const [[roleRow]] = await db.query('SELECT role FROM users WHERE id = ?', [actorId]);
    expect(roleRow.role).toBe('teacher');
  });

  test('deletes a fully-related topic and restores every XP counter through FK cascade', async ({ page }, testInfo) => {
    const actorId = await accountId();
    const suffix = `${Date.now()}.${testInfo.project.name.replace(/\W/g, '')}`;
    const participantEmail = `${fixtureEmailPrefix}${suffix}@example.invalid`;
    const participantUsername = `cascade_member_${suffix}`.slice(0, 50);
    await db.query(
      "INSERT INTO users (username, email, password, role, xp) VALUES (?, ?, 'not-a-login-account', 'user', 23)",
      [participantUsername, participantEmail],
    );
    const [[participant]] = await db.query('SELECT id FROM users WHERE email = ?', [participantEmail]);
    const [[actorBefore]] = await db.query('SELECT xp, post_count FROM users WHERE id = ?', [actorId]);
    const [topicResult] = await db.query(
      "INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>Cascade fixture</p>', ?)",
      [`${fixtureTitlePrefix} ${suffix}`, actorId],
    );
    const topicId = topicResult.insertId;
    await db.query('UPDATE users SET xp = xp + 10, post_count = post_count + 1 WHERE id = ?', [actorId]);
    const [commentResult] = await db.query(
      'INSERT INTO comments (topic_id, content, user_id, is_solution) VALUES (?, ?, ?, 1)',
      [topicId, '<p>Accepted fixture answer</p>', participant.id],
    );
    await db.query('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)', [participant.id, topicId]);
    await db.query('INSERT INTO bookmarks (user_id, topic_id) VALUES (?, ?)', [participant.id, topicId]);
    await db.query(
      "INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES (?, ?, ?, 'comment', 'fixture')",
      [actorId, participant.id, topicId],
    );
    await db.query('INSERT INTO reports (reporter_id, topic_id, reason) VALUES (?, ?, ?)', [participant.id, topicId, 'fixture topic report']);
    await db.query('INSERT INTO reports (reporter_id, comment_id, reason) VALUES (?, ?, ?)', [participant.id, commentResult.insertId, 'fixture comment report']);
    const [pollResult] = await db.query('INSERT INTO polls (topic_id, question) VALUES (?, ?)', [topicId, 'Fixture poll?']);
    const [optionResult] = await db.query('INSERT INTO poll_options (poll_id, label, vote_count) VALUES (?, ?, 1)', [pollResult.insertId, 'Yes']);
    await db.query('INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES (?, ?, ?)', [pollResult.insertId, participant.id, optionResult.insertId]);
    await setAccountRole('teacher');

    await login(page);
    await page.goto(`/topic/${topicId}`);
    await page.getByRole('button', { name: `ลบกระทู้ ${fixtureTitlePrefix} ${suffix}` }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp(`ลบกระทู้ “${fixtureTitlePrefix}`) });
    await expect(dialog).toBeVisible();
    const confirmButton = dialog.getByTestId('confirm-delete-submit');
    const feedbackMs = await confirmButton.evaluate(async (button) => {
      const start = performance.now();
      button.click();
      while (!button.disabled && performance.now() - start < 1_000) {
        await new Promise(requestAnimationFrame);
      }
      return performance.now() - start;
    });
    await expect(confirmButton).toBeDisabled();
    expect(feedbackMs).toBeLessThan(100);
    const deletionStart = Date.now();
    await expect(page).toHaveURL((url) => url.pathname === '/', { timeout: 10_000 });
    const deletionMs = Date.now() - deletionStart;
    expect(deletionMs).toBeLessThan(5_000);
    console.log(`[deletion-metric] ${testInfo.project.name}: feedback=${Math.round(feedbackMs)}ms delete=${deletionMs}ms`);

    const [[remaining]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM topics WHERE id = ?) AS topics,
         (SELECT COUNT(*) FROM comments WHERE topic_id = ?) AS comments,
         (SELECT COUNT(*) FROM likes WHERE topic_id = ?) AS likes,
         (SELECT COUNT(*) FROM bookmarks WHERE topic_id = ?) AS bookmarks,
         (SELECT COUNT(*) FROM notifications WHERE topic_id = ?) AS notifications,
         (SELECT COUNT(*) FROM reports WHERE topic_id = ? OR comment_id = ?) AS reports,
         (SELECT COUNT(*) FROM polls WHERE id = ?) AS polls,
         (SELECT COUNT(*) FROM poll_options WHERE poll_id = ?) AS poll_options,
         (SELECT COUNT(*) FROM poll_votes WHERE poll_id = ?) AS poll_votes`,
      [topicId, topicId, topicId, topicId, topicId, topicId, commentResult.insertId, pollResult.insertId, pollResult.insertId, pollResult.insertId],
    );
    expect(Object.values(remaining).map(Number)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const [[actorAfter]] = await db.query('SELECT xp, post_count FROM users WHERE id = ?', [actorId]);
    const [[participantAfter]] = await db.query('SELECT xp FROM users WHERE id = ?', [participant.id]);
    expect(Number(actorAfter.xp)).toBe(Number(actorBefore.xp));
    expect(Number(actorAfter.post_count)).toBe(Number(actorBefore.post_count));
    expect(Number(participantAfter.xp)).toBe(0);
  });

  test('keeps the dialog open and recoverable when the delete request fails', async ({ page }, testInfo) => {
    const suffix = `${Date.now()}.${testInfo.project.name.replace(/\W/g, '')}`;
    const targetEmail = `${fixtureEmailPrefix}${suffix}@example.invalid`;
    const targetUsername = `missing_target_${suffix}`.slice(0, 50);
    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-account', 'user')",
      [targetUsername, targetEmail],
    );
    const [[target]] = await db.query('SELECT id FROM users WHERE email = ?', [targetEmail]);
    const title = `${fixtureTitlePrefix} missing ${suffix}`;
    const [topicResult] = await db.query(
      "INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>Missing target</p>', ?)",
      [title, target.id],
    );
    await setAccountRole('teacher');
    await login(page);
    await page.goto(`/topic/${topicResult.insertId}`);
    await page.getByRole('button', { name: `ลบกระทู้ ${title}` }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp(`ลบกระทู้ “${fixtureTitlePrefix}`) });
    await expect(dialog).toBeVisible();

    await page.route(`**/topic/${topicResult.insertId}`, async (route) => {
      if (route.request().method() === 'POST') await route.abort('connectionfailed');
      else await route.continue();
    });
    await dialog.getByTestId('confirm-delete-submit').click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-pending', 'false');
    await expect(dialog.getByRole('alert')).toContainText('ดำเนินการไม่สำเร็จ');
    await expect(dialog.getByTestId('confirm-delete-submit')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('lets only a super admin assign allowlisted roles', async ({ page }, testInfo) => {
    const suffix = `${Date.now()}.${testInfo.project.name.replace(/\W/g, '')}`;
    const targetEmail = `${fixtureEmailPrefix}${suffix}@example.invalid`;
    const targetUsername = `role_target_${suffix}`.slice(0, 50);
    await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, 'not-a-login-account', 'user')",
      [targetUsername, targetEmail],
    );
    await setAccountRole('super_admin');
    await login(page);
    await page.goto(`/admin/users?q=${encodeURIComponent(targetUsername)}`);

    for (const role of ['teacher', 'admin', 'user']) {
      const roleSelect = page.getByLabel(`สิทธิ์ของ ${targetUsername}`);
      await roleSelect.selectOption(role);
      await expect(roleSelect).toHaveValue(role);
      const saveRole = page.getByRole('button', { name: 'บันทึกสิทธิ์' });
      await Promise.all([
        page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/admin/users'),
        saveRole.evaluate((button) => button.form.requestSubmit(button)),
      ]);
      await expect.poll(async () => {
        const [[row]] = await db.query('SELECT role FROM users WHERE email = ?', [targetEmail]);
        return row.role;
      }, { timeout: 10_000 }).toBe(role);
      await expect(page.getByLabel(`สิทธิ์ของ ${targetUsername}`)).toHaveValue(role);
    }
    expect(ASSIGNABLE_ROLES).toEqual(['user', 'teacher', 'admin']);
    expect(isContentModeratorRole('teacher')).toBe(true);
    expect(isAdminRole('teacher')).toBe(false);
    expect(isContentModeratorRole('made_up_role')).toBe(false);
  });
});
