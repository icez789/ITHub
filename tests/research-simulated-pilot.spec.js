import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';

import db from '../lib/db.js';
import { readStoredZipEntries, RESEARCH_EXPORT_ENTRY_NAMES } from '../lib/researchExportCore.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';
import { authorizeVercelPreview } from './preview-access.mjs';

assertE2eSafety();

const password = process.env.ITHUB_E2E_PASSWORD;
const campaignSlug = 'pilot-synthetic-round-a';
const campaignName = 'ITHub Synthetic Pilot Round A';
const fixtureEmailPattern = 'pilot.%@example.invalid';
const fixtureTopicPrefix = '[SYNTHETIC PILOT]';
const openTextCanary = 'SYNTHETIC-PILOT-OPEN-TEXT-MUST-NOT-BE-EXPORTED';

const participantProfiles = Object.freeze([
  { code: 'P01', respondentType: 'student', experience: 'beginner', device: 'mobile', viewport: { width: 390, height: 844 }, odd: 5, even: 1, rating: 5, category: 'ux_ui' },
  { code: 'P02', respondentType: 'student', experience: 'intermediate', device: 'desktop', viewport: { width: 1280, height: 800 }, odd: 4, even: 2, rating: 4, category: 'feature' },
  { code: 'P03', respondentType: 'teacher', experience: 'advanced', device: 'desktop', viewport: { width: 1440, height: 900 }, odd: 4, even: 2, rating: 4, category: 'content' },
  { code: 'P04', respondentType: 'other', experience: 'beginner', device: 'tablet', viewport: { width: 820, height: 1180 }, odd: 3, even: 3, rating: 3, category: 'bug' },
  { code: 'P05', respondentType: 'student', experience: 'intermediate', device: 'mobile', viewport: { width: 375, height: 812 }, odd: 5, even: 1, rating: 5, category: 'other' },
]);

function utcInput(offsetMilliseconds) {
  return new Date(Date.now() + offsetMilliseconds).toISOString().slice(0, 16);
}

async function createAccount({ email, username, role = 'user' }) {
  const passwordHash = await bcrypt.hash(password, 6);
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, role],
  );
  return { id: Number(result.insertId), email, username, role };
}

async function cleanupFixtures() {
  await db.query(
    `DELETE FROM moderation_audit_logs
     WHERE actor_id IN (SELECT id FROM users WHERE email LIKE ?)`,
    [fixtureEmailPattern],
  );
  await db.query('DELETE FROM evaluation_campaigns WHERE slug = ?', [campaignSlug]);
  await db.query('DELETE FROM topics WHERE title LIKE ?', [`${fixtureTopicPrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [fixtureEmailPattern]);
}

async function quietWindowCounts() {
  const [[counts]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM analytics_consents WHERE status = 'active') AS active_consents,
       (SELECT COUNT(*) FROM evaluation_campaigns WHERE status = 'open') AS open_campaigns,
       (SELECT COUNT(*) FROM users WHERE email LIKE ?) AS synthetic_accounts`,
    [fixtureEmailPattern],
  );
  return {
    activeConsents: Number(counts.active_consents),
    openCampaigns: Number(counts.open_campaigns),
    syntheticAccounts: Number(counts.synthetic_accounts),
  };
}

async function createMonitoredPage(browser, testInfo, label, viewport = { width: 1280, height: 800 }) {
  const baseUrl = String(testInfo.project.use.baseURL || '');
  const localRun = baseUrl.startsWith('http://127.0.0.1:3000');
  const telemetry = { consoleErrors: [], pageErrors: [], httpErrors: [], ignoredConsole: [] };
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport,
  });
  await context.addInitScript(() => {
    window.localStorage.setItem('ithub_onboarding_v2', 'completed');
    window.localStorage.setItem('theme', 'light');
    window.localStorage.setItem('ithub_palette_v1', 'classic');
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const reportOnlyCspNoise = text.includes(
      "The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy.",
    );
    const vercelToolbarReportOnlyNoise = text.includes("Framing 'https://vercel.live/'")
      && text.includes('report-only Content Security Policy directive');
    const localInsightsNoise = localRun && (
      text.includes('/_vercel/insights/script.js')
      || text === 'Failed to load resource: the server responded with a status of 404 (Not Found)'
    );
    if (reportOnlyCspNoise || vercelToolbarReportOnlyNoise || localInsightsNoise) {
      telemetry.ignoredConsole.push(`${label}: ${text}`);
    }
    else telemetry.consoleErrors.push(`${label}: ${text}`);
  });
  page.on('pageerror', (error) => telemetry.pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    if (localRun && response.status() === 404 && pathname === '/_vercel/insights/script.js') return;
    telemetry.httpErrors.push(`${label}: ${response.status()} ${pathname}`);
  });
  await authorizeVercelPreview(page);
  return { context, page, telemetry };
}

