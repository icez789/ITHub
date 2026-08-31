'use client';

import Link from 'next/link';
import { Bookmark, Heart, LoaderCircle, LogIn } from 'lucide-react';
import { useActionState } from 'react';

function ActionMessage({ state }) {
  if (!state?.message) return null;
  return (
    <span role={state.success ? 'status' : 'alert'} className={`basis-full text-sm ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {state.message}
    </span>
  );
}

export default function TopicEngagementActions({ topicId, isAuthenticated, isLiked, isBookmarked, likeCount, likeAction, bookmarkAction }) {
  const [likeState, submitLike, likePending] = useActionState(likeAction, null);
  const [bookmarkState, submitBookmark, bookmarkPending] = useActionState(bookmarkAction, null);

  if (!isAuthenticated) {
    return (
      <div data-tour="engagement-actions" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
        <div>
          <p className="font-semibold text-[var(--app-text)]">อยากมีส่วนร่วมกับกระทู้นี้?</p>
          <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">เข้าสู่ระบบเพื่อกดถูกใจหรือบันทึกไว้อ่านภายหลัง</p>
        </div>
        <Link href={`/login?next=/topic/${topicId}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--app-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
          <LogIn aria-hidden="true" size={17} /> เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div data-tour="engagement-actions" className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--app-border)] pt-5">
      <form action={submitLike}>
        <button type="submit" disabled={likePending} aria-pressed={isLiked} aria-label={isLiked ? `ยกเลิกถูกใจ กระทู้นี้มี ${likeCount} ถูกใจ` : `ถูกใจกระทู้ กระทู้นี้มี ${likeCount} ถูกใจ`} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${isLiked ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:border-red-300 hover:text-red-600'}`}>
          {likePending ? <LoaderCircle className="animate-spin" aria-hidden="true" size={17} /> : <Heart aria-hidden="true" fill={isLiked ? 'currentColor' : 'none'} size={17} />}
          <span>{likePending ? 'กำลังบันทึก...' : isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
          <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">{likeCount}</span>
        </button>
      </form>
      <form action={submitBookmark}>
        <button type="submit" disabled={bookmarkPending} aria-pressed={isBookmarked} aria-label={isBookmarked ? 'นำกระทู้ออกจากรายการที่บันทึก' : 'บันทึกกระทู้ไว้อ่านทีหลัง'} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${isBookmarked ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:border-blue-300 hover:text-blue-600'}`}>
          {bookmarkPending ? <LoaderCircle className="animate-spin" aria-hidden="true" size={17} /> : <Bookmark aria-hidden="true" fill={isBookmarked ? 'currentColor' : 'none'} size={17} />}
          <span>{bookmarkPending ? 'กำลังบันทึก...' : isBookmarked ? 'บันทึกแล้ว' : 'บันทึก'}</span>
        </button>
      </form>
      <ActionMessage state={likeState?.success === false ? likeState : null} />
      <ActionMessage state={bookmarkState?.success === false ? bookmarkState : null} />
    </div>
  );
}
