'use client';

import Link from 'next/link';
import { LoaderCircle, LogIn, UserCheck, UserPlus } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { setAuthorFollow, setCategoryFollow } from '../lib/discoveryActions';

export default function FollowButton({
  kind,
  target,
  label,
  initialFollowing = false,
  isAuthenticated = false,
  loginHref = '/login',
  tone = 'default',
  compact = false,
}) {
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const inverse = tone === 'inverse';
  const sizeClass = compact ? 'min-h-9 px-3 py-1.5 text-xs' : 'min-h-10 px-3.5 py-2 text-sm';
  const colorClass = inverse
    ? 'border-white/70 bg-black/15 text-white hover:bg-white/15'
    : following
      ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]'
      : 'border-[var(--app-text-muted)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)]';

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors ${sizeClass} ${colorClass}`}
      >
        <LogIn aria-hidden="true" size={compact ? 15 : 17} />
        เข้าสู่ระบบเพื่อติดตาม
      </Link>
    );
  }

  const changeFollow = () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setMessage('');
    setIsError(false);
    const next = !following;
    startTransition(async () => {
      try {
        const result = kind === 'category'
          ? await setCategoryFollow(target, next)
          : await setAuthorFollow(target, next);
        if (result?.success) setFollowing(Boolean(result.following));
        setIsError(!result?.success);
        setMessage(result?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
      } catch {
        setIsError(true);
        setMessage('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        pendingRef.current = false;
      }
    });
  };

  const Icon = following ? UserCheck : UserPlus;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={changeFollow}
        disabled={isPending}
        aria-pressed={following}
        aria-label={`${following ? 'เลิกติดตาม' : 'ติดตาม'}${label ? ` ${label}` : ''}`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors disabled:cursor-wait disabled:opacity-65 ${sizeClass} ${colorClass}`}
      >
        {isPending
          ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={compact ? 15 : 17} />
          : <Icon aria-hidden="true" size={compact ? 15 : 17} />}
        {isPending ? 'กำลังบันทึก' : following ? 'ติดตามอยู่' : 'ติดตาม'}
      </button>
      {isPending ? <span role="status" className="sr-only">กำลังบันทึกการติดตาม</span> : null}
      {message ? <span role={isError ? 'alert' : 'status'} className={`max-w-56 text-xs ${inverse ? 'text-white/75' : 'text-[var(--app-text-muted)]'}`}>{message}</span> : null}
    </span>
  );
}
