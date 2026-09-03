import Link from 'next/link';
import Image from 'next/image';
import { Plus, ShieldCheck } from 'lucide-react';
import db from '../lib/db';
import { getCurrentUser } from '../lib/auth';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import SearchInput from './SearchInput';
import LogoutButton from './LogoutButton';
import { isContentModeratorRole } from '../lib/roles';

export default async function Navbar() {
  const user = await getCurrentUser();
  let notifications = [];
  let unreadCount = 0;

  if (user) {
    try {
      const [notisResult, countResult] = await Promise.all([
        db.query(
          'SELECT id, topic_id, message, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
          [user.id],
        ),
        db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]),
      ]);
      notifications = notisResult[0] || [];
      unreadCount = countResult[0][0]?.count || 0;
    } catch (error) {
      console.error('Navbar notification error:', error);
    }
  }

  return (
    <header className="ithub-surface z-50 shrink-0 border-b px-3 py-2.5 shadow-[0_1px_0_rgba(24,24,27,0.03)] sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center gap-3 lg:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ITHub หน้าแรก">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-base font-bold text-white shadow-sm">
            IT
          </span>
          <span className="hidden text-xl font-bold tracking-tight text-[var(--app-text)] sm:block">
            IT<span className="text-red-600 dark:text-red-400">Hub</span>
          </span>
        </Link>

        <SearchInput className="hidden min-w-0 flex-1 md:block md:max-w-2xl" />

        <nav aria-label="บัญชีผู้ใช้" data-tour="account-area" className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          {user ? (
            <>
              <NotificationBell
                count={unreadCount}
                notifications={notifications}
                currentUserId={user.id}
              />

              {isContentModeratorRole(user.role) && (
                <Link
                  href="/admin"
                  className="hidden items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)] lg:flex"
                >
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  {user.role === 'teacher' ? 'ศูนย์ดูแลเนื้อหา' : 'ผู้ดูแล'}
                </Link>
              )}

              <Link
                href="/create"
                data-tour="create-topic"
                data-tour-session="member"
                className="flex items-center gap-2 rounded-xl bg-[var(--app-primary)] px-3 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] shadow-sm transition-colors hover:bg-[var(--app-primary-hover)] sm:px-4"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">สร้างกระทู้</span>
              </Link>

              <Link href="/profile" data-tour="personal-nav" className="hidden items-center gap-3 rounded-xl px-1.5 py-1 transition-colors hover:bg-[var(--app-surface-subtle)] sm:flex">
                <span className="hidden text-right lg:block">
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">บัญชีของฉัน</span>
                  <span className="block max-w-28 truncate text-sm font-semibold text-[var(--app-text)]">{user.username}</span>
                </span>
                <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-zinc-100 dark:bg-zinc-800">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={`รูปโปรไฟล์ของ ${user.username}`} fill sizes="36px" className="object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </span>
              </Link>

              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/register" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)] sm:inline-flex">
                สมัครสมาชิก
              </Link>
              <Link href="/login" data-tour="auth-action" className="whitespace-nowrap rounded-xl bg-[var(--app-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--app-primary-contrast)] shadow-sm transition-colors hover:bg-[var(--app-primary-hover)] sm:px-4">
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </nav>

        <SearchInput className="order-last block w-full md:hidden" />
      </div>
    </header>
  );
}
