'use client';

import { useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Editor from './Editor';

export default function CommentComposer({ action, parentId = null, compact = false, onSuccess }) {
  const router = useRouter();
  const [editorKey, setEditorKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const result = await action(new FormData(event.currentTarget));
      if (!result?.success) {
        setError(result?.message || 'ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      setEditorKey((key) => key + 1);
      onSuccess?.();
      router.refresh();
    } catch (submitError) {
      console.error('Comment submission failed:', submitError);
      setError('ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className={compact ? 'flex flex-col gap-2 sm:flex-row sm:items-start' : ''}>
    <div className={`overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] ${compact ? 'min-w-0 flex-1' : 'mb-4'}`} aria-busy={pending}>
      <Editor key={editorKey} className={compact ? 'h-24 bg-[var(--app-surface)] text-[var(--app-text)]' : 'mb-12 h-32 bg-[var(--app-surface)] text-[var(--app-text)]'} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
    </div>
    <div className={compact ? 'sm:pt-1' : ''}>
      {error ? <p role="alert" className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-5 py-2.5 font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <Send aria-hidden="true" size={17} />}{pending ? 'กำลังส่ง…' : compact ? 'ส่งคำตอบ' : 'ส่งความคิดเห็น'}
      </button>
    </div>
  </form>;
}
