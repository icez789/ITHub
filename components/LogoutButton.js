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
      className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-600 px-2 sm:px-3 py-2 rounded-lg transition-all bg-white disabled:cursor-wait disabled:opacity-60 dark:bg-neutral-900 dark:text-gray-400 dark:border-neutral-700 dark:hover:text-red-500 dark:hover:border-red-500"
      title="ออกจากระบบ"
    >
      <span className="sm:hidden" aria-hidden="true">ออก</span>
      <span className="hidden sm:inline">{isPending ? 'กำลังออก...' : 'ออกจากระบบ'}</span>
    </button>
  );
}
