'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');

  const menus = [
    { label: 'หน้าแรก', href: '/', icon: '🏠', active: pathname === '/' && !currentSort },
    {
      label: 'มาแรง',
      href: { pathname: '/', query: { sort: 'likes' } },
      icon: '🔥',
      active: pathname === '/' && currentSort === 'likes',
    },
    { label: 'สร้าง', href: '/create', icon: '➕', active: pathname === '/create', isSpecial: true },
    { label: 'แจ้งเตือน', href: '/notifications', icon: '🔔', active: pathname === '/notifications' },
    { label: 'ฉัน', href: '/profile', icon: '👤', active: pathname.startsWith('/profile') },
  ];

  return (
    <nav aria-label="เมนูมือถือ" className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center md:hidden dark:bg-black dark:border-neutral-800">
      {menus.map((item) => item.isSpecial ? (
        <Link key={item.label} href={item.href} aria-label={item.label} aria-current={item.active ? 'page' : undefined} className="relative -top-5">
          <span className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-gray-100 dark:border-black" aria-hidden="true">
            {item.icon}
          </span>
        </Link>
      ) : (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={`flex flex-col items-center justify-center w-full h-full ${item.active ? 'text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
        >
          <span className="text-xl mb-1" aria-hidden="true">{item.icon}</span>
          <span className="text-[10px]">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
