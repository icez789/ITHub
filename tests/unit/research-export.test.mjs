import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import {
  RESEARCH_EXPORT_ENTRY_NAMES,
  buildResearchExportFiles,
  createResearchCsv,
  createStoredZip,
  readStoredZipEntries,
} from '../../lib/researchExportCore.js';
import { buildResearchMetrics, resolveResearchMetricWindow, validateResearchMetricFilters } from '../../lib/researchMetricsCore.js';

function metricsFixture(count = 5) {
  const campaign = {
    campaignId: 7,
    slug: 'pilot-round',
    name: 'Pilot round',
    status: 'locked',
    dataScope: 'pilot',
    eligibleMemberCount: 10,
    startsAt: new Date('2026-09-01T00:00:00.000Z'),
    endsAt: new Date('2026-10-01T00:00:00.000Z'),
  };
  const filters = validateResearchMetricFilters({ campaign: '7' });
  const window = resolveResearchMetricWindow(filters, campaign, {
    now: new Date('2026-10-02T00:00:00.000Z'),
  });
  return buildResearchMetrics({
    campaign,
    filters,
    window,
    consentCount: count,
    evaluations: Array.from({ length: count }, (_, index) => ({
      respondentType: 'student',
      experienceLevel: 'intermediate',
      primaryDevice: 'desktop',
      susScore: 60 + index,
      taskResults: [1, 2, 3, 4, 5].map((taskId) => ({ taskId, result: 'success' })),
    })),
    analytics: {
      subjectCount: count,
      sessionCount: count,
      totalEvents: 30,
      searchNumerator: 4,
      searchDenominator: 5,
      eventCounts: [
        { eventName: 'topic_created', outcome: 'attempt', feed: null, active: null, count: 5 },
        { eventName: 'topic_created', outcome: 'success', feed: null, active: null, count: 4 },
      ],
    },
    observedTasks: [1, 2, 3, 4, 5].map((taskId) => ({ taskId, eligibleCount: count, observedCount: 4 })),
    feedbackRows: [{ category: 'bug', priority: 'high', status: 'reviewing', issueTheme: 'navigation', count: 5 }],
    privateText: 'person+private@example.com',
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted && character === '"' && input[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && character === '\r' && input[index + 1] === '\n') {
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      index += 1;
    } else {
      cell += character;
    }
  }
  return rows;
}

test('writes UTF-8 BOM CSV with deterministic headers, RFC 4180 quoting, and formula protection', () => {
  const csv = createResearchCsv(['label', 'value'], [{ label: 'ไทย,"quoted"', value: '=1+1' }]);
  assert.equal(csv.startsWith('\uFEFFlabel,value\r\n'), true);
  assert.equal(csv.endsWith('\r\n'), true);
  assert.deepEqual(parseCsv(csv), [
    ['label', 'value'],
    ['ไทย,"quoted"', "'=1+1"],
  ]);
});

test('builds the seven allowlisted research files without raw or identifying fields', () => {
  const metrics = metricsFixture();
  metrics.privateText = 'person+private@example.com';
  metrics.userId = 99;
  metrics.subjectKey = 'a'.repeat(64);
  const files = buildResearchExportFiles(metrics, { generatedAt: new Date('2026-09-09T12:00:00.000Z') });
  assert.deepEqual(files.map((file) => file.name), RESEARCH_EXPORT_ENTRY_NAMES);
  const text = files.map((file) => String(file.content)).join('\n');
  for (const forbidden of ['person+private@example.com', '"userId"', '"subjectKey"', 'a'.repeat(64)]) {
    assert.equal(text.includes(forbidden), false);
  }
  for (const file of files.filter((entry) => entry.name.endsWith('.csv'))) {
    assert.equal(String(file.content).startsWith('\uFEFF'), true);
    assert.doesNotThrow(() => parseCsv(String(file.content)));
  }
});

test('round-trips a deterministic stored ZIP with validated CRC checksums', () => {
  const generatedAt = new Date('2026-09-09T12:00:00.000Z');
  const files = buildResearchExportFiles(metricsFixture(), { generatedAt });
  const first = createStoredZip(files, { timestamp: generatedAt });
  const second = createStoredZip(files, { timestamp: generatedAt });
  assert.deepEqual(first, second);
  const entries = readStoredZipEntries(first);
  assert.deepEqual([...entries.keys()], RESEARCH_EXPORT_ENTRY_NAMES);
  assert.equal(entries.get('chapter4_summary.csv').toString('utf8').startsWith('\uFEFFmetric,value'), true);
  assert.match(entries.get('methodology.md').toString('utf8'), /ไม่สร้างข้อสรุปทางวิจัย/);
});

test('exports suppressed cohorts without the hidden exact values', () => {
  const generatedAt = new Date('2026-09-09T12:00:00.000Z');
  const files = buildResearchExportFiles(metricsFixture(4), { generatedAt });
  const text = files.map((file) => String(file.content)).join('\n');
  assert.match(text, /suppressed_n_lt_5/);
  const summary = files.find((file) => file.name === 'chapter4_summary.csv').content;
  const responseRow = parseCsv(summary).find((row) => row[0] === 'response_count');
  assert.equal(responseRow[1], '');
  assert.equal(responseRow.at(-1), 'suppressed_n_lt_5');
});

test('keeps the aggregate-only ZIP within a bounded memory and generation budget', () => {
  const generatedAt = new Date('2026-09-09T12:00:00.000Z');
  const startedAt = performance.now();
  const files = buildResearchExportFiles(metricsFixture(), { generatedAt });
  const archive = createStoredZip(files, { timestamp: generatedAt });
  const durationMs = performance.now() - startedAt;
  assert.equal(archive.length < 1024 * 1024, true);
  assert.equal(durationMs < 250, true);
});
