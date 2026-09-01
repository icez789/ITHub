import { test, expect } from '@playwright/test';
import db from '../lib/db.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';

assertE2eSafety();

const email = process.env.ITHUB_E2E_EMAIL;
const password = process.env.ITHUB_E2E_PASSWORD;
const prefix = 'Milestone 94 fixture';
let baseline;

async function account() {
  const [[user]] = await db.query('SELECT id, role, xp, post_count, session_version FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) throw new Error('Missing E2E account');
  return user;
}

async function login(page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

async function cleanup() {
  await db.query('DELETE FROM topics WHERE title LIKE ?', [`${prefix}%`]);
  await db.query("DELETE FROM users WHERE email LIKE 'playwright.m94.%@example.invalid'");
  if (baseline) {
    await db.query(
      'UPDATE users SET role = ?, is_banned = 0, xp = ?, post_count = ?, session_version = ? WHERE email = ?',
      [baseline.role, baseline.xp, baseline.post_count, baseline.session_version, email],
    );
  }
}

test.describe('Milestone 94 security and community flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ithub_onboarding_v2', 'completed'));
    baseline = await account();
    await cleanup();
  });

  test.afterEach(async () => cleanup());

  test('revokes an existing session when session_version changes', async ({ page }) => {
    await login(page);
    await db.query('UPDATE users SET session_version = session_version + 1 WHERE email = ?', [email]);
    await page.goto('/profile');
    await expect(page).toHaveURL((url) => url.pathname === '/login');
  });

  test('allows engagement when the topic owner has been deleted', async ({ page }, testInfo) => {
    const suffix = `${Date.now()}.${testInfo.project.name}`;
    const ownerEmail = `playwright.m94.${suffix}@example.invalid`;
    await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, 'not-a-login-account')", [`m94_${suffix}`.slice(0, 50), ownerEmail]);
    const [[owner]] = await db.query('SELECT id FROM users WHERE email = ?', [ownerEmail]);
    const [topicResult] = await db.query("INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>nullable owner</p>', ?)", [`${prefix} nullable ${suffix}`, owner.id]);
    await db.query('DELETE FROM users WHERE id = ?', [owner.id]);

    await login(page);
    await page.goto(`/topic/${topicResult.insertId}`);
    await page.getByRole('button', { name: /ถูกใจกระทู้/ }).click();
    await expect.poll(async () => Number((await db.query('SELECT COUNT(*) AS count FROM likes WHERE topic_id = ?', [topicResult.insertId]))[0][0].count)).toBe(1);
    await page.locator('.ql-editor').last().fill('ความคิดเห็นสำหรับกระทู้ที่ไม่มีเจ้าของ');
    await page.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
    await expect.poll(async () => Number((await db.query('SELECT COUNT(*) AS count FROM comments WHERE topic_id = ?', [topicResult.insertId]))[0][0].count)).toBe(1);
  });

  test('lets a teacher pin and lock a topic and records audit events', async ({ page }, testInfo) => {
    const actor = await account();
    const title = `${prefix} moderation ${Date.now()}.${testInfo.project.name}`;
    await db.query("UPDATE users SET role = 'teacher' WHERE id = ?", [actor.id]);
    const [topicResult] = await db.query("INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>moderation</p>', ?)", [title, actor.id]);

    await login(page);
    await page.goto(`/topic/${topicResult.insertId}`);
    await page.getByRole('button', { name: 'ปักหมุด' }).click();
    await page.getByRole('button', { name: 'ล็อก' }).click();
    await expect.poll(async () => {
      const [[topic]] = await db.query('SELECT is_pinned, is_locked FROM topics WHERE id = ?', [topicResult.insertId]);
      return `${topic.is_pinned}:${topic.is_locked}`;
    }).toBe('1:1');
    await page.reload();
    await expect(page.getByText('กระทู้นี้ถูกล็อกโดยผู้ดูแล')).toBeVisible();
    const [[audit]] = await db.query("SELECT COUNT(*) AS count FROM moderation_audit_logs WHERE actor_id = ? AND target_type = 'topic' AND target_id = ? AND action IN ('topic.pin.enable', 'topic.lock.enable')", [actor.id, String(topicResult.insertId)]);
    expect(Number(audit.count)).toBe(2);
  });

  test('lets a teacher resolve a report with an atomic audit entry', async ({ page }, testInfo) => {
    const actor = await account();
    const suffix = `${Date.now()}.${testInfo.project.name}`;
    const reporterEmail = `playwright.m94.${suffix}@example.invalid`;
    const title = `${prefix} report ${suffix}`;
    await db.query("UPDATE users SET role = 'teacher' WHERE id = ?", [actor.id]);
    await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, 'not-a-login-account')", [`reporter_${suffix}`.slice(0, 50), reporterEmail]);
    const [[reporter]] = await db.query('SELECT id FROM users WHERE email = ?', [reporterEmail]);
    const [topicResult] = await db.query("INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>reported</p>', ?)", [title, actor.id]);
    const [reportResult] = await db.query('INSERT INTO reports (reporter_id, topic_id, reason) VALUES (?, ?, ?)', [reporter.id, topicResult.insertId, 'milestone 94 report']);

    await login(page);
    await page.goto('/admin');
    const reportRow = page.locator('tr').filter({ hasText: title });
    await reportRow.getByRole('button', { name: 'ปิดรายงานโดยไม่ลบเนื้อหา' }).click();
    await expect.poll(async () => (await db.query('SELECT status FROM reports WHERE id = ?', [reportResult.insertId]))[0][0]?.status).toBe('resolved');
    const [[audit]] = await db.query("SELECT COUNT(*) AS count FROM moderation_audit_logs WHERE actor_id = ? AND action = 'report.resolve' AND target_type = 'report' AND target_id = ?", [actor.id, String(reportResult.insertId)]);
    expect(Number(audit.count)).toBe(1);
  });

  test('manages paginated notifications with owned actions', async ({ page }, testInfo) => {
    const actor = await account();
    const suffix = `${Date.now()}.${testInfo.project.name}`;
    const actorEmail = `playwright.m94.${suffix}@example.invalid`;
    await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, 'not-a-login-account')", [`notify_${suffix}`.slice(0, 50), actorEmail]);
    const [[sender]] = await db.query('SELECT id FROM users WHERE email = ?', [actorEmail]);
    const [topicResult] = await db.query("INSERT INTO topics (title, category, content, user_id) VALUES (?, 'General', '<p>notifications</p>', ?)", [`${prefix} notifications ${suffix}`, actor.id]);
    const rows = Array.from({ length: 21 }, (_, index) => [actor.id, sender.id, topicResult.insertId, 'comment', `แจ้งเตือนทดสอบ ${index + 1}`]);
    await db.query('INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES ?', [rows]);

    await login(page);
    await page.goto('/notifications');
    await expect(page.getByText('หน้า 1 จาก 2')).toBeVisible();
    await page.getByRole('button', { name: 'อ่านทั้งหมด' }).click();
    await expect.poll(async () => Number((await db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [actor.id]))[0][0].count)).toBe(0);
    await page.getByRole('button', { name: 'ล้างการแจ้งเตือนทั้งหมด' }).click();
    await page.locator('dialog[open]').getByTestId('confirm-delete-submit').click();
    await expect.poll(async () => Number((await db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?', [actor.id]))[0][0].count)).toBe(0);
  });

  test('serves security policy headers in non-production mode', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['content-security-policy-report-only']).toContain("frame-ancestors 'none'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});
