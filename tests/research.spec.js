import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';

import db from '../lib/db.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';

assertE2eSafety();

const fixtureEmailPrefix = 'playwright.research.';
const fixtureSlugPrefix = 'research-ui-';
const password = process.env.ITHUB_E2E_PASSWORD;

function utcOffset(days) {
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
}

async function createAccount(role, testInfo, label = role) {
  const suffix = `${Date.now()}.${testInfo.project.name}.${randomUUID().slice(0, 8)}`
    .replace(/[^a-zA-Z0-9.]/g, '');
  const email = `${fixtureEmailPrefix}${label}.${suffix}@example.invalid`;
  const username = `research_${label}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
  const passwordHash = await bcrypt.hash(password, 6);
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, role],
  );
  return { id: Number(result.insertId), email, username };
}

async function createOpenCampaign(actorId, suffix = randomUUID().slice(0, 8)) {
  const slug = `${fixtureSlugPrefix}${suffix}`.toLowerCase();
  const [result] = await db.query(
    `INSERT INTO evaluation_campaigns
       (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
        eligible_member_count, starts_at, ends_at, retention_until, opened_at, created_by, updated_by)
     VALUES (?, 'Research UI E2E Pilot', 'open', 'pilot', 'sus-th-pilot-v1',
       'research-notice-pilot-v1', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY),
       DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
       UTC_TIMESTAMP(), ?, ?)`,
    [slug, actorId, actorId],
  );
  return { id: Number(result.insertId), slug };
}

async function cleanupFixtures() {
  await db.query(
    `DELETE FROM moderation_audit_logs
     WHERE actor_id IN (SELECT id FROM users WHERE email LIKE ?)`,
    [`${fixtureEmailPrefix}%`],
  );
  await db.query('DELETE FROM evaluation_campaigns WHERE slug LIKE ?', [`${fixtureSlugPrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [`${fixtureEmailPrefix}%`]);
}

