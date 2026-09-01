'use client';

import { useState, useTransition } from 'react';
import { Lock, LoaderCircle, Pin, PinOff, Unlock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TopicModerationActions({ action, initialPinned, initialLocked }) {
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [pendingType, setPendingType] = useState(null);
  const [isPending, startTransition] = useTransition();

  function update(type, enabled) {
    if (isPending) return;
    setPendingType(type);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('type', type);
      formData.set('enabled', String(enabled));
      const result = await action(formData);
      if (result?.success) {
        if (type === 'pin') setIsPinned(enabled);
        else setIsLocked(enabled);
        toast.success(result.message);
      } else toast.error(result?.message || 'จัดการกระทู้ไม่สำเร็จ');
      setPendingType(null);
    });
  }

  const buttonClass = 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)] disabled:cursor-wait disabled:opacity-60';

  return <>
    <button type="button" disabled={isPending} onClick={() => update('pin', !isPinned)} className={buttonClass}>{pendingType === 'pin' ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : isPinned ? <PinOff aria-hidden="true" size={16} /> : <Pin aria-hidden="true" size={16} />}{isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}</button>
    <button type="button" disabled={isPending} onClick={() => update('lock', !isLocked)} className={buttonClass}>{pendingType === 'lock' ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : isLocked ? <Unlock aria-hidden="true" size={16} /> : <Lock aria-hidden="true" size={16} />}{isLocked ? 'ปลดล็อก' : 'ล็อก'}</button>
  </>;
}
