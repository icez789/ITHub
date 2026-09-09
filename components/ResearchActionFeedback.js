'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';

const offlineMessage = 'อุปกรณ์ออฟไลน์อยู่ ข้อมูลยังไม่ถูกส่ง โปรดเชื่อมต่ออินเทอร์เน็ตแล้วกดปุ่มเดิมอีกครั้ง';

export function useResearchActionForm(serverAction) {
  const [serverState, action, pending] = useActionState(serverAction, null);
  const [clientState, setClientState] = useState(null);
  const messageId = useId();

  const onSubmit = useCallback((event) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      event.preventDefault();
      setClientState({ success: false, code: 'offline', message: offlineMessage });
      return;
    }
    setClientState(null);
  }, []);

  return {
    state: clientState ?? serverState,
    action,
    pending,
    messageId,
    onSubmit,
  };
}

export function ResearchActionMessage({ id, state }) {
  const messageRef = useRef(null);
  const lastFocusedMessageRef = useRef('');

  useEffect(() => {
    if (!state?.message || state.success) return undefined;
    const messageKey = `${state.code ?? 'error'}:${state.message}`;
    if (lastFocusedMessageRef.current === messageKey) return undefined;
    lastFocusedMessageRef.current = messageKey;
    const frame = window.requestAnimationFrame(() => messageRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [state?.code, state?.message, state?.success]);

  const hasMessage = Boolean(state?.message);
  const isSuccess = Boolean(state?.success);
  return (
    <p
      ref={messageRef}
      id={id}
      role={hasMessage && !isSuccess ? 'alert' : 'status'}
      aria-live={hasMessage && !isSuccess ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={hasMessage && !isSuccess ? -1 : undefined}
      className={hasMessage
        ? `rounded-lg text-sm font-medium focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)] ${isSuccess ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}`
        : 'sr-only'}
    >
      {state?.message ?? ''}
    </p>
  );
}