async function login(page, account) {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme-ready', 'true');
  await page.getByLabel('อีเมล').fill(account.email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
}

async function replayServerAction(page, request) {
  const originalHeaders = await request.allHeaders();
  const forwardedHeaders = {
    accept: originalHeaders.accept || 'text/x-component',
    'content-type': originalHeaders['content-type'],
    'next-action': originalHeaders['next-action'],
    origin: new URL(request.url()).origin,
  };
  for (const name of ['next-router-state-tree', 'next-url']) {
    if (originalHeaders[name]) forwardedHeaders[name] = originalHeaders[name];
  }
  return page.request.post(request.url(), {
    headers: forwardedHeaders,
    data: request.postDataBuffer(),
  });
}

test.describe('Feedback and research Phase 2', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await cleanupFixtures();
    await page.addInitScript(() => {
      window.localStorage.setItem('ithub_onboarding_v2', 'completed');
      window.localStorage.setItem('theme', 'light');
      window.localStorage.setItem('ithub_palette_v1', 'classic');
    });
  });

  test.afterEach(async () => {
    await cleanupFixtures();
  });

  test('protects member and research-admin routes by session and role', async ({ page }, testInfo) => {
    await page.goto('/feedback');
    await expect(page).toHaveURL((url) => url.pathname === '/login' && url.searchParams.get('next') === '/feedback');
    await page.goto('/admin/feedback');
    await expect(page).toHaveURL((url) => url.pathname === '/login');

    const member = await createAccount('user', testInfo, 'member-guard');
    await login(page, member);
    await page.goto('/admin/feedback');
    await expect(page).toHaveURL('/');
    await page.context().clearCookies();

    const teacher = await createAccount('teacher', testInfo, 'teacher-guard');
    await login(page, teacher);
    await page.goto('/admin/feedback');
    await expect(page).toHaveURL('/');
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL('/');
  });

  test('submits and withdraws a complete evaluation, feedback, and analytics consent', async ({ page }, testInfo) => {
    const member = await createAccount('user', testInfo, 'member-flow');
    const campaign = await createOpenCampaign(member.id);
    await login(page, member);
    await page.goto('/feedback');

    await expect(page.getByRole('heading', { level: 1, name: 'แบบประเมินและ Feedback' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Research UI E2E Pilot' })).toBeVisible();
    const evaluationForm = page.getByRole('form', { name: 'Research UI E2E Pilot' });
    const feedbackForm = page.getByRole('form', { name: '2. แจ้งปัญหาหรือข้อเสนอแนะ' });
    await expect(evaluationForm).toHaveAttribute('aria-busy', 'false');
    await expect(feedbackForm).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('group', { name: 'ข้อมูลกลุ่มตัวอย่าง' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'System Usability Scale — 10 ข้อ' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'ผลจากงานทดลอง 5 งาน' })).toBeVisible();
    await page.getByLabel('ประเภทผู้ตอบ').selectOption('student');
    await page.getByLabel('ประเภทผู้ตอบ').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('ประสบการณ์ใช้งาน')).toBeFocused();
    expect(await page.getByLabel('ประสบการณ์ใช้งาน').evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.getByLabel('ประสบการณ์ใช้งาน').selectOption('intermediate');
    await page.getByLabel('อุปกรณ์หลัก').selectOption('desktop');
    for (let index = 1; index <= 10; index += 1) {
      const score = index % 2 === 1 ? '5' : '1';
      await page.locator(`input[name="sus_${index}"][value="${score}"]`).check();
    }
    for (let index = 1; index <= 5; index += 1) {
      await page.locator(`select[name="task_${index}_result"]`).selectOption('success');
      await page.locator(`select[name="task_${index}_difficulty"]`).selectOption(String(index));
    }
    await page.locator('input[name="evaluationConsent"]').check();
    await page.getByRole('button', { name: 'ส่งแบบประเมินหนึ่งครั้ง' }).click();
    await expect(page.getByText('ระบบมีรายการของคุณสำหรับรอบนี้แล้ว')).toBeVisible();

    const [[evaluation]] = await db.query(
      `SELECT response_status, sus_score, JSON_LENGTH(sus_answers) AS answer_count,
              JSON_LENGTH(task_results) AS task_count
       FROM evaluation_responses WHERE campaign_id = ? AND user_id = ?`,
      [campaign.id, member.id],
    );
    expect(evaluation.response_status).toBe('submitted');
    expect(Number(evaluation.sus_score)).toBe(100);
    expect(Number(evaluation.answer_count)).toBe(10);
    expect(Number(evaluation.task_count)).toBe(5);

    await page.getByLabel('ประเภท Feedback').selectOption('ux_ui');
    await page.getByLabel('ความพึงพอใจ (ไม่บังคับ)').selectOption('4');
    await page.getByLabel('รายละเอียด').fill('Research UI E2E feedback รายละเอียดสำหรับทดสอบ');
    await page.getByRole('button', { name: 'ส่ง Feedback', exact: true }).click();
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM feedback_submissions WHERE user_id = ?',
      [member.id],
    ))[0][0].count)).toBe(1);
    const [[feedback]] = await db.query(
      'SELECT route_path, category, rating FROM feedback_submissions WHERE user_id = ?',
      [member.id],
    );
    expect(feedback).toEqual(expect.objectContaining({ route_path: '/feedback', category: 'ux_ui', rating: 4 }));

    await page.locator('input[name="acknowledged"]').evaluate((checkbox) => {
      checkbox.removeAttribute('required');
    });
    await page.getByRole('button', { name: 'ยินยอม Research Analytics' }).click();
    const consentError = page.getByText('กรุณายืนยันความยินยอมก่อนเปิด Research Analytics', { exact: true });
    await expect(consentError).toBeVisible();
    await expect(consentError).toHaveAttribute('role', 'alert');
    await expect(consentError).toHaveAttribute('aria-atomic', 'true');
    await expect(consentError).toBeFocused();
    const consentForm = page.getByRole('form', { name: 'เปิด Research Analytics' });
    await expect(consentForm).toHaveAttribute('aria-describedby', await consentError.getAttribute('id'));
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM analytics_consents WHERE user_id = ?',
      [member.id],
    ))[0][0].count)).toBe(0);

    await page.locator('input[name="acknowledged"]').check();
    await page.getByRole('button', { name: 'ยินยอม Research Analytics' }).click();
    await expect(page.getByText('ยินยอมอยู่')).toBeVisible();
    await page.getByRole('button', { name: 'ถอนความยินยอมและลบ Raw Analytics' }).click();
    await expect(page.getByText('ยังไม่ยินยอม')).toBeVisible();

    await page.getByRole('button', { name: 'ถอนและล้างเนื้อหาคำตอบ' }).click();
    await expect.poll(async () => (await db.query(
      'SELECT response_status FROM evaluation_responses WHERE campaign_id = ? AND user_id = ?',
      [campaign.id, member.id],
    ))[0][0]?.response_status).toBe('withdrawn');
    const [[withdrawn]] = await db.query(
      `SELECT respondent_type, experience_level, primary_device, sus_answers,
              sus_score, task_results, open_feedback
       FROM evaluation_responses WHERE campaign_id = ? AND user_id = ?`,
      [campaign.id, member.id],
    );
    expect(Object.values(withdrawn).every((value) => value == null)).toBe(true);
  });

  test('keeps an offline feedback draft local and deduplicates a repeated retry', async ({ page, context }, testInfo) => {
    const member = await createAccount('user', testInfo, 'offline-retry');
    const details = `Research offline retry ${randomUUID()}`;
    await login(page, member);
    await page.goto('/feedback');

    const feedbackForm = page.getByRole('form', { name: '2. แจ้งปัญหาหรือข้อเสนอแนะ' });
    const submitButton = page.getByRole('button', { name: 'ส่ง Feedback', exact: true });
    await page.getByLabel('ประเภท Feedback').selectOption('bug');
    await page.getByLabel('รายละเอียด').fill(details);

    await context.setOffline(true);
    await submitButton.click();
    const offlineAlert = page.getByText('อุปกรณ์ออฟไลน์อยู่ ข้อมูลยังไม่ถูกส่ง โปรดเชื่อมต่ออินเทอร์เน็ตแล้วกดปุ่มเดิมอีกครั้ง', { exact: true });
    await expect(offlineAlert).toBeVisible();
    await expect(offlineAlert).toBeFocused();
    await expect(feedbackForm).toHaveAttribute('aria-busy', 'false');
    expect(Number((await db.query(
      'SELECT COUNT(*) AS count FROM feedback_submissions WHERE user_id = ? AND details = ?',
      [member.id, details],
    ))[0][0].count)).toBe(0);

    await context.setOffline(false);
    let actionRequestCount = 0;
    await page.route('**/feedback', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.headers()['next-action']) {
        actionRequestCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      await route.continue();
    });

    await submitButton.click();
    await expect(page.getByRole('button', { name: 'กำลังส่ง Feedback' })).toBeDisabled();
    await feedbackForm.evaluate((form) => form.requestSubmit());
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM feedback_submissions WHERE user_id = ? AND details = ?',
      [member.id, details],
    ))[0][0].count)).toBe(1);
    await expect.poll(() => actionRequestCount).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number((await db.query(
      'SELECT COUNT(*) AS count FROM feedback_submissions WHERE user_id = ?',
      [member.id],
    ))[0][0].count)).toBe(1);
  });

  test('lets Admin triage feedback without exposing member identity in the DTO', async ({ page }, testInfo) => {
    const admin = await createAccount('admin', testInfo, 'admin-triage');
    const noteCanary = `private-note-${randomUUID()}`;
    const [feedbackResult] = await db.query(
      `INSERT INTO feedback_submissions
         (user_id, client_submission_id, data_scope, category, rating, details,
          route_path, status, priority, retention_until)
       VALUES (?, ?, 'pilot', 'bug', 2, 'Research UI E2E admin triage item',
         '/feedback', 'new', 'normal', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))`,
      [admin.id, randomUUID()],
    );
    await login(page, admin);
    await page.goto('/admin/feedback');

    await expect(page.getByRole('heading', { level: 1, name: 'จัดการ Feedback' })).toBeVisible();
    await expect(page.getByText(admin.email)).toHaveCount(0);
    await page.getByLabel('สถานะ').selectOption('reviewing');
    await page.getByLabel('ความสำคัญ').selectOption('high');
    await page.getByLabel('ประเด็น').selectOption('navigation');
    await page.getByLabel('บันทึกภายใน — สมาชิกจะไม่เห็น').fill(noteCanary);
    const actionRequestPromise = page.waitForRequest((request) => (
      request.method() === 'POST'
      && Boolean(request.headers()['next-action'])
      && request.postData()?.includes(noteCanary)
    ));
    await page.getByRole('button', { name: 'อัปเดต Feedback' }).click();
    const actionRequest = await actionRequestPromise;
    await expect.poll(async () => (await db.query(
      'SELECT status FROM feedback_submissions WHERE id = ?',
      [feedbackResult.insertId],
    ))[0][0]?.status).toBe('reviewing');

    const [[triaged]] = await db.query(
      'SELECT status, priority, issue_theme, internal_note FROM feedback_submissions WHERE id = ?',
      [feedbackResult.insertId],
    );
    expect(triaged).toEqual(expect.objectContaining({
      status: 'reviewing',
      priority: 'high',
      issue_theme: 'navigation',
      internal_note: noteCanary,
    }));
    const [[audit]] = await db.query(
      `SELECT COUNT(*) AS count,
              SUM(CASE WHEN CAST(metadata AS CHAR) LIKE ? THEN 1 ELSE 0 END) AS leaked
       FROM moderation_audit_logs
       WHERE actor_id = ? AND action = 'research.feedback.triage'`,
      [`%${noteCanary}%`, admin.id],
    );
    expect(Number(audit.count)).toBe(1);
    expect(Number(audit.leaked)).toBe(0);

    for (const forbiddenRole of ['user', 'teacher']) {
      await db.query('UPDATE users SET role = ? WHERE id = ?', [forbiddenRole, admin.id]);
      const response = await replayServerAction(page, actionRequest);
      expect(response.ok()).toBe(true);
      expect(await response.text()).not.toContain(noteCanary);
      await expect.poll(async () => Number((await db.query(
        `SELECT COUNT(*) AS count FROM moderation_audit_logs
         WHERE actor_id = ? AND action = 'research.feedback.triage'`,
        [admin.id],
      ))[0][0].count)).toBe(1);
    }
    await page.context().clearCookies();
    const guestResponse = await replayServerAction(page, actionRequest);
    expect(guestResponse.ok()).toBe(true);
    expect(await guestResponse.text()).not.toContain(noteCanary);
    await expect.poll(async () => Number((await db.query(
      `SELECT COUNT(*) AS count FROM moderation_audit_logs
       WHERE actor_id = ? AND action = 'research.feedback.triage'`,
      [admin.id],
    ))[0][0].count)).toBe(1);

    await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [admin.id]);
    await login(page, admin);

    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { level: 1, name: 'รอบประเมิน' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'สร้างแบบร่าง' })).toHaveCount(0);
  });

  test('lets Super Admin create and advance a pilot campaign and keeps the UI responsive', async ({ page }, testInfo) => {
    const superAdmin = await createAccount('super_admin', testInfo, 'super-campaign');
    const suffix = randomUUID().slice(0, 8);
    const campaignName = `Research UI E2E Campaign ${suffix}`;
    const fillCampaignForm = async () => {
      await page.getByLabel('Slug').fill(`${fixtureSlugPrefix}${suffix}`);
      await page.getByLabel('ชื่อรอบประเมิน').fill(campaignName);
      await page.getByLabel('Questionnaire version').fill('sus-th-pilot-v1');
      await page.getByLabel('Consent notice version').fill('research-notice-pilot-v1');
      await page.getByLabel('จำนวนสมาชิกที่มีสิทธิ์ตอบ (snapshot)').fill('1');
      await page.getByLabel('เริ่มรับคำตอบ (UTC)').fill(utcOffset(-1).toISOString().slice(0, 16));
      await page.getByLabel('สิ้นสุดรับคำตอบ (UTC)').fill(utcOffset(1).toISOString().slice(0, 16));
      await page.getByLabel('ลบคำตอบภายใน (UTC)').fill(utcOffset(30).toISOString().slice(0, 16));
    };
    await login(page, superAdmin);
    await page.goto('/admin/analytics');

    for (const forbiddenRole of ['user', 'teacher', 'admin']) {
      await fillCampaignForm();
      await db.query('UPDATE users SET role = ? WHERE id = ?', [forbiddenRole, superAdmin.id]);
      await page.getByRole('button', { name: 'สร้างแบบร่าง' }).click();
      await expect(page.getByText('สร้างรอบประเมินไม่สำเร็จ กรุณาตรวจข้อมูลและสิทธิ์')).toBeVisible();
      await expect.poll(async () => Number((await db.query(
        'SELECT COUNT(*) AS count FROM evaluation_campaigns WHERE slug = ?',
        [`${fixtureSlugPrefix}${suffix}`],
      ))[0][0].count)).toBe(0);
    }
    await db.query("UPDATE users SET role = 'super_admin' WHERE id = ?", [superAdmin.id]);
    await fillCampaignForm();
    await page.getByRole('button', { name: 'สร้างแบบร่าง' }).click();
    await expect(page.getByRole('heading', { level: 3, name: campaignName })).toBeVisible();
    await page.getByRole('button', { name: 'เปิดรับคำตอบ' }).click();
    await expect(page.getByText('เปิดรับคำตอบ', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'ปิดรับคำตอบ' }).click();
    await page.getByRole('button', { name: 'ล็อกรอบประเมิน' }).click();
    await expect(page.getByText('ล็อกแล้ว', { exact: true })).toBeVisible();

    const [[campaign]] = await db.query(
      'SELECT status, data_scope, questionnaire_version FROM evaluation_campaigns WHERE slug = ?',
      [`${fixtureSlugPrefix}${suffix}`],
    );
    expect(campaign).toEqual(expect.objectContaining({
      status: 'locked',
      data_scope: 'pilot',
      questionnaire_version: 'sus-th-pilot-v1',
    }));

    await createOpenCampaign(superAdmin.id, `visual-${suffix}`);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/feedback');
    await expect(page.getByRole('heading', { level: 1, name: 'แบบประเมินและ Feedback' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('research-feedback-mobile-light.png'), fullPage: false });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByTestId('theme-toggle').click();
    await page.getByTestId('theme-mode-dark').click();
    await page.getByRole('button', { name: 'ปิดการตั้งค่าธีม' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('research-feedback-desktop-dark.png'), fullPage: false });
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
  });
});
