'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Component ย่อยสำหรับปุ่มเมนู
function SidebarItem({ href, icon, label, active }) {
  return (
    <Link 
      href={href} 
      className={`
        relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group/item
        ${active 
          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
          : 'hover:bg-gray-100 text-gray-600 dark:text-gray-400 dark:hover:bg-neutral-900 dark:hover:text-white'
        }
      `}
    >
      <div className="flex-shrink-0 text-xl w-6 text-center">{icon}</div>

      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
        {label}
      </span>

      {/* Tooltip */}
      <div className="
        absolute left-full top-1/2 -translate-y-1/2 ml-3
        px-2 py-1 bg-gray-900 text-white text-xs rounded-md shadow-lg
        opacity-0 -translate-x-3 pointer-events-none
        group-hover/item:opacity-100 group-hover/item:translate-x-0
        transition-all duration-200 z-50 whitespace-nowrap
        dark:bg-white dark:text-black
        group-hover:hidden
      ">
        {label}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-white"></div>
      </div>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  // 1. กลุ่มเมนูหลัก
  const mainMenus = [
    { label: 'หน้าแรก', href: '/', icon: '🏠' },
    { label: 'มาแรง', href: '/?sort=likes', icon: '🔥' },
    { label: 'จัดอันดับ', href: '/leaderboard', icon: '🏆' },
  ];

  // 2. กลุ่มเมนูส่วนตัว
  const personalMenus = [
    { label: 'โปรไฟล์', href: '/profile', icon: '👤' },
    { label: 'บันทึกไว้', href: '/profile/saved', icon: '🔖' },
  ];

  // 3. กลุ่มหมวดหมู่
  const categoryMenus = [
    { label: 'Hardware', href: '/?category=Hardware', icon: '💻' },
    { label: 'Software', href: '/?category=Software', icon: '💾' },
    { label: 'Network', href: '/?category=Network', icon: '🌐' },
    { label: 'AI & Data', href: '/?category=AI & Data', icon: '🤖' },
    { label: 'General', href: '/?category=General', icon: '📝' },
  ];

  return (
    <aside className="fixed top-0 left-0 z-40 h-full w-16 hover:w-64 bg-white border-r border-gray-200 text-gray-600 transition-all duration-300 ease-in-out shadow-2xl group hidden md:flex flex-col pt-24 dark:bg-black dark:border-neutral-800 dark:text-gray-400">
      
      <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-100 group-hover:opacity-0 transition-opacity duration-300"></div>

      <div className="flex-1 flex flex-col p-3 overflow-y-auto no-scrollbar">
        
        {/* --- ส่วนที่ 1: เมนูหลัก --- */}
        <div className="space-y-1">
          {mainMenus.map((item) => (
            <SidebarItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </div>

        <hr className="border-gray-200 my-4 dark:border-neutral-800 mx-2" />

        {/* --- ส่วนที่ 2: เมนูส่วนตัว --- */}
        <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap dark:text-neutral-500">
          My Zone
        </div>
        <div className="space-y-1">
          {personalMenus.map((item) => (
            <SidebarItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </div>

        <hr className="border-gray-200 my-4 dark:border-neutral-800 mx-2" />

        {/* --- ส่วนที่ 3: หมวดหมู่ --- */}
        <div className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap dark:text-neutral-500">
          Categories
        </div>
        <div className="space-y-1">
          {categoryMenus.map((item) => (
            <SidebarItem key={item.label} {...item} active={false} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
          {['ข้อกำหนด', 'นโยบาย', 'ช่วยเหลือ'].map((text) => (
             <button key={text} className="text-xs text-left text-gray-400 hover:text-red-600 transition-colors">
               • {text}
             </button>
          ))}
        </div>

      </div>
    </aside>
  );
}