function expectCleanTelemetry(telemetry) {
  expect(telemetry.pageErrors, 'browser page errors').toEqual([]);
  expect(telemetry.consoleErrors, 'browser console errors').toEqual([]);
  expect(telemetry.httpErrors, 'unexpected HTTP 4xx/5xx responses').toEqual([]);
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

async function createAndOpenCampaign(page) {
  await page.goto('/admin/analytics');
  const form = page.getByRole('form', { name: 'สร้างรอบประเมิน' });
  await form.getByLabel('Slug').fill(campaignSlug);
  await form.getByLabel('ชื่อรอบประเมิน').fill(campaignName);
  await form.getByLabel('Questionnaire version').fill('sus-th-pilot-v1');
  await form.getByLabel('Consent notice version').fill('research-notice-pilot-v1');
  await form.getByLabel('จำนวนสมาชิกที่มีสิทธิ์ตอบ (snapshot)').fill('5');
  await form.getByLabel('เริ่มรับคำตอบ (UTC)').fill(utcInput(-15 * 60 * 1000));
  await form.getByLabel('สิ้นสุดรับคำตอบ (UTC)').fill(utcInput(3 * 60 * 60 * 1000));
  await form.getByLabel('ลบคำตอบภายใน (UTC)').fill(utcInput(30 * 24 * 60 * 60 * 1000));
  await form.getByRole('button', { name: 'สร้างแบบร่าง' }).click();

  await expect.poll(async () => {
    const [[campaign]] = await db.query(
      'SELECT id, status FROM evaluation_campaigns WHERE slug = ? LIMIT 1',
      [campaignSlug],
    );
    return campaign ? { id: Number(campaign.id), status: campaign.status } : null;
  }, { timeout: 30_000 }).toEqual(expect.objectContaining({ status: 'draft' }));

  const [[campaign]] = await db.query(
    'SELECT id, status FROM evaluation_campaigns WHERE slug = ? LIMIT 1',
    [campaignSlug],
  );
  const campaignId = Number(campaign.id);
  const campaignCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: campaignName }),
  });
  await expect(campaignCard).toBeVisible();
  await campaignCard.getByRole('button', { name: 'เปิดรับคำตอบ' }).click();
  await expect.poll(async () => (await db.query(
    'SELECT status FROM evaluation_campaigns WHERE id = ?',
    [campaignId],
  ))[0][0]?.status, { timeout: 30_000 }).toBe('open');
  return campaignId;
}

async function createSearchTopic(authorId) {
  const title = `${fixtureTopicPrefix} shared searchable topic`;
  const [result] = await db.query(
    `INSERT INTO topics (title, category, content, user_id)
     VALUES (?, 'Software', '<p>Synthetic Pilot fixture without personal information</p>', ?)`,
    [title, authorId],
  );
  return { id: Number(result.insertId), title };
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
  }, { timeout: 30_000 }).toMatch(/^[a-f0-9]{64}$/);
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

