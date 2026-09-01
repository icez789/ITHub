'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'ยืนยันการลบ',
  pendingLabel = 'กำลังลบ…',
  successMessage,
  onConfirm,
  triggerAriaLabel,
  triggerClassName = '',
  triggerDisabled = false,
  testId = 'confirm-delete-dialog',
}) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const previousOverflowRef = useRef('');
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, []);

  function openDialog() {
    if (triggerDisabled) return;
    setError('');
    previousOverflowRef.current = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeDialog() {
    if (pending) return;
    dialogRef.current?.close();
  }

  function handleClose() {
    document.body.style.overflow = previousOverflowRef.current;
    triggerRef.current?.focus();
  }

  function handleCancel(event) {
    if (pending) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    closeDialog();
  }

  function handleBackdrop(event) {
    if (event.target === dialogRef.current) closeDialog();
  }

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const result = await onConfirm();
      if (result?.success === false) {
        setError(result.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      if (successMessage || result?.message) toast.success(result?.message || successMessage);
      dialogRef.current?.close();
    } catch (confirmError) {
      console.error('Destructive action failed:', confirmError);
      setError('ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerAriaLabel}
        disabled={triggerDisabled}
        className={triggerClassName}
        onClick={openDialog}
      >
        {trigger}
      </button>

      <dialog
        ref={dialogRef}
        data-testid={testId}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
        aria-busy={pending}
        data-pending={pending ? 'true' : 'false'}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-red-200 bg-[var(--app-surface)] p-0 text-[var(--app-text)] shadow-2xl backdrop:bg-zinc-950/65 backdrop:backdrop-blur-sm dark:border-red-900/70"
        onCancel={handleCancel}
        onClose={handleClose}
        onClick={handleBackdrop}
      >
        <section className="relative p-6 sm:p-7" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            aria-label="ปิดหน้าต่างยืนยัน"
            disabled={pending}
            onClick={closeDialog}
            className="absolute right-4 top-4 rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X aria-hidden="true" size={18} />
          </button>

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle aria-hidden="true" size={24} />
          </div>
          <h2 id={titleId} className="pr-10 text-xl font-bold">{title}</h2>
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{description}</p>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <span className="sr-only" role="status" aria-live="polite">
            {pending ? pendingLabel : ''}
          </span>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={closeDialog}
              className="min-h-11 rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--app-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              data-testid="confirm-delete-submit"
              disabled={pending}
              onClick={handleConfirm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:bg-red-400"
            >
              {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : null}
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </section>
      </dialog>
    </>
  );
}
