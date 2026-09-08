import { escapeCsvCell } from './researchShared.js';
import { RESEARCH_TASKS } from './researchQuestionnaire.js';

export const RESEARCH_EXPORT_ENTRY_NAMES = Object.freeze([
  'chapter4_summary.csv',
  'sus_results.csv',
  'task_results.csv',
  'analytics_funnels.csv',
  'feedback_themes.csv',
  'methodology.md',
  'data_dictionary.md',
]);

const utf8Flag = 0x0800;

function displayNumber(value) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function protectedStatus(value) {
  if (value?.suppressed) return 'suppressed_n_lt_5';
  return value?.value == null ? 'unavailable' : 'available';
}

function rateStatus(rate) {
  if (rate.suppressed) return 'suppressed_n_lt_5';
  if (rate.unavailable) return 'unavailable';
  return 'available';
}

export function createResearchCsv(headers, rows) {
  if (!Array.isArray(headers) || headers.length === 0 || headers.some((header) => typeof header !== 'string')) {
    throw new Error('CSV headers are required');
  }
  if (!Array.isArray(rows)) throw new Error('CSV rows must be an array');
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    const values = Array.isArray(row) ? row : headers.map((header) => row?.[header]);
    if (values.length !== headers.length) throw new Error('CSV row width does not match its headers');
    lines.push(values.map(escapeCsvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function chapter4Summary(metrics) {
  const rows = [
    ['consent_count', metrics.overview.consentCount],
    ['response_count', metrics.overview.responseCount],
    ['analytics_subject_count', metrics.overview.analyticsSubjectCount],
    ['session_count', metrics.overview.sessionCount],
    ['analytics_event_count', metrics.overview.eventCount],
    ['feedback_count', metrics.overview.feedbackCount],
  ].map(([metric, protectedMetric]) => ({
    metric,
    value: displayNumber(protectedMetric.value),
    numerator: '',
    denominator: '',
    percentage: '',
    window_start_utc: metrics.window.start,
    window_end_exclusive_utc: metrics.window.endExclusive,
    deduplication: metric === 'session_count' ? 'distinct server-derived HMAC session key' : 'aggregate count',
    status: protectedStatus(protectedMetric),
  }));
  const responseRate = metrics.overview.responseRate;
  rows.push({
    metric: 'response_rate',
    value: '',
    numerator: displayNumber(responseRate.numerator),
    denominator: displayNumber(responseRate.denominator),
    percentage: displayNumber(responseRate.percentage),
    window_start_utc: responseRate.window.start,
    window_end_exclusive_utc: responseRate.window.endExclusive,
    deduplication: responseRate.deduplication,
    status: rateStatus(responseRate),
  });
  return createResearchCsv([
    'metric',
    'value',
    'numerator',
    'denominator',
    'percentage',
    'window_start_utc',
    'window_end_exclusive_utc',
    'deduplication',
    'status',
  ], rows);
}

function susResults(metrics) {
  const summary = metrics.sus.summary;
  const rows = [{
    section: 'summary',
    group: 'overall',
    count: displayNumber(summary.count),
    mean: displayNumber(summary.mean),
    median: displayNumber(summary.median),
    sample_standard_deviation: displayNumber(summary.standardDeviation),
    min: displayNumber(summary.min),
    max: displayNumber(summary.max),
    status: summary.suppressed ? 'suppressed_n_lt_5' : 'available',
  }];
  for (const row of metrics.sus.distribution) {
    rows.push({
      section: 'distribution',
      group: row.value,
      count: displayNumber(row.count),
      mean: '',
      median: '',
      sample_standard_deviation: '',
      min: '',
      max: '',
      status: row.suppressed ? 'suppressed_n_lt_5' : 'available',
    });
  }
  return createResearchCsv([
    'section',
    'group',
    'count',
    'mean',
    'median',
    'sample_standard_deviation',
    'min',
    'max',
    'status',
  ], rows);
}

function taskResults(metrics) {
  const rows = metrics.tasks.map((task) => ({
    task_id: task.taskId,
    task: RESEARCH_TASKS[task.taskId - 1] ?? `Task ${task.taskId}`,
    self_reported_success: displayNumber(task.selfReported.success),
    self_reported_partial: displayNumber(task.selfReported.partial),
    self_reported_failed: displayNumber(task.selfReported.failed),
    self_reported_not_attempted: displayNumber(task.selfReported.notAttempted),
    observed: displayNumber(task.observed.observed.value),
    not_observed: displayNumber(task.observed.notObserved.value),
    unavailable: displayNumber(task.observed.unavailable.value),
    observed_denominator: displayNumber(task.observed.rate.denominator),
    observed_rate_percentage: displayNumber(task.observed.rate.percentage),
    status: task.observed.rate.suppressed ? 'suppressed_n_lt_5' : 'available',
  }));
  return createResearchCsv([
    'task_id',
    'task',
    'self_reported_success',
    'self_reported_partial',
    'self_reported_failed',
    'self_reported_not_attempted',
    'observed',
    'not_observed',
    'unavailable',
    'observed_denominator',
    'observed_rate_percentage',
    'status',
  ], rows);
}

function analyticsFunnels(metrics) {
  const rows = metrics.funnels.map((funnel) => ({
    metric: funnel.key,
    label: funnel.label,
    value: '',
    numerator: displayNumber(funnel.rate.numerator),
    denominator: displayNumber(funnel.rate.denominator),
    percentage: displayNumber(funnel.rate.percentage),
    window_start_utc: funnel.rate.window.start,
    window_end_exclusive_utc: funnel.rate.window.endExclusive,
    deduplication: funnel.rate.deduplication,
    status: rateStatus(funnel.rate),
  }));
  for (const item of [...metrics.engagement, ...metrics.feeds.map((row) => ({
    key: `feed_${row.feed}`,
    label: `Feed ${row.feed}`,
    count: row.count,
  }))]) {
    rows.push({
      metric: item.key,
      label: item.label,
      value: displayNumber(item.count.value),
      numerator: '',
      denominator: '',
      percentage: '',
      window_start_utc: metrics.window.start,
      window_end_exclusive_utc: metrics.window.endExclusive,
      deduplication: 'unique event IDs',
      status: protectedStatus(item.count),
    });
  }
  return createResearchCsv([
    'metric',
    'label',
    'value',
    'numerator',
    'denominator',
    'percentage',
    'window_start_utc',
    'window_end_exclusive_utc',
    'deduplication',
    'status',
  ], rows);
}

function feedbackThemes(metrics) {
  const dimensions = [
    ['category', metrics.feedback.byCategory],
    ['priority', metrics.feedback.byPriority],
    ['status', metrics.feedback.byStatus],
    ['issue_theme', metrics.feedback.byTheme],
  ];
  const rows = dimensions.flatMap(([dimension, values]) => values.map((row) => ({
    dimension,
    value: row.value,
    count: displayNumber(row.count),
    status: row.suppressed ? 'suppressed_n_lt_5' : 'available',
  })));
  return createResearchCsv(['dimension', 'value', 'count', 'status'], rows);
}

function methodology(metrics, generatedAt) {
  const filter = (value) => value ?? 'all';
  return `# ระเบียบวิธีสำหรับชุดข้อมูลบทที่ 4–5

- Campaign: ${metrics.campaign.slug}
- Data scope: ${metrics.campaign.dataScope}
- Generated at (UTC): ${generatedAt.toISOString()}
- Window: [${metrics.window.start}, ${metrics.window.endExclusive})
- Respondent type: ${filter(metrics.filters.respondentType)}
- Experience level: ${filter(metrics.filters.experienceLevel)}
- Primary device: ${filter(metrics.filters.primaryDevice)}
- Response denominator: eligible_member_count snapshot ของ campaign; ไม่คำนวณย้อนหลังจากสมาชิกปัจจุบัน
- Consent count: consent สถานะ active ที่ grant ก่อนปลายช่วง; demographic filter นับเฉพาะ consent ที่เชื่อมกับ submitted response ใน campaign
- Search-to-open: search_performed ที่มี search_result_opened ใน subject/session เดียวกันภายใน 5 นาที
- Create success: success events หารด้วย attempt events หลัง unique event ID deduplication
- Session: HMAC session key จาก browser session ที่มี inactivity timeout 30 นาที
- SUS: ใช้ sample standard deviation; ข้อความและเวอร์ชันแบบสอบถามยังเป็น pilot จนกว่าจะได้รับการรับรอง
- Observed tasks: แยก observed, not_observed และ unavailable; การไม่มี consent หรือ event ไม่ถูกตีความเป็นความล้มเหลว
- Privacy: suppress ทุกกลุ่มที่มี n < 5 และ suppress ทั้ง breakdown หากการแสดงแถวอื่นทำให้อนุมานกลุ่มเล็กได้
- Campaign attribution: event ที่ไม่มี campaign_id ใช้ data scope และช่วง UTC ที่เลือก จึงอาจนับซ้ำระหว่าง campaign ที่มีช่วงเวลาทับกัน
- Snapshot: metric files ทั้งชุดสร้างจาก read transaction เดียวกันต่อ request
- Exclusions: ไม่มีชื่อ อีเมล username user ID pseudonym event ID internal note ข้อความปลายเปิด หรือรายละเอียด Feedback ดิบ

ระบบนี้จัดเตรียมตารางผลและข้อจำกัดของข้อมูลเท่านั้น ไม่สร้างข้อสรุปทางวิจัยแทนผู้จัดทำ
`;
}

function dataDictionary() {
  return `# Data dictionary

| File | Content |
| --- | --- |
| chapter4_summary.csv | จำนวนรวมและ response rate พร้อม denominator และช่วงเวลา |
| sus_results.csv | สถิติ SUS และ distribution ที่ผ่าน suppression |
| task_results.csv | ผล self-reported เทียบ observed/not_observed/unavailable |
| analytics_funnels.csv | Search/create funnels และกิจกรรมสำคัญแบบ aggregate |
| feedback_themes.csv | จำนวน Feedback ตาม controlled category/priority/status/issue theme |

## Shared status values

- available: แสดงค่าได้ตาม privacy contract
- suppressed_n_lt_5: ไม่แสดงค่าเพราะกลุ่มมีขนาดต่ำกว่า 5 หรือเสี่ยงอนุมานกลุ่มเล็ก
- unavailable: ไม่มี denominator หรือข้อมูลที่จำเป็นสำหรับ metric นั้น

วันเวลาเป็น UTC และช่วงเวลาใช้รูปแบบ half-open [start, endExclusive)
`;
}

export function buildResearchExportFiles(metrics, { generatedAt = new Date() } = {}) {
  const timestamp = generatedAt instanceof Date ? new Date(generatedAt) : new Date(generatedAt);
  if (!Number.isFinite(timestamp.getTime())) throw new Error('Invalid export timestamp');
  return [
    { name: 'chapter4_summary.csv', content: chapter4Summary(metrics) },
    { name: 'sus_results.csv', content: susResults(metrics) },
    { name: 'task_results.csv', content: taskResults(metrics) },
    { name: 'analytics_funnels.csv', content: analyticsFunnels(metrics) },
    { name: 'feedback_themes.csv', content: feedbackThemes(metrics) },
    { name: 'methodology.md', content: methodology(metrics, timestamp) },
    { name: 'data_dictionary.md', content: dataDictionary() },
  ];
}

let crcTable;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      return value >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid ZIP timestamp');
  const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()));
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

export function createStoredZip(files, { timestamp = new Date() } = {}) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 0xffff) {
    throw new Error('ZIP files are required');
  }
  const seen = new Set();
  const localParts = [];
  const centralParts = [];
  const { time, date } = dosTimestamp(timestamp);
  let offset = 0;

  for (const file of files) {
    if (!file || typeof file.name !== 'string' || !/^[a-z0-9_.-]+$/.test(file.name) || seen.has(file.name)) {
      throw new Error('Invalid or duplicate ZIP entry name');
    }
    seen.add(file.name);
    const name = Buffer.from(file.name, 'utf8');
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content), 'utf8');
    if (content.length > 0xffffffff) throw new Error('ZIP entry is too large');
    const checksum = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(utf8Flag, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(utf8Flag, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function readStoredZipEntries(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    if (offset + 30 > buffer.length) throw new Error('Invalid ZIP local header');
    const method = buffer.readUInt16LE(offset + 8);
    const checksum = buffer.readUInt32LE(offset + 14);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (method !== 0) throw new Error('ZIP entry is not stored');
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const contentEnd = contentStart + size;
    if (contentEnd > buffer.length) throw new Error('Invalid ZIP entry bounds');
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const content = buffer.subarray(contentStart, contentEnd);
    if (crc32(content) !== checksum) throw new Error('Invalid ZIP entry checksum');
    entries.set(name, Buffer.from(content));
    offset = contentEnd;
  }
  return entries;
}