async function performFiveTasks(page, participant, author, searchTopic, subjectKey) {
  const createdTitle = `${fixtureTopicPrefix} ${participant.code} created topic`;
  const commentText = `Synthetic Pilot ${participant.code} comment fixture`;

  await page.goto('/');
  const searchInput = page.locator('input[aria-label="ค้นหากระทู้"]:visible');
  if (participant.code === 'P05') {
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  }
  await searchInput.fill(searchTopic.title);
  await expect(page).toHaveURL((url) => url.searchParams.get('search') === searchTopic.title);
  const searchCard = page.locator('#topic-feed article').filter({
    has: page.getByRole('heading', { level: 3, name: searchTopic.title }),
  });
  await expect(searchCard).toBeVisible();
  await searchCard.locator('a[href^="/topic/"]').click();
  await expect(page).toHaveURL((url) => url.pathname === `/topic/${searchTopic.id}`);

  await page.goto('/create');
  await page.locator('input[name="title"]').fill(createdTitle);
  await page.locator('select[name="category"]').selectOption('Software');
  await page.locator('.ql-editor').fill(`Synthetic Pilot ${participant.code} topic content.`);
  await page.getByRole('button', { name: 'โพสต์กระทู้' }).click();
  await expect(page).toHaveURL(/\/topic\/\d+$/);
  const createdTopicId = Number(new URL(page.url()).pathname.split('/').pop());
  await expect.poll(async () => {
    const [[topic]] = await db.query(
      'SELECT image_url FROM topics WHERE id = ? AND user_id = ?',
      [createdTopicId, participant.id],
    );
    return topic ? { found: true, imageUrl: topic.image_url } : null;
  }).toEqual({ found: true, imageUrl: null });

  await page.goto(`/topic/${searchTopic.id}`);
  await page.locator('.ql-editor').last().fill(commentText);
  await page.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
  await expect.poll(async () => Number((await db.query(
    'SELECT COUNT(*) AS count FROM comments WHERE topic_id = ? AND user_id = ?',
    [searchTopic.id, participant.id],
  ))[0][0].count)).toBe(1);

  const likeButton = page.getByRole('button', { name: /ถูกใจกระทู้|ยกเลิกถูกใจ/ });
  const bookmarkButton = page.getByRole('button', { name: /บันทึกกระทู้|นำกระทู้ออก/ });
  await likeButton.click();
  await expect(likeButton).toHaveAttribute('aria-pressed', 'true');
  await bookmarkButton.click();
  await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');

  const followButton = page.getByRole('button', { name: `ติดตาม ${author.username}` });
  await followButton.click();
  await expect(followButton).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`/?feed=following&search=${encodeURIComponent(searchTopic.title)}`);
  await expect(page.getByRole('heading', { level: 3, name: searchTopic.title })).toBeVisible();

  await expect.poll(
    () => observedPilotTasks(subjectKey),
    { timeout: 30_000 },
  ).toEqual([1, 1, 1, 1, 1]);
}

async function submitEvaluationAndFeedback(page, participant, campaignId, subjectKey) {
  await page.goto('/feedback');
  const evaluationForm = page.getByRole('form', { name: campaignName });
  await expect(evaluationForm).toBeVisible();
  await evaluationForm.getByLabel('ประเภทผู้ตอบ').selectOption(participant.respondentType);
  await evaluationForm.getByLabel('ประสบการณ์ใช้งาน').selectOption(participant.experience);
  await evaluationForm.getByLabel('อุปกรณ์หลัก').selectOption(participant.device);
  for (let question = 1; question <= 10; question += 1) {
    const score = question % 2 === 1 ? participant.odd : participant.even;
    await evaluationForm.locator(`input[name="sus_${question}"][value="${score}"]`).check();
  }
  for (let taskIndex = 1; taskIndex <= 5; taskIndex += 1) {
    await evaluationForm.locator(`select[name="task_${taskIndex}_result"]`).selectOption('success');
    await evaluationForm.locator(`select[name="task_${taskIndex}_difficulty"]`)
      .selectOption(String(((taskIndex + Number(participant.code.slice(1))) % 5) + 1));
  }
  await evaluationForm.locator('textarea[name="openFeedback"]')
    .fill(`${openTextCanary}-${participant.code}`);
  await evaluationForm.locator('input[name="evaluationConsent"]').check();
  await evaluationForm.getByRole('button', { name: 'ส่งแบบประเมินหนึ่งครั้ง' }).click();
  await expect.poll(async () => Number((await db.query(
    `SELECT COUNT(*) AS count FROM evaluation_responses
     WHERE campaign_id = ? AND user_id = ? AND response_status = 'submitted'`,
    [campaignId, participant.id],
  ))[0][0].count), { timeout: 30_000 }).toBe(1);

  const feedbackForm = page.getByRole('form', { name: '2. แจ้งปัญหาหรือข้อเสนอแนะ' });
  await feedbackForm.getByLabel('ประเภท Feedback').selectOption(participant.category);
  await feedbackForm.getByLabel('ความพึงพอใจ (ไม่บังคับ)').selectOption(String(participant.rating));
  await feedbackForm.getByLabel('รอบประเมินที่เกี่ยวข้อง (ไม่บังคับ)')
    .selectOption(String(campaignId));
  await feedbackForm.getByLabel('รายละเอียด')
    .fill(`Synthetic Pilot ${participant.code} generated feedback fixture only.`);
  await feedbackForm.getByRole('button', { name: 'ส่ง Feedback', exact: true }).click();
  await expect.poll(async () => Number((await db.query(
    'SELECT COUNT(*) AS count FROM feedback_submissions WHERE campaign_id = ? AND user_id = ?',
    [campaignId, participant.id],
  ))[0][0].count), { timeout: 30_000 }).toBe(1);

  await expect.poll(async () => Number((await db.query(
    `SELECT COUNT(DISTINCT event_name) AS count FROM analytics_events
     WHERE subject_key = ? AND event_name IN ('evaluation_submitted', 'feedback_submitted')`,
    [subjectKey],
  ))[0][0].count), { timeout: 30_000 }).toBe(2);
}

