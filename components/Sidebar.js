'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Bell,
  Bookmark,
  Bot,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  Flame,
  Home,
  MessageSquareText,
  Network,
  Trophy,
  UserRound,
} from 'lucide-react';

const SIDEBAR_STORAGE_KEY = 'ithub_sidebar_expanded';
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function SidebarItem({ href, icon: Icon, label, active, labelClass, tooltipClass }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`group/item relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
        active
          ? 'bg-red-50 text-red-700 dark:bg-red-950/35 dark:text-red-300'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
      }`}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className={`min-w-0 truncate ${labelClass}`}>{label}</span>
      <span aria-hidden="true" className={`pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100 group-focus-visible/item:opacity-100 dark:bg-white dark:text-zinc-950 ${tooltipClass}`}>
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');
  const currentCategory = searchParams.get('category');
  const [preference, setPreference] = useState(null);
  const [wideViewport, setWideViewport] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const media = window.matchMedia('(min-width: 1280px)');
    const updateViewport = () => setWideViewport(media.matches);
    const frame = window.requestAnimationFrame(() => {
      if (stored === 'true' || stored === 'false') setPreference(stored === 'true');
      updateViewport();
    });
    media.addEventListener('change', updateViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener('change', updateViewport);
    };
  }, []);

  const defaultResponsive = preference === null;
  const isExpanded = preference ?? wideViewport;
  const widthClass = defaultResponsive
    ? 'w-[72px] xl:w-[232px]'
    : isExpanded
      ? 'w-[232px]'
      : 'w-[72px]';
  const labelClass = defaultResponsive
    ? 'hidden xl:block'
    : isExpanded
      ? 'block'
      : 'hidden';
  const tooltipClass = defaultResponsive
    ? 'xl:hidden'
    : isExpanded
      ? 'hidden'
      : 'block';

  const toggleSidebar = () => {
    const next = !isExpanded;
    setPreference(next);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  };

  const mainMenus = [
    {
      label: 'หน้าแรก',
      href: '/',
      icon: Home,
      active: isHydrated && pathname === '/' && !currentSort && !currentCategory,
    },
    {
      label: 'มาแรง',
      href: { pathname: '/', query: { sort: 'likes' } },
      icon: Flame,
      active: isHydrated && pathname === '/' && currentSort === 'likes',
    },
    { label: 'อันดับสมาชิก', href: '/leaderboard', icon: Trophy, active: isHydrated && pathname === '/leaderboard' },
  ];

  const personalMenus = [
    { label: 'โปรไฟล์', href: '/profile', icon: UserRound, active: isHydrated && pathname === '/profile' },
    { label: 'บันทึกไว้', href: '/profile/saved', icon: Bookmark, active: isHydrated && pathname === '/profile/saved' },
    { label: 'การแจ้งเตือน', href: '/notifications', icon: Bell, active: isHydrated && pathname === '/notifications' },
  ];

  const categoryMenus = [
    { label: 'Hardware', value: 'Hardware', icon: Cpu },
    { label: 'Software', value: 'Software', icon: Code2 },
    { label: 'Network', value: 'Network', icon: Network },
    { label: 'AI & Data', value: 'AI & Data', icon: Bot },
    { label: 'General', value: 'General', icon: MessageSquareText },
  ];

  const sectionLabelClass = `px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500 ${labelClass}`;

  return (
    <aside
      data-testid="desktop-sidebar"
      className={`ithub-surface hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 md:flex ${widthClass}`}
    >
      <div className={`flex h-14 shrink-0 items-center border-b border-[var(--app-border)] px-3 ${defaultResponsive ? 'justify-center xl:justify-end' : isExpanded ? 'justify-end' : 'justify-center'}`}>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isExpanded ? 'ยุบเมนูด้านข้าง' : 'ขยายเมนูด้านข้าง'}
          aria-expanded={isExpanded}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <span className={defaultResponsive ? 'hidden xl:block' : isExpanded ? 'block' : 'hidden'}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></span>
          <span className={defaultResponsive ? 'block xl:hidden' : isExpanded ? 'hidden' : 'block'}><ChevronRight aria-hidden="true" className="h-5 w-5" /></span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav aria-label="เมนูหลัก" className="space-y-1">
          {mainMenus.map((item) => <SidebarItem key={item.label} {...item} labelClass={labelClass} tooltipClass={tooltipClass} />)}
        </nav>

        <hr className="mx-2 my-4 border-[var(--app-border)]" />
        <p className={sectionLabelClass}>พื้นที่ของฉัน</p>
        <nav aria-label="พื้นที่ส่วนตัว" data-tour="personal-nav" className="space-y-1">
          {personalMenus.map((item) => <SidebarItem key={item.label} {...item} labelClass={labelClass} tooltipClass={tooltipClass} />)}
        </nav>

        <hr className="mx-2 my-4 border-[var(--app-border)]" />
        <p className={sectionLabelClass}>หมวดหมู่</p>
        <nav aria-label="หมวดหมู่" className="space-y-1">
          {categoryMenus.map((item) => (
            <SidebarItem
              key={item.value}
              label={item.label}
              icon={item.icon}
              href={{ pathname: '/', query: { category: item.value } }}
              active={isHydrated && pathname === '/' && currentCategory === item.value}
              labelClass={labelClass}
              tooltipClass={tooltipClass}
            />
          ))}
        </nav>
      </div>

      <nav aria-label="ข้อมูลเว็บไซต์" className={`shrink-0 border-t border-[var(--app-border)] p-4 text-xs text-zinc-500 dark:text-zinc-400 ${labelClass}`}>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/terms" className="hover:text-red-600">ข้อกำหนด</Link>
          <Link href="/privacy" className="hover:text-red-600">ความเป็นส่วนตัว</Link>
          <Link href="/help" className="hover:text-red-600">ช่วยเหลือ</Link>
        </div>
      </nav>
    </aside>
  );
}
