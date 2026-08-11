'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function SidebarItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 p-3 rounded-lg transition-colors group/item ${
        active
          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          : 'hover:bg-gray-100 text-gray-600 dark:text-gray-400 dark:hover:bg-neutral-900 dark:hover:text-white'
      }`}
    >
      <span aria-hidden="true" className="flex-shrink-0 text-xl w-6 text-center">{icon}</span>
      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
        {label}
      </span>
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md shadow-lg opacity-0 -translate-x-3 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap dark:bg-white dark:text-black group-hover:hidden">
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

  const mainMenus = [
    {
      label: 'หน้าแรก',
      href: '/',
      icon: '🏠',
      active: isHydrated && pathname === '/' && !currentSort && !currentCategory,
    },
    {
      label: 'มาแรง',
      href: { pathname: '/', query: { sort: 'likes' } },
      icon: '🔥',
      active: isHydrated && pathname === '/' && currentSort === 'likes',
    },
    { label: 'จัดอันดับ', href: '/leaderboard', icon: '🏆', active: isHydrated && pathname === '/leaderboard' },
  ];

  const personalMenus = [
    { label: 'โปรไฟล์', href: '/profile', icon: '👤', active: isHydrated && pathname === '/profile' },
    { label: 'บันทึกไว้', href: '/profile/saved', icon: '🔖', active: isHydrated && pathname === '/profile/saved' },
    { label: 'การแจ้งเตือน', href: '/notifications', icon: '🔔', active: isHydrated && pathname === '/notifications' },
  ];

  const categoryMenus = [
    { label: 'Hardware', value: 'Hardware', icon: '💻' },
    { label: 'Software', value: 'Software', icon: '💾' },
    { label: 'Network', value: 'Network', icon: '🌐' },
    { label: 'AI & Data', value: 'AI & Data', icon: '🤖' },
    { label: 'General', value: 'General', icon: '📝' },
  ];

  return (
    <aside className="fixed top-0 left-0 z-40 h-full w-16 hover:w-64 bg-white border-r border-gray-200 text-gray-600 transition-all duration-300 ease-in-out shadow-2xl group hidden md:flex flex-col pt-24 dark:bg-black dark:border-neutral-800 dark:text-gray-400">
      <div className="absolute top-0 left-0 w-1 h-full bg-red-600 group-hover:opacity-0 transition-opacity duration-300" />
      <div className="flex-1 flex flex-col p-3 overflow-y-auto no-scrollbar">
        <nav aria-label="เมนูหลัก" className="space-y-1">
          {mainMenus.map((item) => <SidebarItem key={item.label} {...item} />)}
        </nav>

        <hr className="border-gray-200 my-4 dark:border-neutral-800 mx-2" />
        <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap dark:text-neutral-500">
          พื้นที่ของฉัน
        </p>
        <nav aria-label="พื้นที่ส่วนตัว" className="space-y-1">
          {personalMenus.map((item) => <SidebarItem key={item.label} {...item} />)}
        </nav>

        <hr className="border-gray-200 my-4 dark:border-neutral-800 mx-2" />
        <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap dark:text-neutral-500">
          หมวดหมู่
        </p>
        <nav aria-label="หมวดหมู่" className="space-y-1">
          {categoryMenus.map((item) => (
            <SidebarItem
              key={item.value}
              label={item.label}
              icon={item.icon}
              href={{ pathname: '/', query: { category: item.value } }}
              active={isHydrated && pathname === '/' && currentCategory === item.value}
            />
          ))}
        </nav>

        <nav aria-label="ข้อมูลเว็บไซต์" className="mt-auto pt-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 text-xs">
          <Link href="/terms" className="text-gray-400 hover:text-red-600">• ข้อกำหนด</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-red-600">• ความเป็นส่วนตัว</Link>
          <Link href="/help" className="text-gray-400 hover:text-red-600">• ช่วยเหลือ</Link>
        </nav>
      </div>
    </aside>
  );
}
