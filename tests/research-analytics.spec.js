import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import bcrypt from 'bcryptjs';

import db from '../lib/db.js';
import { grantAnalyticsConsentRecord, withdrawAnalyticsConsentRecord } from '../lib/researchConsentCore.js';
import { createResearchSubjectKey } from '../lib/researchPrivacyCore.js';
import { assertE2eSafety } from '../scripts/e2e-safety.mjs';

assertE2eSafety();

const origin = 'http://127.0.0.1:3000';
const fixtureEmailPrefix = 'playwright.analytics.';
const fixtureSlugPrefix = 'analytics-ui-';
const password = process.env.ITHUB_E2E_PASSWORD;

async function createAccount(testInfo, label) {
  const suffix = `${Date.now()}.${testInfo.project.name}.${randomUUID().slice(0, 8)}`
    .replace(/[^a-zA-Z0-9.]/g, '');
  const email = `${fixtureEmailPrefix}${label}.${suffix}@example.invalid`;
  const username = `analytics_${label}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
  const passwordHash = await bcrypt.hash(password, 6);
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, 'user'],
  );
  return { id: Number(result.insertId), email };
}

async function createOpenCampaign(actorId) {
  const slug = `${fixtureSlugPrefix}${randomUUID().slice(0, 8)}`.toLowerCase();
  const [result] = await db.query(
    `INSERT INTO evaluation_campaigns
       (slug, name, status, data_scope, questionnaire_version, consent_notice_version,
        eligible_member_count, starts_at, ends_at, retention_until, opened_at, created_by, updated_by)
     VALUES (?, 'Analytics E2E Pilot', 'open', 'pilot', 'sus-th-pilot-v1',
       'research-notice-pilot-v1', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY),
       DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
       UTC_TIMESTAMP(), ?, ?)`,
    [slug, actorId, actorId],
  );
  return { id: Number(result.insertId), slug };
}

async function cleanupFixtures() {
  await db.query('DELETE FROM evaluation_campaigns WHERE slug LIKE ?', [`${fixtureSlugPrefix}%`]);
  await db.query('DELETE FROM users WHERE email LIKE ?', [`${fixtureEmailPrefix}%`]);
}

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('อีเมล').fill(account.email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
}

function eventPayload(overrides = {}) {
  return {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    eventName: 'page_viewed',
    eventVersion: 1,
    route: '/',
    properties: {},
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

async function postAnalytics(page, payload) {
  if (page.url() === 'about:blank') await page.goto('/');
  return page.evaluate(async (body) => {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }, payload);
}

async function grantConsent(userId) {
  const keyVersion = Number(process.env.ITHUB_ANALYTICS_KEY_VERSION || 1);
  const subjectKey = createResearchSubjectKey(
    userId,
    process.env.ITHUB_ANALYTICS_SECRET,
    keyVersion,
  );
  await grantAnalyticsConsentRecord(db, {
    userId,
    subjectKey,
    keyVersion,
    noticeVersion: 'research-analytics-pilot-v1',
  });
  return subjectKey;
}

test.describe('consented research analytics ingestion', () => {
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

  test('rejects unauthenticated, unconsented, cross-origin, non-JSON, oversized, and PII-shaped requests', async ({ page }, testInfo) => {
    const guestResponse = await postAnalytics(page, { events: [eventPayload()] });
    expect(guestResponse.status).toBe(401);

    const member = await createAccount(testInfo, 'negative');
    await login(page, member);
    const noConsentResponse = await postAnalytics(page, { events: [eventPayload()] });
    expect(noConsentResponse.status).toBe(403);

    const crossOriginResponse = await page.request.post('/api/analytics/events', {
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
      data: { events: [eventPayload()] },
    });
    expect(crossOriginResponse.status()).toBe(403);

    const wrongContentTypeStatus = await page.evaluate(async () => (await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{}',
    })).status);
    expect(wrongContentTypeStatus).toBe(415);

    const oversizedStatus = await page.evaluate(async (body) => (await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })).status, JSON.stringify({ events: [eventPayload()], padding: 'x'.repeat(33 * 1024) }));
    expect(oversizedStatus).toBe(413);

    const piiCanary = `private-${randomUUID()}@example.com`;
    const invalidResponse = await postAnalytics(page, {
      events: [eventPayload({ email: piiCanary, properties: { query: 'private search text' } })],
    });
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body).toEqual({ ok: false, code: 'invalid_payload' });
    const [[stored]] = await db.query(
      `SELECT COUNT(*) AS count FROM analytics_events
       WHERE subject_key IN (SELECT subject_key FROM analytics_consents WHERE user_id = ?)`,
      [member.id],
    );
    expect(Number(stored.count)).toBe(0);
  });

  test('stores normalized pseudonymous rows, deduplicates retries, and stops after withdrawal', async ({ page }, testInfo) => {
    const member = await createAccount(testInfo, 'storage');
    const campaign = await createOpenCampaign(member.id);
    await login(page, member);
    const subjectKey = await grantConsent(member.id);
    const piiCanary = `private-${randomUUID()}@example.com`;
    const sessionId = randomUUID();
    const payload = {
      events: [
        eventPayload({
          sessionId,
          route: `/topic/987?email=${encodeURIComponent(piiCanary)}`,
        }),
        eventPayload({
          sessionId,
          eventName: 'evaluation_submitted',
          outcome: 'success',
          route: '/feedback?draft=private',
          campaignId: campaign.id,
        }),
      ],
    };

    const accepted = await postAnalytics(page, payload);
    expect(accepted.status).toBe(202);
    expect(accepted.body).toEqual({ ok: true, accepted: 2, duplicates: 0 });

    const retry = await postAnalytics(page, payload);
    expect(retry.status).toBe(202);
    expect(retry.body).toEqual({ ok: true, accepted: 0, duplicates: 2 });

    const [rows] = await db.query(
      `SELECT event_id, subject_key, session_key, campaign_id, data_scope, event_name,
              route_path, CAST(properties AS CHAR) AS properties
       FROM analytics_events WHERE subject_key = ? ORDER BY id`,
      [subjectKey],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].route_path).toBe('/topic/[id]');
    expect(rows[1].route_path).toBe('/feedback');
    expect(rows.every((row) => row.subject_key === subjectKey)).toBe(true);
    expect(rows.every((row) => row.session_key !== sessionId && /^[a-f0-9]{64}$/.test(row.session_key))).toBe(true);
    expect(rows.every((row) => row.data_scope === 'pilot')).toBe(true);
    expect(JSON.stringify(rows).includes(piiCanary)).toBe(false);

    await db.query("UPDATE evaluation_campaigns SET status = 'closed', closed_at = UTC_TIMESTAMP() WHERE id = ?", [campaign.id]);
    const closedCampaignResponse = await postAnalytics(page, {
      events: [eventPayload({
        eventName: 'evaluation_started',
        route: '/feedback',
        campaignId: campaign.id,
      })],
    });
    expect(closedCampaignResponse.status).toBe(409);

    await withdrawAnalyticsConsentRecord(db, member.id);
    const afterWithdrawal = await postAnalytics(page, { events: [eventPayload()] });
    expect(afterWithdrawal.status).toBe(403);
    const [[remaining]] = await db.query('SELECT COUNT(*) AS count FROM analytics_events WHERE subject_key = ?', [subjectKey]);
    expect(Number(remaining.count)).toBe(0);
  });

  test('does not make research analytics requests before consent or after withdrawal', async ({ page }, testInfo) => {
    const member = await createAccount(testInfo, 'client-gate');
    await createOpenCampaign(member.id);
    const analyticsRequests = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/analytics/events') analyticsRequests.push(request);
    });

    await login(page, member);
    await page.goto('/feedback');
    await page.waitForTimeout(300);
    expect(analyticsRequests).toHaveLength(0);

    await page.locator('input[name="acknowledged"]').check();
    await page.getByRole('button', { name: 'ยินยอม Research Analytics' }).click();
    await expect(page.getByText('ยินยอมอยู่')).toBeVisible();
    await expect.poll(() => analyticsRequests.length).toBeGreaterThan(0);
    await expect.poll(async () => Number((await db.query(
      `SELECT COUNT(*) AS count FROM analytics_events
       WHERE subject_key IN (SELECT subject_key FROM analytics_consents WHERE user_id = ?)`,
      [member.id],
    ))[0][0].count)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'ถอนความยินยอมและลบ Raw Analytics' }).click();
    await expect(page.getByText('ยังไม่ยินยอม')).toBeVisible();
    await expect.poll(async () => Number((await db.query(
      `SELECT COUNT(*) AS count FROM analytics_events
       WHERE subject_key IN (SELECT subject_key FROM analytics_consents WHERE user_id = ?)`,
      [member.id],
    ))[0][0].count)).toBe(0);
    const requestsAfterWithdrawal = analyticsRequests.length;

    await page.goto('/help');
    await page.goto('/');
    await page.waitForTimeout(300);
    expect(analyticsRequests).toHaveLength(requestsAfterWithdrawal);
  });
});
