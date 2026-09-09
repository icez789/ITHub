import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Database,
  Download,
  Filter,
  Gauge,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  EXPERIENCE_LEVEL_OPTIONS,
  CAMPAIGN_STATUS_LABELS,
  FEEDBACK_CATEGORY_OPTIONS,
  PRIMARY_DEVICE_OPTIONS,
  RESEARCH_TASKS,
  RESPONDENT_TYPE_OPTIONS,
} from '../lib/researchQuestionnaire';

const inputClass = 'min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]/25';
const suppressedText = 'ข้อมูลยังไม่พอ (n < 5)';
const categoryLabels = Object.fromEntries(FEEDBACK_CATEGORY_OPTIONS);
const respondentLabels = Object.fromEntries(RESPONDENT_TYPE_OPTIONS);
const experienceLabels = Object.fromEntries(EXPERIENCE_LEVEL_OPTIONS);
const deviceLabels = Object.fromEntries(PRIMARY_DEVICE_OPTIONS);
const priorityLabels = { low: 'ต่ำ', normal: 'ปกติ', high: 'สูง', urgent: 'เร่งด่วน' };
const statusLabels = { new: 'ใหม่', reviewing: 'กำลังตรวจสอบ', planned: 'วางแผนแก้', resolved: 'แก้แล้ว', declined: 'ไม่ดำเนินการ' };
const themeLabels = {
  navigation: 'การนำทาง',
  search: 'การค้นหา',
  content_creation: 'การสร้างเนื้อหา',
  engagement: 'การมีส่วนร่วม',
  personalization: 'เนื้อหาเฉพาะบุคคล',
  performance: 'ประสิทธิภาพ',
  accessibility: 'การช่วยการเข้าถึง',
  other: 'อื่น ๆ',
  unclassified: 'ยังไม่จัดหมวด',
};

function numberText(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits }).format(value);
}

function protectedText(metric) {
  if (metric?.suppressed) return suppressedText;
  return metric?.value == null ? '—' : numberText(metric.value);
}

function rateText(rate) {
  if (rate.suppressed) return suppressedText;
  if (rate.unavailable) return 'ยังคำนวณไม่ได้';
  if (rate.percentage == null) return '—';
  return `${numberText(rate.percentage)}%`;
}

function rateDetail(rate) {
  if (rate.suppressed) return 'ปกปิดทั้งตัวตั้งและตัวหารตาม privacy contract';
  if (rate.unavailable) return rate.unavailableReason === 'The campaign snapshot has no subgroup denominator'
    ? 'ไม่มี denominator แยกตามกลุ่ม จึงไม่แสดงอัตราที่อาจทำให้เข้าใจผิด'
    : 'ยังไม่มี denominator ที่ตรวจสอบได้';
  return `${numberText(rate.numerator)} / ${numberText(rate.denominator)}`;
}

function utcText(value) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function exportHref(metrics) {
  const params = new URLSearchParams({ campaign: String(metrics.campaign.campaignId) });
  for (const [key, value] of [
    ['from', metrics.filters.dateFrom],
    ['to', metrics.filters.dateTo],
    ['respondent', metrics.filters.respondentType],
    ['experience', metrics.filters.experienceLevel],
    ['device', metrics.filters.primaryDevice],
  ]) {
    if (value) params.set(key, value);
  }
  return `/api/admin/research/export?${params.toString()}`;
}

function FilterSelect({ id, name, label, value, options, allLabel = 'ทั้งหมด' }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">{label}</span>
      <select id={id} name={name} defaultValue={value ?? ''} className={inputClass}>
        <option value="">{allLabel}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function OverviewCard({ icon: Icon, label, metric, testId }) {
  return (
    <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--app-text-muted)]">{label}</p>
        <Icon aria-hidden="true" size={18} className="text-[var(--app-accent-text)]" />
      </div>
      <p data-testid={testId} className={`mt-3 font-bold ${metric?.suppressed ? 'text-sm text-[var(--app-text-muted)]' : 'text-3xl'}`}>{protectedText(metric)}</p>
    </article>
  );
}

