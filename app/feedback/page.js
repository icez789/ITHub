import { randomUUID } from 'node:crypto';

import { redirect } from 'next/navigation';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Info,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';

import {
  EvaluationWithdrawalForm,
  ResearchConsentCard,
  ResearchEvaluationForm,
  ResearchFeedbackForm,
} from '../../components/ResearchMemberForms';
import { getCurrentUser } from '../../lib/auth';
import { getMemberResearchOverview } from '../../lib/research';
import {
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_STATUS_LABELS,
  PILOT_QUESTIONNAIRE_VERSION,
} from '../../lib/researchQuestionnaire';
import { normalizeFeedbackRoute } from '../../lib/researchShared';

export const metadata = { title: 'แบบประเมินและ Feedback | ITHub' };

const feedbackCategoryLabels = Object.fromEntries(FEEDBACK_CATEGORY_OPTIONS);

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
}

function statusClass(status) {
  if (status === 'resolved') return 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300';
  if (status === 'declined' || status === 'withdrawn') return 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]';
  if (status === 'planned') return 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export default async function FeedbackPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=%2Ffeedback');

  const params = await searchParams;
  const requestedRoute = typeof params?.from === 'string' ? params.from : '/feedback';
  const routePath = normalizeFeedbackRoute(requestedRoute) ?? '/feedback';
  const overview = await getMemberResearchOverview();
  const evaluationsByCampaign = new Map(
    overview.evaluations.map((evaluation) => [evaluation.campaignId, evaluation]),
  );
  const openCampaignIds = new Set(overview.campaigns.map((campaign) => campaign.campaignId));
  const feedbackSubmissionId = randomUUID();

  return (
    <main className="ithub-page-container mx-auto max-w-5xl pb-24 pt-8 md:pb-12 md:pt-12">
      <header className="mb-8 border-b border-[var(--app-border)] pb-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[var(--app-primary-contrast)]">
            <MessageSquareText aria-hidden="true" size={23} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent-text)]">Pilot research</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--app-text)]">แบบประเมินและ Feedback</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-text-muted)]">
              แบบประเมินอย่างเป็นทางการ, ช่องแจ้งปัญหา และ Research Analytics เป็นคนละส่วน คุณเลือกทำแต่ละส่วนได้อย่างอิสระ
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="evaluation-heading">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]">
              <ClipboardCheck aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 id="evaluation-heading" className="text-xl font-bold text-[var(--app-text)]">1. แบบประเมินอย่างเป็นทางการ</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">ตอบได้หนึ่งครั้งต่อรอบ และถอนเพื่อล้างเนื้อหาคำตอบได้ แต่ยังไม่อนุญาตให้ส่งใหม่ในรอบเดิม</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <p className="flex items-start gap-2"><Info aria-hidden="true" className="mt-0.5 shrink-0" size={17} /><span>ข้อความ SUS เป็นฉบับนำร่อง ({PILOT_QUESTIONNAIRE_VERSION}) และต้องให้อาจารย์รับรองก่อนเก็บข้อมูลจริง</span></p>
          </div>

          {overview.campaigns.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-subtle)] p-6 text-center">
              <Clock3 aria-hidden="true" className="mx-auto text-[var(--app-text-muted)]" size={28} />
              <p className="mt-3 font-semibold text-[var(--app-text)]">ยังไม่มีรอบประเมินที่เปิดรับคำตอบ</p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">คุณยังส่ง Feedback ทั่วไปด้านล่างได้ตามปกติ</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {overview.campaigns.map((campaign) => {
                const existing = evaluationsByCampaign.get(campaign.campaignId);
                return (
                  <article key={campaign.campaignId} className="rounded-2xl border border-[var(--app-border)] p-4 sm:p-5">
                    <div className="mb-5 flex flex-col gap-2 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 id={`evaluation-${campaign.campaignId}-heading`} className="font-bold text-[var(--app-text)]">{campaign.name}</h3>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">ปิดรับคำตอบ {formatDate(campaign.endsAt)}</p>
                      </div>
                      <span className="w-fit rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300">เปิดรับคำตอบ</span>
                    </div>
                    {existing ? (
                      <div className="rounded-xl bg-[var(--app-surface-subtle)] p-4">
                        <p className="flex items-center gap-2 font-semibold text-[var(--app-text)]"><CheckCircle2 aria-hidden="true" size={17} className="text-[var(--app-success)]" />ระบบมีรายการของคุณสำหรับรอบนี้แล้ว</p>
                        <p className="mt-1 text-sm text-[var(--app-text-muted)]">สถานะ: {existing.status === 'withdrawn' ? 'ถอนแล้ว' : 'ส่งแล้ว'}</p>
                        {existing.status !== 'withdrawn' ? <EvaluationWithdrawalForm campaignId={campaign.campaignId} /> : null}
                      </div>
                    ) : (
                      <ResearchEvaluationForm campaign={campaign} clientSubmissionId={randomUUID()} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="general-feedback-heading">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]">
              <MessageSquareText aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 id="general-feedback-heading" className="text-xl font-bold text-[var(--app-text)]">2. แจ้งปัญหาหรือข้อเสนอแนะ</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">ใช้ช่องนี้สำหรับบัค ปัญหา UX/UI ข้อเสนอแนะฟีเจอร์ หรือเนื้อหา ไม่ใช่คำตอบแบบประเมิน SUS</p>
            </div>
          </div>
          <ResearchFeedbackForm
            key={feedbackSubmissionId}
            campaigns={overview.campaigns}
            clientSubmissionId={feedbackSubmissionId}
            routePath={routePath}
          />
        </section>

        <ResearchConsentCard consent={overview.consent} />

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="research-history-heading">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]">
              <ShieldCheck aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 id="research-history-heading" className="text-xl font-bold text-[var(--app-text)]">รายการของฉัน</h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">แสดงเฉพาะสถานะของบัญชีนี้ ไม่มีบันทึกภายในของผู้ดูแล</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">แบบประเมิน</h3>
              <div className="mt-3 space-y-3">
                {overview.evaluations.map((evaluation) => (
                  <article key={evaluation.evaluationId} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-[var(--app-text)]">{evaluation.campaignName}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(evaluation.status)}`}>{evaluation.status === 'withdrawn' ? 'ถอนแล้ว' : 'ส่งแล้ว'}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--app-text-muted)]">ส่งเมื่อ {formatDate(evaluation.submittedAt)}</p>
                    {evaluation.status !== 'withdrawn' && !openCampaignIds.has(evaluation.campaignId) ? <EvaluationWithdrawalForm campaignId={evaluation.campaignId} /> : null}
                  </article>
                ))}
                {overview.evaluations.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-text-muted)]">ยังไม่มีรายการแบบประเมิน</p> : null}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">Feedback</h3>
              <div className="mt-3 space-y-3">
                {overview.feedback.map((item) => (
                  <article key={item.feedbackId} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-[var(--app-text)]">{feedbackCategoryLabels[item.category] ?? item.category}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{FEEDBACK_STATUS_LABELS[item.status] ?? item.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--app-text-muted)]">ส่งเมื่อ {formatDate(item.createdAt)} · หน้า {item.routePath}</p>
                  </article>
                ))}
                {overview.feedback.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-text-muted)]">ยังไม่มี Feedback</p> : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4 text-sm leading-6 text-[var(--app-text-muted)]">
          <p className="flex items-start gap-2"><BarChart3 aria-hidden="true" className="mt-0.5 shrink-0" size={17} /><span>ข้อมูลรอบนี้เป็น pilot เท่านั้น ยังไม่ถือเป็นผลสรุปบทที่ 4–5 จนกว่าจะผ่าน decision gates และการตรวจรับเครื่องมือวิจัย</span></p>
        </aside>
      </div>
    </main>
  );
}
