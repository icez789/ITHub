'use client';

import { logout } from '../lib/actions.js';
import { useTransition } from 'react';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      disabled={isPending}
      aria-label="ออกจากระบบ"
      className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-2 text-sm text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)] disabled:cursor-wait disabled:opacity-60 sm:px-3"
      title="ออกจากระบบ"
    >
      <span className="sm:hidden" aria-hidden="true">ออก</span>
      <span className="hidden sm:inline">{isPending ? 'กำลังออก...' : 'ออกจากระบบ'}</span>
    </button>
  );
}