async function verifyDashboardAndExport(page, campaignId, participants, testInfo) {
  await page.goto(`/admin/analytics?campaign=${campaignId}`);
  await expect(page.getByRole('heading', { level: 2, name: 'Dashboard ข้อมูลวิจัย' })).toBeVisible();
  await expect(page.getByTestId('metric-consent-count')).toHaveText('5');
  await expect(page.getByTestId('metric-response-count')).toHaveText('5');
  await expect(page.getByTestId('metric-response_rate')).toHaveText('100%');
  await expect(page.getByTestId('metric-search_to_open_5m')).toHaveText('100%');
  await expect(page.getByTestId('metric-topic_create_success')).toHaveText('100%');
  await expect(page.getByTestId('metric-comment_create_success')).toHaveText('100%');
  await expect(page.getByRole('table', {
    name: 'ผลภารกิจจากแบบประเมินเทียบพฤติกรรมที่สังเกตได้',
  })).toBeVisible();

  const taskRegion = page.getByRole('region', { name: 'ผลภารกิจ — ตารางเลื่อนแนวนอนได้' });
  await taskRegion.focus();
  await expect(taskRegion).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('synthetic-pilot-dashboard.png'),
    fullPage: false,
    animations: 'disabled',
  });

  const exportLink = page.getByRole('link', { name: 'สร้างชุดข้อมูลบทที่ 4–5' });
  const href = await exportLink.getAttribute('href');
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/zip');
  const entries = readStoredZipEntries(await response.body());
  expect([...entries.keys()]).toEqual(RESEARCH_EXPORT_ENTRY_NAMES);
  const exportText = [...entries.values()].map((entry) => entry.toString('utf8')).join('\n');
  expect(exportText).not.toContain(openTextCanary);
  for (const participant of participants) {
    expect(exportText).not.toContain(participant.email);
    expect(exportText).not.toContain(participant.username);
  }
  return [...entries.keys()];
}

async function closeAndLockCampaign(page, campaignId) {
  await page.goto(`/admin/analytics?campaign=${campaignId}`);
  const campaignCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: campaignName }),
  });
  await campaignCard.getByRole('button', { name: 'ปิดรับคำตอบ' }).click();
  await expect.poll(async () => (await db.query(
    'SELECT status FROM evaluation_campaigns WHERE id = ?',
    [campaignId],
  ))[0][0]?.status, { timeout: 30_000 }).toBe('closed');
  await campaignCard.getByRole('button', { name: 'ล็อกรอบประเมิน' }).click();
  await expect.poll(async () => (await db.query(
    'SELECT status FROM evaluation_campaigns WHERE id = ?',
    [campaignId],
  ))[0][0]?.status, { timeout: 30_000 }).toBe('locked');
}