function BreakdownTable({ caption, rows, labels = {} }) {
  return (
    <div role="region" aria-label={`${caption} — ตารางเลื่อนแนวนอนได้`} tabIndex={0} className="overflow-x-auto rounded-xl border border-[var(--app-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
      <table className="min-w-full text-left text-sm">
        <caption className="border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-4 py-3 text-left font-bold">{caption}</caption>
        <thead className="text-xs text-[var(--app-text-muted)]"><tr><th scope="col" className="px-4 py-2">กลุ่ม</th><th scope="col" className="px-4 py-2 text-right">จำนวน</th></tr></thead>
        <tbody className="divide-y divide-[var(--app-border)]">
          {rows.map((row) => <tr key={row.value}><th scope="row" className="px-4 py-3 font-medium">{labels[row.value] ?? row.value}</th><td className="px-4 py-3 text-right">{row.suppressed ? suppressedText : numberText(row.count)}</td></tr>)}
          {rows.length === 0 ? <tr><td colSpan="2" className="px-4 py-6 text-center text-[var(--app-text-muted)]">ยังไม่มีข้อมูล</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default function ResearchAnalyticsDashboard({ campaigns, metrics, filterError, queryError }) {
  const selectedCampaignId = metrics?.campaign.campaignId ?? '';
  const selected = metrics?.filters ?? {};

  return (
    <section className="mb-10" aria-labelledby="research-dashboard-heading">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent-text)]">Chapter 4–5 evidence</p>
          <h2 id="research-dashboard-heading" className="mt-1 text-2xl font-bold">Dashboard ข้อมูลวิจัย</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-text-muted)]">ตัวเลขทุกอัตราแสดง denominator และวิธีนับใกล้ผลลัพธ์ กลุ่มที่มีข้อมูลต่ำกว่า 5 คนจะถูกปกปิดทั้งหน้าและไฟล์ส่งออก</p>
        </div>
        {metrics ? (
          <a href={exportHref(metrics)} download aria-describedby="research-export-description" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)]">
            <Download aria-hidden="true" size={17} /> สร้างชุดข้อมูลบทที่ 4–5
          </a>
        ) : null}
        {metrics ? <p id="research-export-description" className="sr-only">ดาวน์โหลดไฟล์ ZIP จำนวน 7 ไฟล์ที่มีเฉพาะข้อมูลรวมและ methodology</p> : null}
      </div>

      <form
        method="get"
        action="/admin/analytics"
        className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm"
        aria-labelledby="metric-filter-heading"
        aria-describedby={filterError ? 'research-filter-error' : queryError ? 'research-dashboard-error' : undefined}
      >
        <fieldset>
          <legend id="metric-filter-heading" className="flex items-center gap-2 font-bold"><Filter aria-hidden="true" size={18} /> ตัวกรองข้อมูล</legend>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">วันที่ใช้ UTC และถูกจำกัดให้อยู่ในช่วงของ campaign โดยอัตโนมัติ</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label htmlFor="metric-campaign" className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">รอบประเมิน</span>
              <select id="metric-campaign" name="campaign" defaultValue={String(selectedCampaignId)} required className={inputClass}>
                <option value="" disabled>เลือกรอบประเมิน</option>
                {campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name} · {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}</option>)}
              </select>
            </label>
            <label htmlFor="metric-from" className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ตั้งแต่วันที่ (UTC)</span>
              <input id="metric-from" name="from" type="date" defaultValue={metrics?.window.dateFrom ?? ''} className={inputClass} />
            </label>
            <label htmlFor="metric-to" className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ถึงวันที่ (UTC)</span>
              <input id="metric-to" name="to" type="date" defaultValue={metrics?.window.dateTo ?? ''} className={inputClass} />
            </label>
            <FilterSelect id="metric-respondent" name="respondent" label="ประเภทผู้ตอบ" value={selected.respondentType} options={RESPONDENT_TYPE_OPTIONS} />
            <FilterSelect id="metric-experience" name="experience" label="ประสบการณ์" value={selected.experienceLevel} options={EXPERIENCE_LEVEL_OPTIONS} />
            <FilterSelect id="metric-device" name="device" label="อุปกรณ์หลัก" value={selected.primaryDevice} options={PRIMARY_DEVICE_OPTIONS} />
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] hover:bg-[var(--app-primary-hover)]"><Search aria-hidden="true" size={16} /> ใช้ตัวกรอง</button>
          <Link href="/admin/analytics" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--app-surface-subtle)]">ล้างตัวกรอง</Link>
        </div>
      </form>

      {filterError ? <p id="research-filter-error" role="alert" aria-live="assertive" aria-atomic="true" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{filterError.message}</p> : null}
      {queryError ? <p id="research-dashboard-error" role="alert" aria-live="assertive" aria-atomic="true" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">โหลดข้อมูล Dashboard ไม่สำเร็จ กรุณาลองใหม่ โดยข้อมูล campaign ด้านล่างยังจัดการได้ตามปกติ</p> : null}

      {!metrics && !filterError && !queryError ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-8 text-center">
          <Database aria-hidden="true" className="mx-auto text-[var(--app-text-muted)]" size={30} />
          <p className="mt-3 font-semibold">ยังไม่มี campaign ที่พร้อมคำนวณ</p>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">กำหนดช่วงเวลาและเปิดรอบประเมินก่อน แล้ว Dashboard จะเริ่มแสดงข้อมูลจริง</p>
        </div>
      ) : null}

      {metrics ? (
        <div className="mt-6 space-y-6">
          {metrics.window.partial ? <p role="status" className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Campaign ยังไม่สิ้นสุด ผลนี้เป็นข้อมูลบางส่วนถึง {utcText(metrics.window.endExclusive)} UTC</p> : null}
          {metrics.window.empty ? <p role="status" className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-4 py-3 text-sm text-[var(--app-text-muted)]">ช่วงเวลานี้ยังไม่มีเวลาที่เปิดเก็บข้อมูล</p> : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OverviewCard icon={ShieldCheck} label="ผู้ยินยอมที่ยัง active" metric={metrics.overview.consentCount} testId="metric-consent-count" />
            <OverviewCard icon={Users} label="ผู้ตอบแบบประเมิน" metric={metrics.overview.responseCount} testId="metric-response-count" />
            <OverviewCard icon={Activity} label="ผู้ร่วม Behavioral Analytics" metric={metrics.overview.analyticsSubjectCount} testId="metric-analytics-subjects" />
            <OverviewCard icon={Gauge} label="Session" metric={metrics.overview.sessionCount} testId="metric-session-count" />
            <OverviewCard icon={Database} label="เหตุการณ์ที่ผ่าน allowlist" metric={metrics.overview.eventCount} testId="metric-event-count" />
            <OverviewCard icon={MessageSquareWarning} label="Feedback ใน campaign" metric={metrics.overview.feedbackCount} testId="metric-feedback-count" />
          </div>

          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm" aria-labelledby="rate-heading">
            <h3 id="rate-heading" className="flex items-center gap-2 text-lg font-bold"><BarChart3 aria-hidden="true" size={19} /> อัตราและ Funnel</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {[{ key: 'response_rate', label: 'อัตราการตอบ', rate: metrics.overview.responseRate }, ...metrics.funnels].map((item) => (
                <article key={item.key} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
                  <p className="text-sm font-semibold text-[var(--app-text-muted)]">{item.label}</p>
                  <p data-testid={`metric-${item.key}`} className={`mt-2 font-bold ${item.rate.suppressed ? 'text-sm' : 'text-2xl'}`}>{rateText(item.rate)}</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">ตัวตั้ง / ตัวหาร: {rateDetail(item.rate)}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--app-text-muted)]">{item.rate.deduplication}</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">UTC: {utcText(item.rate.window.start)} – {utcText(item.rate.window.endExclusive)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm" aria-labelledby="sus-heading">
            <h3 id="sus-heading" className="text-lg font-bold">System Usability Scale (SUS)</h3>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">Sample SD · คำนวณเฉพาะคำตอบสถานะ submitted · pilot questionnaire</p>
            {metrics.sus.summary.suppressed ? <p className="mt-4 rounded-xl bg-[var(--app-surface-subtle)] p-4 text-sm font-semibold text-[var(--app-text-muted)]">{suppressedText}</p> : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['จำนวน', metrics.sus.summary.count],
                  ['Mean', metrics.sus.summary.mean],
                  ['Median', metrics.sus.summary.median],
                  ['Sample SD', metrics.sus.summary.standardDeviation],
                  ['Min', metrics.sus.summary.min],
                  ['Max', metrics.sus.summary.max],
                ].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--app-surface-subtle)] p-3"><dt className="text-xs text-[var(--app-text-muted)]">{label}</dt><dd className="mt-1 text-lg font-bold">{numberText(value)}</dd></div>)}
              </dl>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm" aria-labelledby="task-heading">
            <h3 id="task-heading" className="text-lg font-bold">Self-reported เทียบ Observed</h3>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">Unavailable หมายถึงผู้ตอบไม่มี consent ที่ active จึงห้ามตีความว่าไม่สำเร็จ</p>
            <div role="region" aria-label="ผลภารกิจ — ตารางเลื่อนแนวนอนได้" tabIndex={0} className="mt-4 overflow-x-auto rounded-xl border border-[var(--app-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
              <table className="min-w-[760px] w-full text-left text-sm">
                <caption className="sr-only">ผลภารกิจจากแบบประเมินเทียบพฤติกรรมที่สังเกตได้</caption>
                <thead className="bg-[var(--app-surface-subtle)] text-xs text-[var(--app-text-muted)]"><tr><th scope="col" className="px-4 py-3">งาน</th><th scope="col" className="px-4 py-3 text-right">รายงานว่าสำเร็จ</th><th scope="col" className="px-4 py-3 text-right">Observed</th><th scope="col" className="px-4 py-3 text-right">Not observed</th><th scope="col" className="px-4 py-3 text-right">Unavailable</th><th scope="col" className="px-4 py-3 text-right">Observed rate</th></tr></thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {metrics.tasks.map((task) => <tr key={task.taskId}><th scope="row" className="max-w-sm px-4 py-3 font-medium">{task.taskId}. {RESEARCH_TASKS[task.taskId - 1]}</th><td className="px-4 py-3 text-right">{task.selfReported.suppressed ? suppressedText : numberText(task.selfReported.success)}</td><td className="px-4 py-3 text-right">{protectedText(task.observed.observed)}</td><td className="px-4 py-3 text-right">{protectedText(task.observed.notObserved)}</td><td className="px-4 py-3 text-right">{protectedText(task.observed.unavailable)}</td><td className="px-4 py-3 text-right font-semibold">{rateText(task.observed.rate)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3" aria-label="การแบ่งกลุ่มผู้ตอบ">
            <BreakdownTable caption="ประเภทผู้ตอบ" rows={metrics.demographics.respondentType} labels={respondentLabels} />
            <BreakdownTable caption="ประสบการณ์" rows={metrics.demographics.experienceLevel} labels={experienceLabels} />
            <BreakdownTable caption="อุปกรณ์หลัก" rows={metrics.demographics.primaryDevice} labels={deviceLabels} />
          </section>

          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm" aria-labelledby="feedback-summary-heading">
            <h3 id="feedback-summary-heading" className="text-lg font-bold">Feedback แบบ Aggregate</h3>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">ไม่ใช้รายละเอียดข้อความดิบหรือบันทึกภายใน และ suppress ทั้ง breakdown เมื่อมีแถวขนาดต่ำกว่า 5</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <BreakdownTable caption="Category" rows={metrics.feedback.byCategory} labels={categoryLabels} />
              <BreakdownTable caption="Priority" rows={metrics.feedback.byPriority} labels={priorityLabels} />
              <BreakdownTable caption="Status" rows={metrics.feedback.byStatus} labels={statusLabels} />
              <BreakdownTable caption="Issue theme" rows={metrics.feedback.byTheme} labels={themeLabels} />
            </div>
          </section>

          <aside className="rounded-2xl border border-blue-300 bg-blue-50 p-5 text-sm leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100" aria-label="ข้อจำกัดของข้อมูล">
            <h3 className="font-bold">Methodology ที่ต้องอ่านคู่กับผล</h3>
            <p className="mt-1">Response rate ใช้ eligible-member snapshot ของ campaign; หากกรอง demographic จะไม่แสดง rate เพราะไม่มี denominator รายกลุ่ม ส่วน session ใช้ inactivity timeout 30 นาที และค่า SUS ใช้ sample SD ตาม pilot contract</p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
