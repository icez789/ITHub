'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bell, Flame, Home, Plus, UserRound } from 'lucide-react';

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function BottomNav() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');
  const currentCategory = searchParams.get('category');

  const menus = [
    { label: 'หน้าแรก', href: '/', icon: Home, active: isHydrated && pathname === '/' && !currentSort && !currentCategory },
    {
      label: 'มาแรง',
      href: { pathname: '/', query: { sort: 'likes' } },
      icon: Flame,
      active: isHydrated && pathname === '/' && currentSort === 'likes',
    },
    { label: 'สร้าง', href: '/create', icon: Plus, active: isHydrated && pathname === '/create', isPrimary: true },
    { label: 'แจ้งเตือน', href: '/notifications', icon: Bell, active: isHydrated && pathname === '/notifications' },
    { label: 'ฉัน', href: '/profile', icon: UserRound, active: isHydrated && pathname.startsWith('/profile') },
  ];

  return (
    <nav
      aria-label="เมนูมือถือ"
      className="ithub-surface fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-start border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {menus.map((item) => {
        const Icon = item.icon;
        if (item.isPrimary) {
          return (
            <Link key={item.label} href={item.href} data-tour="create-topic" aria-label={item.label} aria-current={item.active ? 'page' : undefined} className="relative flex h-16 flex-1 items-center justify-center">
              <span className="absolute -top-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20 ring-4 ring-[var(--app-background)]">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            data-tour={item.label === 'ฉัน' || item.label === 'แจ้งเตือน' ? 'personal-nav' : undefined}
            aria-current={item.active ? 'page' : undefined}
            className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${item.active ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200'}`}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
