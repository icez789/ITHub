import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';
import db from '../lib/db.js';
import { isDiscoveryPreviewUrl, previewDatabaseIdentity } from './discovery-preview-safety.mjs';

// Remote cold starts need the same assertion budget as browser actions.
const expect = baseExpect.configure({ timeout: 20_000 });

async function main() {
  const [rawUrl, phase = '2.1'] = process.argv.slice(2);
  const databaseIdentity = previewDatabaseIdentity();
  const entryUrl = new URL(rawUrl);
  if (!isDiscoveryPreviewUrl(rawUrl)) {
    throw new Error('This smoke script only permits isolated ITHub Preview deployments, never Production');
  }
  const manifest = JSON.parse(await readFile('.vercel/release-evidence/preview-deployment.json', 'utf8'));
  if (manifest.databaseIdentity !== databaseIdentity || manifest.url !== entryUrl.origin || manifest.phase !== phase) {
    throw new Error('Preview URL, phase and database must match the explicit deployment manifest');
  }
  if (!['2.1', '2.2'].includes(phase)) throw new Error('Invalid release phase');
  const origin = entryUrl.origin;
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const email = `codex.release.${suffix}@example.invalid`;
  const username = `release_qa_${suffix}`;
  const password = randomBytes(24).toString('base64url');
  const evidence = path.resolve(`.vercel/release-evidence/${phase}-${suffix}`);
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.addInitScript(() => localStorage.setItem('ithub_onboarding_v2', 'completed'));
  let stage = 'deployment access';
  try {
    const response = await page.goto(entryUrl.href);
    expect(response?.status()).toBe(200);
    await expect(page.locator('#topic-feed')).toBeVisible();
    const topicPath = await page.locator('#topic-feed a[href^="/topic/"]').first().getAttribute('href');
    const topicId = Number(topicPath.split('/').pop());
    const [[topic]] = await db.query('SELECT id, category FROM topics WHERE id = ?', [topicId]);
    if (!topic) throw new Error('Deployment and configured database do not match');
    if (phase !== 'baseline') {
      await page.goto(`${origin}/?feed=following`);
      await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล' })).toBeVisible();
    }
    stage = 'temporary account registration';
    await page.goto(`${origin}/register`);
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL((url) => url.pathname === '/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL((url) => url.pathname === '/');
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
    await expect(page).toHaveURL(`${origin}/`);
    const [[account]] = await db.query('SELECT id FROM users WHERE email = ? AND username = ?', [email, username]);
    if (!account) throw new Error('Registered QA account was not found in configured database');
    console.log(`${phase}: authenticated deployment/database match verified`);

    if (phase !== 'baseline') {
      stage = 'category follow';
      await expect(page.getByRole('link', { name: 'สำหรับคุณ', exact: true })).toHaveCount(phase === '2.2' ? 1 : 0);
      await page.goto(`${origin}/?category=${encodeURIComponent(topic.category)}`);
      await page.getByRole('button', { name: `ติดตาม หมวด ${topic.category}`, exact: true }).click();
      await expect(page.getByRole('button', { name: `เลิกติดตาม หมวด ${topic.category}`, exact: true })).toBeEnabled();
      stage = 'author follow';
      await page.goto(`${origin}${topicPath}`);
      const followAuthor = page.getByRole('button', { name: /^ติดตาม / });
      await expect(followAuthor).toHaveCount(1);
      await followAuthor.click();
      await expect(page.getByRole('button', { name: /^เลิกติดตาม / })).toBeEnabled();
      stage = 'following feed and management';
      await page.goto(`${origin}/?feed=following`);
      await expect(page.locator(`#topic-feed a[href="${topicPath}"]`)).toHaveCount(1);
      await page.goto(`${origin}/profile/following`);
      await expect(page.getByRole('button', { name: /^เลิกติดตาม / })).toHaveCount(2);
      if (phase === '2.2') {
        await page.goto(`${origin}/?feed=for-you`);
        await expect(page.locator(`#topic-feed a[href="${topicPath}"]`)).toHaveCount(1);
        await expect(page.getByText('ติดตามผู้เขียนและหมวดนี้', { exact: true }).first()).toBeVisible();
        await expect(page.getByLabel('เรียงลำดับกระทู้')).toHaveCount(0);
      }
      stage = 'notification preferences';
      await page.goto(`${origin}/notifications`);
      await expect(page.locator('input[name="comments_enabled"]')).toBeChecked();
      await expect(page.locator('input[name="followed_authors_enabled"]')).not.toBeChecked();
      await page.locator('input[name="comments_enabled"]').uncheck();
      await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'บันทึกการตั้งค่าการแจ้งเตือนแล้ว' })).toBeVisible();
      await page.reload();
      await expect(page.locator('input[name="comments_enabled"]')).not.toBeChecked();
    }

    stage = 'visual smoke';
    const routes = phase === 'baseline' ? ['/', topicPath, '/notifications']
      : ['/?feed=following', '/profile/following', '/notifications', ...(phase === '2.2' ? ['/?feed=for-you'] : [])];
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      for (const mode of ['light', 'dark']) {
        await page.evaluate((value) => localStorage.setItem('theme', value), mode);
        for (const [index, route] of routes.entries()) {
          await page.goto(`${origin}${route}`);
          await expect(page.locator('#main-content')).toBeVisible();
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
          await page.screenshot({ path: path.join(evidence, `${index}-${viewport.width}-${mode}.png`), animations: 'disabled' });
        }
      }
    }
    console.log(JSON.stringify({ phase, origin, status: 'passed', evidence }));
  } catch (error) {
    await page.screenshot({ path: path.join(evidence, 'failure.png'), animations: 'disabled' }).catch(() => {});
    const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
    console.error(JSON.stringify({ alerts }));
    console.error(JSON.stringify({ phase, stage, status: 'failed', error: error.message.split('\n')[0] }));
    throw new Error('Release smoke failed');
  } finally {
    await browser.close();
    // Remove only the uniquely named account created by this run; FK cascades
    // clean its private follows/preferences. Existing members are never edited.
    const [[account]] = await db.query('SELECT id FROM users WHERE email = ? AND username = ?', [email, username]);
    if (account) {
      const [result] = await db.query('DELETE FROM users WHERE id = ? AND email = ? AND username = ?', [account.id, email, username]);
      console.log(`Temporary release QA account cleanup: ${result.affectedRows === 1 ? 'passed' : 'FAILED'}`);
    }
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
