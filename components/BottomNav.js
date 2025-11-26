'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const menus = [
    { label: 'หน้าแรก', href: '/', icon: '🏠' },
    { label: 'มาแรง', href: '/?sort=likes', icon: '🔥' },
    { label: 'สร้าง', href: '/create', icon: '➕', isSpecial: true }, // ปุ่มพิเศษ
    { label: 'แจ้งเตือน', href: '/notifications', icon: '🔔' }, // (สมมติว่ามีหน้าแจ้งเตือน)
    { label: 'ฉัน', href: '/profile', icon: '👤' },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center md:hidden dark:bg-black dark:border-neutral-800">
      {menus.map((item) => {
        const isActive = pathname === item.href;
        
        if (item.isSpecial) {
           return (
             <Link key={item.label} href={item.href} className="relative -top-5">
               <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-gray-100 dark:border-black">
                 {item.icon}
               </div>
             </Link>
           );
        }

        return (
          <Link 
            key={item.label} 
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}