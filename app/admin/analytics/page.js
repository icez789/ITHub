import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BarChart3, CalendarClock, FlaskConical, LockKeyhole, Plus } from 'lucide-react';

import {
  ResearchCampaignForm,
  ResearchCampaignTransitionForm,
} from '../../../components/ResearchAdminForms';
import ResearchAnalyticsDashboard from '../../../components/ResearchAnalyticsDashboard';
import { getCurrentUser } from '../../../lib/auth';
import {
  getResearchAnalyticsForAdmin,
  getResearchCampaignsForAdmin,
} from '../../../lib/research';
import { CAMPAIGN_STATUS_LABELS } from '../../../lib/researchQuestionnaire';
import { isAdminRole, isSuperAdminRole } from '../../../lib/roles';

export const metadata = { title: 'จัดการรอบประเมิน | ITHub' };

function formatDate(value) {
  if (!value) return 'ยังไม่กำหนด';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
}
function utcInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : '';
}

function statusClass(status) {
  if (status === 'open') return 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300';
  if (status === 'closed') return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (status === 'locked') return 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  return 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]';
}

function transitionFor(status) {
  if (status === 'draft') return { nextStatus: 'open', label: 'เปิดรับคำตอบ' };
  if (status === 'open') return { nextStatus: 'closed', label: 'ปิดรับคำตอบ' };
  if (status === 'closed') return { nextStatus: 'locked', label: 'ล็อกรอบประเมิน' };
  return null;
}

export default async function ResearchCampaignPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login?next=%2Fadmin%2Fanalytics');
  if (!isAdminRole(currentUser.role)) redirect('/');

  const params = await searchParams;
  let dashboard;
  let queryError = false;
  try {
    dashboard = await getResearchAnalyticsForAdmin(params);
  } catch {
    queryError = true;
    dashboard = {
      campaigns: await getResearchCampaignsForAdmin().catch(() => []),
      metrics: null,
      filterError: null,
    };
  }
  const { campaigns, metrics, filterError } = dashboard;
  const canManage = isSuperAdminRole(currentUser.role);

  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
      <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-accent-text)]">
        <ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ
      </Link>
      <header className="mb-8 flex flex-col gap-4 border-b border-[var(--app-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[var(--app-primary-contrast)]"><BarChart3 aria-hidden="true" size={23} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent-text)]">Research administration</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">รอบประเมิน</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-text-muted)]">ตรวจตัวชี้วัดแบบไม่เปิดเผยตัวตน ส่งออกชุดข้อมูลบทที่ 4–5 และควบคุมลำดับ draft → open → closed → locked</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text-muted)]">
          {canManage ? <LockKeyhole aria-hidden="true" size={15} /> : <FlaskConical aria-hidden="true" size={15} />}
          {canManage ? 'Super Admin จัดการได้' : 'Admin ดูและส่งออกได้'}
        </span>
      </header>

      <ResearchAnalyticsDashboard
        campaigns={campaigns}
        metrics={metrics}
        filterError={filterError}
        queryError={queryError}
      />

      {canManage ? (
        <section className="mb-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="create-campaign-heading">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]"><Plus aria-hidden="true" size={18} /></span>
            <div>
              <h2 id="create-campaign-heading" className="text-lg font-bold">สร้างรอบประเมินแบบร่าง</h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">เปิดได้เฉพาะ pilot ที่ใช้ questionnaire version ซึ่งรองรับ และมี denominator/dates ครบ</p>
            </div>
          </div>
          <ResearchCampaignForm />
        </section>
      ) : null}

      <section aria-labelledby="campaign-list-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="campaign-list-heading" className="text-xl font-bold">รอบประเมินทั้งหมด</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">เวลาแสดงผลด้านล่างเป็นเวลาไทย ส่วนช่องแก้ไขใช้ UTC ตาม data contract</p>
          </div>
          <span className="text-sm font-semibold text-[var(--app-text-muted)]">{campaigns.length} รอบ</span>
        </div>

        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const transition = transitionFor(campaign.status);
            const formCampaign = {
              campaignId: campaign.campaignId,
              slug: campaign.slug,
              name: campaign.name,
              questionnaireVersion: campaign.questionnaireVersion,
              consentNoticeVersion: campaign.consentNoticeVersion,
              eligibleMemberCount: campaign.eligibleMemberCount,
              startsAtInput: utcInput(campaign.startsAt),
              endsAtInput: utcInput(campaign.endsAt),
              retentionUntilInput: utcInput(campaign.retentionUntil),
            };
            return (
              <article key={campaign.campaignId} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{campaign.name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(campaign.status)}`}>{CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}</span>
                      <span className="rounded-full border border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text-muted)]">pilot</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{campaign.slug} · {campaign.questionnaireVersion}</p>
                  </div>
                  {canManage && transition ? <ResearchCampaignTransitionForm campaignId={campaign.campaignId} {...transition} /> : null}
                </div>

                <dl className="mt-5 grid gap-3 rounded-xl bg-[var(--app-surface-subtle)] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs font-semibold text-[var(--app-text-muted)]">ผู้มีสิทธิ์ตอบ</dt><dd className="mt-1 font-bold">{campaign.eligibleMemberCount ?? 'ยังไม่กำหนด'}</dd></div>
                  <div><dt className="text-xs font-semibold text-[var(--app-text-muted)]">เริ่ม</dt><dd className="mt-1">{formatDate(campaign.startsAt)}</dd></div>
                  <div><dt className="text-xs font-semibold text-[var(--app-text-muted)]">สิ้นสุด</dt><dd className="mt-1">{formatDate(campaign.endsAt)}</dd></div>
                  <div><dt className="text-xs font-semibold text-[var(--app-text-muted)]">Retention</dt><dd className="mt-1">{formatDate(campaign.retentionUntil)}</dd></div>
                </dl>

                {canManage && campaign.status === 'draft' ? (
                  <details className="mt-5 rounded-xl border border-[var(--app-border)]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold hover:bg-[var(--app-surface-subtle)]">แก้ไขแบบร่าง</summary>
                    <div className="border-t border-[var(--app-border)] p-4"><ResearchCampaignForm campaign={formCampaign} /></div>
                  </details>
                ) : (
                  <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--app-text-muted)]"><CalendarClock aria-hidden="true" className="mt-0.5 shrink-0" size={15} />รายละเอียดแบบสอบถามและนิยามคะแนนแก้ไขไม่ได้หลังเปิดรอบ</p>
                )}
              </article>
            );
          })}
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-10 text-center">
              <FlaskConical aria-hidden="true" className="mx-auto text-[var(--app-text-muted)]" size={30} />
              <p className="mt-3 font-semibold">ยังไม่มีรอบประเมิน</p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">Super Admin สามารถสร้างแบบร่างจากส่วนด้านบน</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
