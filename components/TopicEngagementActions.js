'use client';

import { useActionState } from 'react';

function ActionMessage({ state }) {
  if (!state?.message) return null;

  return (
    <span
      role={state.success ? 'status' : 'alert'}
      className={`basis-full text-sm ${state.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
    >
      {state.message}
    </span>
  );
}

export default function TopicEngagementActions({
  isAuthenticated,
  isLiked,
  isBookmarked,
  likeCount,
  likeAction,
  bookmarkAction,
}) {
  const [likeState, submitLike, likePending] = useActionState(likeAction, null);
  const [bookmarkState, submitBookmark, bookmarkPending] = useActionState(bookmarkAction, null);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-4" data-tour="engagement-actions">
      <form action={submitLike}>
        <button
          type="submit"
          disabled={!isAuthenticated || likePending}
          aria-pressed={isLiked}
          aria-label={isLiked ? `ยกเลิกถูกใจ กระทู้นี้มี ${likeCount} ถูกใจ` : `ถูกใจกระทู้ กระทู้นี้มี ${likeCount} ถูกใจ`}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-sm border ${isLiked ? 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700 dark:hover:bg-neutral-700'} ${!isAuthenticated || likePending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
        >
          <span className="text-2xl" aria-hidden="true">{likePending ? '⏳' : isLiked ? '❤️' : '🤍'}</span>
          <span>{likePending ? 'กำลังบันทึก...' : isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
          <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm ml-1 border border-black/5 dark:bg-black/30 dark:border-white/10">{likeCount}</span>
        </button>
      </form>

      <form action={submitBookmark}>
        <button
          type="submit"
          disabled={!isAuthenticated || bookmarkPending}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'นำกระทู้ออกจากรายการที่บันทึก' : 'บันทึกกระทู้ไว้อ่านทีหลัง'}
          className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold transition-all shadow-sm border ${isBookmarked ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700 dark:hover:bg-neutral-700'} ${!isAuthenticated || bookmarkPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          title="บันทึกไว้อ่านทีหลัง"
        >
          <span className="text-2xl" aria-hidden="true">{bookmarkPending ? '⏳' : isBookmarked ? '🔖' : '🏷️'}</span>
          <span className="hidden sm:inline">{bookmarkPending ? 'กำลังบันทึก...' : isBookmarked ? 'บันทึกแล้ว' : 'บันทึก'}</span>
        </button>
      </form>

      {!isAuthenticated && <span className="text-sm text-gray-400">(เข้าสู่ระบบเพื่อใช้งาน)</span>}
      <ActionMessage state={likeState?.success === false ? likeState : null} />
      <ActionMessage state={bookmarkState?.success === false ? bookmarkState : null} />
    </div>
  );
}
