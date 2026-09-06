'use client';

import { BellRing, LoaderCircle, Save } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateNotificationPreferences } from '../lib/discoveryActions';

const options = [
  ['comments_enabled', 'ความคิดเห็นในกระทู้ของฉัน', 'แจ้งเมื่อมีสมาชิกแสดงความคิดเห็นใหม่'],
  ['likes_enabled', 'ถูกใจกระทู้ของฉัน', 'แจ้งเมื่อมีสมาชิกกดถูกใจกระทู้'],
  ['solutions_enabled', 'คำตอบของฉันถูกเลือก', 'แจ้งเมื่อเจ้าของกระทู้เลือกคำตอบของคุณ'],
  ['followed_categories_enabled', 'กระทู้ใหม่จากหมวดที่ติดตาม', 'ปิดไว้ตามค่าเริ่มต้นเพื่อไม่รบกวนคุณ'],
  ['followed_authors_enabled', 'กระทู้ใหม่จากผู้เขียนที่ติดตาม', 'ปิดไว้ตามค่าเริ่มต้นเพื่อไม่รบกวนคุณ'],
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending
        ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} />
        : <Save aria-hidden="true" size={16} />}
      {pending ? 'กำลังบันทึก' : 'บันทึกการตั้งค่า'}
    </button>
  );
}

export default function NotificationPreferencesForm({ preferences }) {
  const [state, action] = useActionState(updateNotificationPreferences, null);
  return (
    <section className="mb-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-6" aria-labelledby="notification-preferences-heading">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]">
          <BellRing aria-hidden="true" size={19} />
        </span>
        <div>
          <h2 id="notification-preferences-heading" className="text-lg font-bold text-[var(--app-text)]">ตั้งค่าการแจ้งเตือน</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">เลือกกิจกรรมที่ต้องการรับใน ITHub การตั้งค่านี้ไม่กระทบข้อความจากผู้ดูแล</p>
        </div>
      </div>

      <form action={action} className="space-y-3">
        {options.map(([name, title, description]) => (
          <label key={name} className="flex cursor-pointer flex-row-reverse items-start justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3.5 transition-colors hover:border-[var(--app-border-strong)] sm:flex-row">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--app-text)]">{title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-[var(--app-text-muted)]">{description}</span>
            </span>
            <input
              type="checkbox"
              name={name}
              defaultChecked={Boolean(preferences[name])}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--app-primary)]"
            />
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <SubmitButton />
          {state?.message ? (
            <p role={state.success ? 'status' : 'alert'} className={`text-sm font-medium ${state.success ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}`}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