async function readPilotSummary(campaignId) {
  const [[summary]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM evaluation_responses WHERE campaign_id = ? AND response_status = 'submitted') AS responses,
       (SELECT ROUND(AVG(sus_score), 2) FROM evaluation_responses WHERE campaign_id = ? AND response_status = 'submitted') AS mean_sus,
       (SELECT COUNT(*) FROM feedback_submissions WHERE campaign_id = ?) AS feedback,
       (SELECT COUNT(DISTINCT consent.subject_key)
          FROM analytics_consents consent
          INNER JOIN users user ON user.id = consent.user_id
         WHERE consent.status = 'active' AND user.email LIKE ?) AS active_consents,
       (SELECT COUNT(DISTINCT event.subject_key)
          FROM analytics_events event
          INNER JOIN analytics_consents consent ON consent.subject_key = event.subject_key
          INNER JOIN users user ON user.id = consent.user_id
         WHERE event.data_scope = 'pilot' AND user.email LIKE ?) AS observed_participants,
       (SELECT COUNT(*) FROM analytics_events event
          INNER JOIN analytics_consents consent ON consent.subject_key = event.subject_key
          INNER JOIN users user ON user.id = consent.user_id
         WHERE event.data_scope = 'pilot' AND user.email LIKE ?) AS analytics_events`,
    [campaignId, campaignId, campaignId, fixtureEmailPattern, fixtureEmailPattern, fixtureEmailPattern],
  );
  return {
    responses: Number(summary.responses),
    meanSus: Number(summary.mean_sus),
    feedback: Number(summary.feedback),
    activeConsents: Number(summary.active_consents),
    observedParticipants: Number(summary.observed_participants),
    analyticsEvents: Number(summary.analytics_events),
  };
}

test.describe('Synthetic Research Pilot full story', () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60 * 1000 });

  test.beforeEach(async () => {
    await cleanupFixtures();
    expect(await quietWindowCounts()).toEqual({
      activeConsents: 0,
      openCampaigns: 0,
      syntheticAccounts: 0,
    });
  });

  test.afterEach(async () => cleanupFixtures());

  test('runs P01-P05 through campaign, tasks, evaluation, feedback, dashboard, export, and cleanup', async ({ browser }, testInfo) => {
    const admin = await createAccount({
      email: 'pilot.synthetic.admin@example.invalid',
      username: 'pilot_synthetic_admin',
      role: 'super_admin',
    });
    const author = await createAccount({
      email: 'pilot.synthetic.author@example.invalid',
      username: 'pilot_synthetic_author',
    });
    const participants = [];
    for (const profile of participantProfiles) {
      participants.push({
        ...profile,
        ...await createAccount({
          email: `pilot.${profile.code.toLowerCase()}@example.invalid`,
          username: `pilot_${profile.code.toLowerCase()}`,
        }),
      });
    }

    const runtimes = [];
    try {
      const adminRuntime = await createMonitoredPage(browser, testInfo, 'ADMIN');
      runtimes.push(adminRuntime);
      await login(adminRuntime.page, admin);
      const campaignId = await createAndOpenCampaign(adminRuntime.page);
      const searchTopic = await createSearchTopic(author.id);

      for (const participant of participants) {
        const runtime = await createMonitoredPage(
          browser,
          testInfo,
          participant.code,
          participant.viewport,
        );
        runtimes.push(runtime);
        await login(runtime.page, participant);
        const subjectKey = await enableAnalytics(runtime.page, participant.id);
        await performFiveTasks(runtime.page, participant, author, searchTopic, subjectKey);
        await submitEvaluationAndFeedback(runtime.page, participant, campaignId, subjectKey);
        expectCleanTelemetry(runtime.telemetry);
        await runtime.context.close();
        runtimes.splice(runtimes.indexOf(runtime), 1);
      }

      const summary = await readPilotSummary(campaignId);
      expect(summary.responses).toBe(5);
      expect(summary.feedback).toBe(5);
      expect(summary.activeConsents).toBe(5);
      expect(summary.observedParticipants).toBe(5);
      expect(summary.analyticsEvents).toBeGreaterThan(0);
      const exportEntries = await verifyDashboardAndExport(
        adminRuntime.page,
        campaignId,
        participants,
        testInfo,
      );
      await closeAndLockCampaign(adminRuntime.page, campaignId);
      expectCleanTelemetry(adminRuntime.telemetry);

      const report = {
        label: 'synthetic-only-not-human-research',
        participants: participants.map((participant) => participant.code),
        campaignStatus: 'locked',
        ...summary,
        exportEntries,
      };
      await testInfo.attach('synthetic-pilot-summary', {
        body: Buffer.from(JSON.stringify(report, null, 2)),
        contentType: 'application/json',
      });
      console.log(`SYNTHETIC_PILOT_SUMMARY ${JSON.stringify(report)}`);
    } finally {
      await Promise.allSettled(runtimes.map(({ context }) => context.close()));
    }

    await cleanupFixtures();
    expect(await quietWindowCounts()).toEqual({
      activeConsents: 0,
      openCampaigns: 0,
      syntheticAccounts: 0,
    });
  });
});
