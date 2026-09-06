import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { chromium, expect as baseExpect } from '@playwright/test';
import db from '../lib/db.js';
import { assertMigration004Complete, inspectSchema } from './db-schema.mjs';

// Run only after the owner confirms .env / test is the live ITHub database.
// This is separate from the Preview/E2E runner; those guards stay unchanged.
const origin = 'https://ithub-puce.vercel.app';
const expect = baseExpect.configure({ timeout: 20_000 });

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--confirmed-production-test') {
    throw new Error('Explicit Production database confirmation is required');
  }
  const local = parseEnv(await readFile('.env', 'utf8'));
  if (local.DB_NAME !== 'test' || ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    .some((key) => String(process.env[key] || '') !== String(local[key] || ''))) {
    throw new Error('Connection does not match the owner-confirmed .env / test');
  }
  if (['DB_HOST', 'DB_USER', 'DB_PASSWORD'].some((key) => !local[key] || local[key].includes('[SENSITIVE]'))) {
    throw new Error('Missing usable connection');
  }
  assertMigration004Complete(await inspectSchema(db));
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const email = `codex.release.${suffix}@example.invalid`;
  const username = `release_qa_${suffix}`;
  const password = randomBytes(24).toString('base64url');
  const evidence = `.vercel/release-evidence/production-2.1-${suffix}`;
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch();
  let stage = 'guest';
  let passed = false;
  let cleanup = false;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('ithub_onboarding_v2', 'completed'));
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.goto(`${origin}/?feed=following`);
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล' })).toBeVisible();
    stage = 'registration and login';
    await page.goto(`${origin}/register`);
    for (const [name, value] of Object.entries({ username, email, password, confirmPassword: password })) {
      await page.locator(`input[name="${name}"]`).fill(value);
    }
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL((url) => url.pathname === '/login');
    const [[account]] = await db.query('SELECT id FROM users WHERE email = ? AND username = ?', [email, username]);
    if (!account) throw new Error('Production account is not in the confirmed database');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
    await expect(page).toHaveURL(`${origin}/`);
    const cookie = (await context.cookies()).find((item) => item.name === 'user_session');
    expect(cookie?.secure).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    await expect(page.getByRole('link', { name: 'สำหรับคุณ', exact: true })).toHaveCount(0);
    const topicPath = await page.locator('#topic-feed a[href^="/topic/"]').first().getAttribute('href');
    const [[topic]] = await db.query('SELECT category FROM topics WHERE id = ?', [Number(topicPath.split('/').pop())]);
    if (!topic) throw new Error('Topic missing from confirmed database');
    stage = 'category follow';
    await page.goto(`${origin}/?category=${encodeURIComponent(topic.category)}`);
    await page.getByRole('button', { name: `ติดตาม หมวด ${topic.category}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `เลิกติดตาม หมวด ${topic.category}`, exact: true })).toBeEnabled();
    stage = 'author follow';
    await page.goto(`${origin}${topicPath}`);
    await page.getByRole('button', { name: /^ติดตาม / }).click();
    await expect(page.getByRole('button', { name: /^เลิกติดตาม / })).toBeEnabled();
    stage = 'following and preferences';
    await page.goto(`${origin}/?feed=following`);
    await expect(page.locator(`#topic-feed a[href="${topicPath}"]`)).toHaveCount(1);
    await page.goto(`${origin}/profile/following`);
    await expect(page.getByRole('button', { name: /^เลิกติดตาม / })).toHaveCount(2);
    await page.goto(`${origin}/notifications`);
    await expect(page.locator('input[name="comments_enabled"]')).toBeChecked();
    await expect(page.locator('input[name="followed_authors_enabled"]')).not.toBeChecked();
    await page.locator('input[name="comments_enabled"]').uncheck();
    await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'บันทึกการตั้งค่าการแจ้งเตือนแล้ว' })).toBeVisible();
    await page.reload();
    await expect(page.locator('input[name="comments_enabled"]')).not.toBeChecked();
    stage = 'visual';
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const mode of ['light', 'dark']) {
        await page.evaluate((value) => localStorage.setItem('theme', value), mode);
        for (const [index, route] of ['/?feed=following', '/profile/following', '/notifications'].entries()) {
          await page.goto(`${origin}${route}`);
          await expect(page.locator('#main-content')).toBeVisible();
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
          await page.screenshot({ path: `${evidence}/${index}-${width}-${mode}.png`, animations: 'disabled' });
        }
      }
    }
    passed = true;
  } finally {
    await browser.close().catch(() => {});
    // The unique email+username are generated above; no existing member is edited.
    const [result] = await db.query('DELETE FROM users WHERE email = ? AND username = ?', [email, username]);
    cleanup = result.affectedRows === 1;
    const report = { origin, phase: '2.1', passed, stage, cleanup, evidence, checkedAt: new Date().toISOString() };
    await writeFile(`${evidence}/result.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
  if (!passed || !cleanup) throw new Error('Smoke or cleanup incomplete');
}

main().then(() => process.exit(0)).catch(() => {
  console.error('Production smoke did not complete; check the stage in the private evidence report.');
  process.exit(1);
});
