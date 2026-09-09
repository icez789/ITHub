import { createHash, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';

import db from '../lib/db.js';
import { readStoredZipEntries, RESEARCH_EXPORT_ENTRY_NAMES } from '../lib/researchExportCore.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';

assertE2eSafety();

const fixtureEmailPrefix = 'playwright.dashboard.';
const fixtureSlugPrefix = 'research-dashboard-';
const password = process.env.ITHUB_E2E_PASSWORD;

function sqlUtc(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ');
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function createAccount(role, testInfo, label) {
  const suffix = `${Date.now()}.${testInfo.project.name}.${label}.${randomUUID().slice(0, 8)}`
    .replace(/[^a-zA-Z0-9.]/g, '');
  const email = `${fixtureEmailPrefix}${suffix}@example.invalid`;
  const username = `dashboard_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
  const passwordHash = await bcrypt.hash(password, 6);
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, role],
  );
  return { id: Number(result.insertId), email, username };
}

async function login(page, account) {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme-ready', 'true');
  await page.getByLabel('อีเมล').fill(account.email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
}

async function cleanupFixtures() {
  await db.query('DELETE FROM evaluation_campaigns WHERE slug LIKE ?', [`${fixtureSlugPrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [`${fixtureEmailPrefix}%`]);
}

async function createDashboardFixture(testInfo) {
  const piiCanary = `=HYPERLINK("mailto:private-${randomUUID()}@example.com")`;
  const admin = await createAccount('admin', testInfo, 'admin');
  const members = [];
  for (let index = 0; index < 5; index += 1) {
    members.push(await createAccount('user', testInfo, `member-${index}`));
  }
  const slug = `${fixtureSlugPrefix}${randomUUID().slice(0, 8)}`;
  const [campaignResult] = await db.query(
    `INSERT INTO evaluation_campaigns
       (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
        eligible_member_count, starts_at, ends_at, retention_until, opened_at, created_by, updated_by)
     VALUES (?, 'Research Dashboard E2E', 'open', 'pilot', 'sus-th-pilot-v1',
       'research-notice-pilot-v1', 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY),
       DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
       UTC_TIMESTAMP(), ?, ?)`,
    [slug, admin.id, admin.id],
  );
  const campaignId = Number(campaignResult.insertId);

  const evaluationValues = members.flatMap((member, index) => [
    campaignId,
    member.id,
    randomUUID(),
    index === 4 ? 'teacher' : 'student',
    'intermediate',
    'desktop',
    JSON.stringify(Array(10).fill(3)),
    60 + (index * 5),
    JSON.stringify([1, 2, 3, 4, 5].map((taskId) => ({ taskId, result: 'success', difficulty: 2 }))),
    index === 0 ? piiCanary : null,
  ]);
  await db.query(
    `INSERT INTO evaluation_responses
       (campaign_id, user_id, client_submission_id, response_status, respondent_type,
        experience_level, primary_device, sus_answers, sus_score, task_results, open_feedback)
     VALUES ${members.map(() => "(?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?)").join(', ')}`,
    evaluationValues,
  );

  const subjects = members.map((member, index) => ({
    member,
    subjectKey: digest(`dashboard-subject:${member.id}:${index}:${randomUUID()}`),
    sessionKey: digest(`dashboard-session:${member.id}:${index}:${randomUUID()}`),
  }));
  await db.query(
    `INSERT INTO analytics_consents
       (user_id, subject_key, key_version, notice_version, status, consented_at)
     VALUES ${subjects.map(() => "(?, ?, 1, 'research-analytics-pilot-v1', 'active', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY))").join(', ')}`,
    subjects.flatMap(({ member, subjectKey }) => [member.id, subjectKey]),
  );

  const baseTime = Date.now() - (10 * 60 * 1000);
  const events = [];
  const addEvent = (subject, offsetMs, eventName, outcome = null, properties = {}) => {
    events.push([
      randomUUID(),
      subject.subjectKey,
      subject.sessionKey,
      campaignId,
      'pilot',
      eventName,
      1,
      outcome,
      null,
      eventName.includes('topic') || eventName.includes('comment') ? '/topic/[id]' : '/',
      JSON.stringify(properties),
      sqlUtc(baseTime + offsetMs),
    ]);
  };
  for (const subject of subjects) {
    addEvent(subject, 0, 'search_performed');
    addEvent(subject, 60_000, 'search_result_opened', null, { resultPosition: 1 });
    addEvent(subject, 90_000, 'topic_created', 'attempt');
    addEvent(subject, 100_000, 'topic_created', 'success');
    addEvent(subject, 110_000, 'comment_created', 'attempt', { reply: false });
    addEvent(subject, 120_000, 'comment_created', 'success', { reply: false });
    addEvent(subject, 130_000, 'like_changed', null, { active: true });
    addEvent(subject, 140_000, 'bookmark_changed', null, { active: true });
    addEvent(subject, 150_000, 'category_follow_changed', null, { active: true, category: 'Software' });
    addEvent(subject, 160_000, 'feed_viewed', null, { feed: 'for_you' });
  }
  await db.query(
    `INSERT INTO analytics_events
       (event_id, subject_key, session_key, campaign_id, data_scope, event_name,
        event_version, outcome, failure_code, route_path, properties, occurred_at)
     VALUES ${events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    events.flat(),
  );

  const feedbackValues = members.flatMap((member, index) => [
    member.id,
    campaignId,
    randomUUID(),
    index === 0 ? piiCanary : 'Aggregate-only feedback fixture',
    index === 0 ? piiCanary : null,
  ]);
  await db.query(
    `INSERT INTO feedback_submissions
       (user_id, campaign_id, client_submission_id, data_scope, category, rating, details,
        route_path, status, priority, issue_theme, internal_note, retention_until)
     VALUES ${members.map(() => "(?, ?, ?, 'pilot', 'bug', 4, ?, '/feedback', 'reviewing', 'high', 'navigation', ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))").join(', ')}`,
    feedbackValues,
  );
  return { admin, campaignId, piiCanary };
}

async function themeContrastRatios(page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const luminance = (token) => {
      const rawColor = styles.getPropertyValue(token).trim().replace('#', '');
      const color = rawColor.length === 3
        ? [...rawColor].map((digit) => digit + digit).join('')
        : rawColor;
      const rgb = [0, 2, 4].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    return [
      ['--app-text', '--app-surface'],
      ['--app-text-muted', '--app-surface'],
      ['--app-accent-text', '--app-primary-soft'],
      ['--app-primary-contrast', '--app-primary'],
      ['--app-success', '--app-surface'],
      ['--app-warning', '--app-surface'],
      ['--app-danger', '--app-surface'],
      ['--app-info', '--app-surface'],
    ].map(([foreground, background]) => ({
      foreground,
      background,
      ratio: (Math.max(luminance(foreground), luminance(background)) + 0.05)
        / (Math.min(luminance(foreground), luminance(background)) + 0.05),
    }));
  });
}

test.describe('Research analytics dashboard and export', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await cleanupFixtures();
    await page.addInitScript(() => {
      window.localStorage.setItem('ithub_onboarding_v2', 'completed');
      if (!window.localStorage.getItem('theme')) window.localStorage.setItem('theme', 'light');
      if (!window.localStorage.getItem('ithub_palette_v1')) window.localStorage.setItem('ithub_palette_v1', 'classic');
    });
  });

  test.afterEach(async () => {
    await cleanupFixtures();
  });

  test('enforces export roles and rejects invalid filters without querying private rows', async ({ page }, testInfo) => {
    const guestResponse = await page.request.get('/api/admin/research/export?campaign=1');
    expect(guestResponse.status()).toBe(401);

    const teacher = await createAccount('teacher', testInfo, 'teacher');
    await login(page, teacher);
    const teacherResponse = await page.request.get('/api/admin/research/export?campaign=1');
    expect(teacherResponse.status()).toBe(403);
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL('/');

    await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [teacher.id]);
    await page.context().clearCookies();
    await login(page, teacher);
    await page.goto('/admin/analytics?respondent=private-free-text');
    const filterError = page.getByText('ตัวกรองไม่ถูกต้อง กรุณาเลือกข้อมูลใหม่', { exact: true });
    await expect(filterError).toBeVisible();
    await expect(filterError).toHaveAttribute('aria-live', 'assertive');
    await expect(page.getByRole('form', { name: 'ตัวกรองข้อมูล' })).toHaveAttribute('aria-describedby', 'research-filter-error');
    const invalidResponse = await page.request.get('/api/admin/research/export?respondent=private-free-text');
    expect(invalidResponse.status()).toBe(400);
    expect(await invalidResponse.json()).toEqual({ status: 'error', code: 'invalid_filter' });
  });

  test('shows verified metrics, suppresses a small subgroup, and exports seven PII-free files', async ({ page }, testInfo) => {
    const fixture = await createDashboardFixture(testInfo);
    await login(page, fixture.admin);
    await page.goto(`/admin/analytics?campaign=${fixture.campaignId}`);

    await expect(page.getByRole('heading', { level: 2, name: 'Dashboard ข้อมูลวิจัย' })).toBeVisible();
    await expect(page.getByTestId('metric-consent-count')).toHaveText('5');
    await expect(page.getByTestId('metric-response-count')).toHaveText('5');
    await expect(page.getByTestId('metric-response_rate')).toHaveText('50%');
    await expect(page.getByTestId('metric-search_to_open_5m')).toHaveText('100%');
    await expect(page.getByTestId('metric-topic_create_success')).toHaveText('100%');
    await expect(page.getByTestId('metric-comment_create_success')).toHaveText('100%');
    await expect(page.getByText(fixture.piiCanary)).toHaveCount(0);
    await expect(page.getByRole('form', { name: 'ตัวกรองข้อมูล' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'ผลภารกิจจากแบบประเมินเทียบพฤติกรรมที่สังเกตได้' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'ประเภทผู้ตอบ' })).toBeVisible();
    const taskRegion = page.getByRole('region', { name: 'ผลภารกิจ — ตารางเลื่อนแนวนอนได้' });
    await taskRegion.focus();
    await expect(taskRegion).toBeFocused();
    expect(await taskRegion.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);

    const exportLink = page.getByRole('link', { name: 'สร้างชุดข้อมูลบทที่ 4–5' });
    await expect(exportLink).toHaveAttribute('aria-describedby', 'research-export-description');
    const href = await exportLink.getAttribute('href');
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/zip');
    expect(response.headers()['content-disposition']).toContain('attachment;');
    const entries = readStoredZipEntries(await response.body());
    expect([...entries.keys()]).toEqual(RESEARCH_EXPORT_ENTRY_NAMES);
    const exportText = [...entries.values()].map((entry) => entry.toString('utf8')).join('\n');
    expect(exportText).not.toContain(fixture.piiCanary);
    expect(exportText).not.toContain(fixture.admin.email);
    expect(entries.get('chapter4_summary.csv').toString('utf8').startsWith('\uFEFFmetric,value')).toBe(true);
    expect(entries.get('methodology.md').toString('utf8')).toContain('eligible_member_count snapshot');

    await page.goto(`/admin/analytics?campaign=${fixture.campaignId}&respondent=teacher`);
    await expect(page.getByTestId('metric-response-count')).toHaveText('ข้อมูลยังไม่พอ (n < 5)');
    await expect(page.getByTestId('metric-search_to_open_5m')).toHaveText('ข้อมูลยังไม่พอ (n < 5)');

    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('research-dashboard-mobile-light.png'), fullPage: false });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByTestId('theme-toggle').click();
    await page.getByTestId('theme-mode-dark').click();
    await page.getByRole('button', { name: 'ปิดการตั้งค่าธีม' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('research-dashboard-desktop-dark.png'), fullPage: false });
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
  });

  test('keeps research surfaces readable in five palettes across light and dark modes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The full palette matrix runs once; functional checks run in every browser.');
    test.setTimeout(300_000);
    const fixture = await createDashboardFixture(testInfo);
    await login(page, fixture.admin);
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const mode of ['light', 'dark']) {
      for (const palette of ['classic', 'ocean', 'forest', 'violet', 'amber']) {
        await page.evaluate(([nextMode, nextPalette]) => {
          localStorage.setItem('theme', nextMode);
          localStorage.setItem('ithub_palette_v1', nextPalette);
        }, [mode, palette]);
        await page.goto(`/admin/analytics?campaign=${fixture.campaignId}`);
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
        await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
        await expect(page.getByRole('heading', { level: 2, name: 'Dashboard ข้อมูลวิจัย' })).toBeVisible();
        await expect(page.getByText(/Campaign ยังไม่สิ้นสุด/)).toBeVisible();
        for (const result of await themeContrastRatios(page)) {
          expect(result.ratio, `${palette} ${mode} ${result.foreground}/${result.background}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`research-dashboard-${palette}-${mode}.png`), fullPage: false, animations: 'disabled' });

        await page.goto('/feedback');
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
        await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
        await expect(page.getByRole('heading', { level: 1, name: 'แบบประเมินและ Feedback' })).toBeVisible();
        await expect(page.getByText('เปิดรับคำตอบ', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`research-feedback-${palette}-${mode}.png`), fullPage: false, animations: 'disabled' });
      }
    }
  });
});
