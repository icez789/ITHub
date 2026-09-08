'use client';

import { useActionState, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  MessageSquarePlus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import {
  grantResearchAnalyticsConsentAction,
  submitResearchEvaluationAction,
  submitResearchFeedbackAction,
  withdrawResearchAnalyticsConsentAction,
  withdrawResearchEvaluationAction,
} from '../lib/researchActions';
import {
  EXPERIENCE_LEVEL_OPTIONS,
  FEEDBACK_CATEGORY_OPTIONS,
  PILOT_ANALYTICS_NOTICE_VERSION,
  PRIMARY_DEVICE_OPTIONS,
  RESEARCH_TASKS,
  RESPONDENT_TYPE_OPTIONS,
  SUS_PILOT_ITEMS,
  SUS_SCALE,
  TASK_RESULT_OPTIONS,
} from '../lib/researchQuestionnaire';

const inputClass = 'min-h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]/25 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)] disabled:cursor-wait disabled:opacity-60';
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60';

function ActionMessage({ state }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.success ? 'status' : 'alert'}
      className={`text-sm font-medium ${state.success ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}`}
    >
      {state.message}
    </p>
  );
}

function SelectField({ id, name, label, options, required = true, defaultValue = '' }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[var(--app-text)]">{label}</span>
      <select id={id} name={name} required={required} defaultValue={defaultValue} className={inputClass}>
        <option value="">เลือกคำตอบ</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

export function ResearchEvaluationForm({ campaign, clientSubmissionId }) {
  const [state, action, pending] = useActionState(submitResearchEvaluationAction, null);
  const [taskResults, setTaskResults] = useState(() => RESEARCH_TASKS.map(() => ''));

  return (
    <form action={action} className="space-y-8" aria-labelledby={`evaluation-${campaign.campaignId}-heading`}>
      <input type="hidden" name="campaignId" value={campaign.campaignId} />
      <input type="hidden" name="clientSubmissionId" value={clientSubmissionId} />

      <fieldset>
        <legend className="text-base font-bold text-[var(--app-text)]">ข้อมูลกลุ่มตัวอย่าง</legend>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">เก็บเฉพาะข้อมูลขั้นต่ำ ไม่ขอชื่อ อีเมล หรือรหัสนักศึกษา</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SelectField id={`respondent-${campaign.campaignId}`} name="respondentType" label="ประเภทผู้ตอบ" options={RESPONDENT_TYPE_OPTIONS} />
          <SelectField id={`experience-${campaign.campaignId}`} name="experienceLevel" label="ประสบการณ์ใช้งาน" options={EXPERIENCE_LEVEL_OPTIONS} />
          <SelectField id={`device-${campaign.campaignId}`} name="primaryDevice" label="อุปกรณ์หลัก" options={PRIMARY_DEVICE_OPTIONS} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-bold text-[var(--app-text)]">System Usability Scale — 10 ข้อ</legend>
        <p id={`sus-help-${campaign.campaignId}`} className="mt-1 text-sm text-[var(--app-text-muted)]">
          เลือก 1–5 ทุกข้อ ข้อความนี้เป็นฉบับนำร่องและต้องผ่านการรับรองก่อนเก็บข้อมูลจริง
        </p>
        <div className="mt-4 space-y-4" aria-describedby={`sus-help-${campaign.campaignId}`}>
          {SUS_PILOT_ITEMS.map((question, questionIndex) => (
            <fieldset key={question} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
              <legend className="px-1 text-sm font-semibold leading-6 text-[var(--app-text)]">
                {questionIndex + 1}. {question}
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
                {SUS_SCALE.map(([score, label]) => {
                  const id = `sus-${campaign.campaignId}-${questionIndex + 1}-${score}`;
                  return (
                    <label key={score} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-border-strong)]">
                      <input id={id} type="radio" name={`sus_${questionIndex + 1}`} value={score} required className="h-4 w-4 shrink-0 accent-[var(--app-primary)]" />
                      <span><strong className="text-[var(--app-text)]">{score}</strong> {label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-bold text-[var(--app-text)]">ผลจากงานทดลอง 5 งาน</legend>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">รายงานสิ่งที่คุณทำได้จริง คะแนนความยาก 1 คือง่าย และ 5 คือยาก</p>
        <div className="mt-4 space-y-4">
          {RESEARCH_TASKS.map((task, taskIndex) => {
            const result = taskResults[taskIndex];
            const notAttempted = result === 'not_attempted';
            return (
              <fieldset key={task} className="rounded-xl border border-[var(--app-border)] p-4">
                <legend className="px-1 text-sm font-semibold leading-6 text-[var(--app-text)]">
                  งานที่ {taskIndex + 1}: {task}
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label htmlFor={`task-result-${campaign.campaignId}-${taskIndex + 1}`}>
                    <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ผลลัพธ์</span>
                    <select
                      id={`task-result-${campaign.campaignId}-${taskIndex + 1}`}
                      name={`task_${taskIndex + 1}_result`}
                      required
                      value={result}
                      onChange={(event) => setTaskResults((current) => current.map((value, index) => (
                        index === taskIndex ? event.target.value : value
                      )))}
                      className={inputClass}
                    >
                      <option value="">เลือกผลลัพธ์</option>
                      {TASK_RESULT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label htmlFor={`task-difficulty-${campaign.campaignId}-${taskIndex + 1}`}>
                    <span className="mb-1.5 block text-xs font-semibold text-[var(--app-text-muted)]">ความยาก</span>
                    <select
                      id={`task-difficulty-${campaign.campaignId}-${taskIndex + 1}`}
                      name={`task_${taskIndex + 1}_difficulty`}
                      required={Boolean(result) && !notAttempted}
                      disabled={!result || notAttempted}
                      defaultValue=""
                      className={inputClass}
                    >
                      <option value="">{notAttempted ? 'ไม่ประเมิน' : 'เลือก 1–5'}</option>
                      {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>
      </fieldset>

      <label htmlFor={`evaluation-open-${campaign.campaignId}`} className="block">
        <span className="mb-1.5 block text-base font-bold text-[var(--app-text)]">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)</span>
        <span className="mb-2 block text-sm text-[var(--app-text-muted)]">ไม่ควรใส่ชื่อ อีเมล รหัสนักศึกษา หรือข้อมูลส่วนตัว</span>
        <textarea id={`evaluation-open-${campaign.campaignId}`} name="openFeedback" maxLength={2000} rows={4} className={inputClass} />
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
        <input type="checkbox" name="evaluationConsent" value="accepted" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--app-primary)]" />
        <span className="text-sm leading-6 text-[var(--app-text)]">
          ฉันเข้าใจว่าการเข้าร่วมเป็นความสมัครใจ คำตอบใช้เพื่อการประเมินโครงการ และฉันถอนเพื่อล้างเนื้อหาคำตอบได้ตามประกาศเวอร์ชัน <code>{campaign.consentNoticeVersion}</code>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--app-border)] pt-5">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <ClipboardCheck aria-hidden="true" size={17} />}
          {pending ? 'กำลังส่งแบบประเมิน' : 'ส่งแบบประเมินหนึ่งครั้ง'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ResearchFeedbackForm({ campaigns, clientSubmissionId, routePath }) {
  const [state, action, pending] = useActionState(submitResearchFeedbackAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="clientSubmissionId" value={clientSubmissionId} readOnly />
      <input type="hidden" name="route" value={routePath} readOnly />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="feedback-category" name="category" label="ประเภท Feedback" options={FEEDBACK_CATEGORY_OPTIONS} />
        <label htmlFor="feedback-rating" className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[var(--app-text)]">ความพึงพอใจ (ไม่บังคับ)</span>
          <select id="feedback-rating" name="rating" defaultValue="" className={inputClass}>
            <option value="">ไม่ระบุคะแนน</option>
            {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} / 5</option>)}
          </select>
        </label>
      </div>

      <label htmlFor="feedback-campaign" className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[var(--app-text)]">รอบประเมินที่เกี่ยวข้อง (ไม่บังคับ)</span>
        <select id="feedback-campaign" name="campaignId" defaultValue="" className={inputClass}>
          <option value="">Feedback ทั่วไป</option>
          {campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>)}
        </select>
      </label>

      <label htmlFor="feedback-details" className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[var(--app-text)]">รายละเอียด</span>
        <span id="feedback-details-help" className="mb-2 block text-sm text-[var(--app-text-muted)]">10–2,000 ตัวอักษร และไม่ควรใส่ข้อมูลส่วนตัว</span>
        <textarea id="feedback-details" name="details" required minLength={10} maxLength={2000} rows={5} aria-describedby="feedback-details-help" className={inputClass} />
      </label>

      <p className="text-xs text-[var(--app-text-muted)]">หน้าที่แนบ: <code>{routePath}</code> ระบบจะตัด query string และ hash ออกก่อนบันทึก</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <MessageSquarePlus aria-hidden="true" size={17} />}
          {pending ? 'กำลังส่ง Feedback' : 'ส่ง Feedback'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function GrantConsentForm() {
  const [state, action, pending] = useActionState(grantResearchAnalyticsConsentAction, null);
  return (
    <form action={action} className="mt-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
        <input type="checkbox" name="acknowledged" value="accepted" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--app-primary)]" />
        <span className="text-sm leading-6 text-[var(--app-text)]">
          ฉันยินยอมให้เก็บเฉพาะเหตุการณ์ใน allowlist แบบนามแฝงเพื่อวิเคราะห์การใช้งาน โดยไม่เก็บข้อความค้นหา เนื้อหา อีเมล ชื่อผู้ใช้ IP หรือ User-Agent เต็ม ({PILOT_ANALYTICS_NOTICE_VERSION})
        </span>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <ShieldCheck aria-hidden="true" size={17} />}
          {pending ? 'กำลังบันทึก' : 'ยินยอม Research Analytics'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function WithdrawConsentForm() {
  const [state, action, pending] = useActionState(withdrawResearchAnalyticsConsentAction, null);
  return (
    <form action={action} className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <Trash2 aria-hidden="true" size={17} />}
          {pending ? 'กำลังถอนความยินยอม' : 'ถอนความยินยอมและลบ Raw Analytics'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ResearchConsentCard({ consent }) {
  const active = consent?.status === 'active';
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="research-consent-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]">
          <BarChart3 aria-hidden="true" size={19} />
        </span>
        <div>
          <h2 id="research-consent-heading" className="text-lg font-bold text-[var(--app-text)]">Research Analytics แบบสมัครใจ</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            แยกจากแบบประเมินและ Feedback คุณยังส่งสองรายการนั้นได้แม้ไม่ยินยอม Analytics
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
        {active ? <CheckCircle2 aria-hidden="true" size={17} className="text-[var(--app-success)]" /> : <ShieldCheck aria-hidden="true" size={17} className="text-[var(--app-text-muted)]" />}
        <span className={active ? 'text-[var(--app-success)]' : 'text-[var(--app-text-muted)]'}>
          {active ? 'ยินยอมอยู่' : 'ยังไม่ยินยอม'}
        </span>
      </div>
      {active ? <WithdrawConsentForm /> : <GrantConsentForm />}
    </section>
  );
}

export function EvaluationWithdrawalForm({ campaignId }) {
  const [state, action, pending] = useActionState(withdrawResearchEvaluationAction, null);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
          {pending ? 'กำลังถอนคำตอบ' : 'ถอนและล้างเนื้อหาคำตอบ'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
