import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageSquareWarning, ShieldCheck } from 'lucide-react';

import { ResearchFeedbackTriageForm } from '../../../components/ResearchAdminForms';
import { getCurrentUser } from '../../../lib/auth';
import { getResearchFeedbackForAdmin } from '../../../lib/research';
import { FEEDBACK_CATEGORY_OPTIONS, FEEDBACK_STATUS_LABELS } from '../../../lib/researchQuestionnaire';
import { isAdminRole } from '../../../lib/roles';

export const metadata = { title: 'จัดการ Feedback | ITHub' };

const feedbackCategoryLabels = Object.fromEntries(FEEDBACK_CATEGORY_OPTIONS);
const priorityLabels = { low: 'ต่ำ', normal: 'ปกติ', high: 'สูง', urgent: 'เร่งด่วน' };

function formatDate(value) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
}

function statusClass(status) {
  if (status === 'resolved') return 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300';
  if (status === 'declined') return 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]';
  if (status === 'planned') return 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export default async function ResearchFeedbackAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login?next=%2Fadmin%2Ffeedback');
  if (!isAdminRole(currentUser.role)) redirect('/');

  const feedback = await getResearchFeedbackForAdmin({ limit: 50, offset: 0 });

  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
      <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-accent-text)]">
        <ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ
      </Link>
      <header className="mb-8 flex items-start gap-4 border-b border-[var(--app-border)] pb-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[var(--app-primary-contrast)]"><MessageSquareWarning aria-hidden="true" size={23} /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent-text)]">Admin and Super Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">จัดการ Feedback</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-text-muted)]">กำหนดสถานะ ความสำคัญ ประเด็น และบันทึกภายใน โดยไม่แสดงชื่อ อีเมล username หรือ user ID ของผู้ส่ง</p>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-[var(--app-text-muted)]"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={16} />รายการนี้เป็นข้อมูลอ่อนไหวสำหรับการ triage ห้ามคัดลอกข้อความดิบไปยัง Analytics หรือไฟล์วิจัย</p>
        <span className="text-sm font-semibold text-[var(--app-text-muted)]">แสดงล่าสุด {feedback.length} รายการ</span>
      </div>

      <section className="space-y-4" aria-label="รายการ Feedback สำหรับผู้ดูแล">
        {feedback.map((item) => (
          <article key={item.feedbackId} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">Feedback #{item.feedbackId}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{FEEDBACK_STATUS_LABELS[item.status] ?? item.status}</span>
                  <span className="rounded-full border border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text-muted)]">{priorityLabels[item.priority] ?? item.priority}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">{feedbackCategoryLabels[item.category] ?? item.category} · {item.routePath} · {formatDate(item.createdAt)}</p>
              </div>
              <span className="w-fit rounded-full bg-[var(--app-surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--app-text-muted)]">{item.dataScope}</span>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.details}</p>
              {item.rating != null ? <p className="mt-3 text-xs font-semibold text-[var(--app-text-muted)]">คะแนนความพึงพอใจ {item.rating} / 5</p> : null}
            </div>
            <ResearchFeedbackTriageForm feedback={item} />
          </article>
        ))}

        {feedback.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-10 text-center">
            <MessageSquareWarning aria-hidden="true" className="mx-auto text-[var(--app-text-muted)]" size={30} />
            <p className="mt-3 font-semibold">ยังไม่มี Feedback</p>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">รายการใหม่จากสมาชิกจะปรากฏที่นี่</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
