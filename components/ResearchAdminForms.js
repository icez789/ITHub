'use client';
import { ArrowRight, LoaderCircle, Save, Send, Settings2 } from 'lucide-react';

import {
  createResearchCampaignAction,
  transitionResearchCampaignAction,
  triageResearchFeedbackAction,
  updateResearchCampaignAction,
} from '../lib/researchActions';
import {
  PILOT_EVALUATION_NOTICE_VERSION,
  PILOT_QUESTIONNAIRE_VERSION,
} from '../lib/researchQuestionnaire';
import {
  ResearchActionMessage,
  useResearchActionForm,
} from './ResearchActionFeedback';

const inputClass = 'min-h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]/25 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)] disabled:cursor-wait disabled:opacity-60';

const statusOptions = [
  ['new', 'ใหม่'],
  ['reviewing', 'กำลังตรวจสอบ'],
  ['planned', 'วางแผนแก้'],
  ['resolved', 'แก้แล้ว'],
  ['declined', 'ไม่ดำเนินการ'],
];

const priorityOptions = [
  ['low', 'ต่ำ'],
  ['normal', 'ปกติ'],
  ['high', 'สูง'],
  ['urgent', 'เร่งด่วน'],
];

const themeOptions = [
  ['navigation', 'การนำทาง'],
  ['search', 'การค้นหา'],
  ['content_creation', 'การสร้างเนื้อหา'],
  ['engagement', 'การมีส่วนร่วม'],
  ['personalization', 'เนื้อหาเฉพาะบุคคล'],
  ['performance', 'ประสิทธิภาพ'],
  ['accessibility', 'การช่วยการเข้าถึง'],
  ['other', 'อื่น ๆ'],
];

function Field({ id, name, label, type = 'text', defaultValue = '', required = false, min, max, placeholder }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">{label}</span>
      <input id={id} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} min={min} max={max} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

export function ResearchCampaignForm({ campaign = null }) {
  const isUpdate = Boolean(campaign);
  const serverAction = isUpdate ? updateResearchCampaignAction : createResearchCampaignAction;
  const { state, action, pending, messageId, onSubmit } = useResearchActionForm(serverAction);
  const prefix = isUpdate ? `campaign-${campaign.campaignId}` : 'campaign-new';

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4" aria-label={isUpdate ? `แก้ไขรอบประเมิน ${campaign.name}` : 'สร้างรอบประเมิน'} aria-describedby={messageId} aria-busy={pending}>
      {isUpdate ? <input type="hidden" name="campaignId" value={campaign.campaignId} readOnly /> : null}
      <input type="hidden" name="dataScope" value="pilot" readOnly />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-slug`} name="slug" label="Slug" defaultValue={campaign?.slug} required placeholder="pilot-2569" />
        <Field id={`${prefix}-name`} name="name" label="ชื่อรอบประเมิน" defaultValue={campaign?.name} required />
        <Field id={`${prefix}-questionnaire`} name="questionnaireVersion" label="Questionnaire version" defaultValue={campaign?.questionnaireVersion ?? PILOT_QUESTIONNAIRE_VERSION} required />
        <Field id={`${prefix}-notice`} name="consentNoticeVersion" label="Consent notice version" defaultValue={campaign?.consentNoticeVersion ?? PILOT_EVALUATION_NOTICE_VERSION} required />
        <Field id={`${prefix}-eligible`} name="eligibleMemberCount" label="จำนวนสมาชิกที่มีสิทธิ์ตอบ (snapshot)" type="number" min="0" defaultValue={campaign?.eligibleMemberCount} />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--app-text)]">ช่วงเวลาแบบ UTC</legend>
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">ต้องกรอกครบและวันลบต้องไม่เกินหนึ่งปีหลังวันสิ้นสุด จึงจะเปิดรอบได้</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field id={`${prefix}-starts`} name="startsAt" label="เริ่มรับคำตอบ (UTC)" type="datetime-local" defaultValue={campaign?.startsAtInput} />
          <Field id={`${prefix}-ends`} name="endsAt" label="สิ้นสุดรับคำตอบ (UTC)" type="datetime-local" defaultValue={campaign?.endsAtInput} />
          <Field id={`${prefix}-retention`} name="retentionUntil" label="ลบคำตอบภายใน (UTC)" type="datetime-local" defaultValue={campaign?.retentionUntilInput} />
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <Save aria-hidden="true" size={16} />}
          {pending ? 'กำลังบันทึก' : isUpdate ? 'บันทึกแบบร่าง' : 'สร้างแบบร่าง'}
        </button>
        <ResearchActionMessage id={messageId} state={state} />
      </div>
    </form>
  );
}

export function ResearchCampaignTransitionForm({ campaignId, nextStatus, label }) {
  const { state, action, pending, messageId, onSubmit } = useResearchActionForm(transitionResearchCampaignAction);
  return (
    <form action={action} onSubmit={onSubmit} aria-label={`${label}รอบประเมิน`} aria-describedby={messageId} aria-busy={pending}>
      <input type="hidden" name="campaignId" value={campaignId} readOnly />
      <input type="hidden" name="nextStatus" value={nextStatus} readOnly />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}
          {pending ? 'กำลังเปลี่ยนสถานะ' : label}
        </button>
        <ResearchActionMessage id={messageId} state={state} />
      </div>
    </form>
  );
}

export function ResearchFeedbackTriageForm({ feedback }) {
  const { state, action, pending, messageId, onSubmit } = useResearchActionForm(triageResearchFeedbackAction);
  const terminal = feedback.status === 'resolved' || feedback.status === 'declined';
  const allowedStatuses = terminal
    ? statusOptions.filter(([value]) => value === feedback.status)
    : statusOptions.filter(([value]) => value !== 'new' || feedback.status === 'new');

  return (
    <form action={action} onSubmit={onSubmit} className="mt-5 space-y-4 border-t border-[var(--app-border)] pt-5" aria-label={`จัดการ Feedback ${feedback.feedbackId}`} aria-describedby={messageId} aria-busy={pending}>
      <input type="hidden" name="feedbackId" value={feedback.feedbackId} readOnly />
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]"><Settings2 aria-hidden="true" size={16} /> การจัดการภายใน</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label htmlFor={`feedback-${feedback.feedbackId}-status`}>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">สถานะ</span>
            <select id={`feedback-${feedback.feedbackId}-status`} name="status" defaultValue={feedback.status} className={inputClass}>
              {allowedStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor={`feedback-${feedback.feedbackId}-priority`}>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ความสำคัญ</span>
            <select id={`feedback-${feedback.feedbackId}-priority`} name="priority" defaultValue={feedback.priority} className={inputClass}>
              {priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor={`feedback-${feedback.feedbackId}-theme`}>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ประเด็น</span>
            <select id={`feedback-${feedback.feedbackId}-theme`} name="issueTheme" defaultValue={feedback.issueTheme ?? ''} className={inputClass}>
              <option value="">ยังไม่จัดหมวด</option>
              {themeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      <label htmlFor={`feedback-${feedback.feedbackId}-note`} className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">บันทึกภายใน — สมาชิกจะไม่เห็น</span>
        <textarea id={`feedback-${feedback.feedbackId}-note`} name="internalNote" defaultValue={feedback.internalNote ?? ''} maxLength={2000} rows={3} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <Send aria-hidden="true" size={16} />}
          {pending ? 'กำลังอัปเดต' : terminal ? 'บันทึกข้อมูลภายใน' : 'อัปเดต Feedback'}
        </button>
        <ResearchActionMessage id={messageId} state={state} />
      </div>
    </form>
  );
}
