import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import db from '../lib/db'; 
import { getCurrentUser } from '../lib/auth';
import ThemeToggle from './ThemeToggle'; 
import NotificationBell from './NotificationBell';
import SearchInput from './SearchInput';
import LogoutButton from './LogoutButton'; // ✅ นำเข้าปุ่มใหม่ที่เราเพิ่งสร้าง

export default async function Navbar() {
  let user = await getCurrentUser();
  let notifications = [];
  let unreadCount = 0;

  // ✅ Logic ดึงข้อมูลที่ปลอดภัยขึ้น (เว็บไม่ล่มแม้ DB หลุด)
  if (user) {
    try {
      const [notisResult, countResult] = await Promise.all([
        db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [user.id]),
        db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]),
      ]);
      notifications = notisResult[0] || [];
      unreadCount = countResult[0][0]?.count || 0;
    } catch (error) {
      console.error('Navbar notification error:', error);
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 md:py-4 flex flex-wrap items-center gap-3 md:gap-6 shadow-sm z-50 sticky top-0 dark:bg-black dark:border-neutral-800 transition-colors duration-300">
      
      {/* LOGO */}
      <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="ITHub หน้าแรก">
         <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
           IT
         </div>
         <span className="font-bold text-xl tracking-tight hidden sm:block text-gray-900 dark:text-white">IT<span className="text-red-600">Hub</span></span>
      </Link>
      
      {/* Search Bar */}
      <SearchInput className="hidden md:block flex-1 max-w-xl" />

      {/* Menu Icons */}
      <nav aria-label="บัญชีผู้ใช้" className="ml-auto flex gap-2 sm:gap-3 items-center">
        
        <ThemeToggle />

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
              
              <NotificationBell 
                count={unreadCount} 
                notifications={notifications} 
                currentUserId={user.id} 
              />

              {/* ปุ่ม Admin (เฉพาะแอดมิน) */}
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link 
                  href="/admin" 
                  className="hidden md:flex items-center gap-1 text-sm font-bold text-gray-700 hover:text-black border border-gray-300 px-3 py-2 rounded-lg transition bg-white shadow-sm dark:bg-neutral-900 dark:text-gray-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  🛡️ ผู้ดูแล
                </Link>
              )}

              {/* ปุ่มสร้างกระทู้ */}
              <Link 
                href="/create" 
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-bold shadow-md transition-all transform hover:scale-105 active:scale-95 text-sm"
              >
                <span>+</span> <span className="hidden sm:inline">สร้างกระทู้</span>
              </Link>

              {/* ชื่อ User */}
              <Link href="/profile" className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity group">
                 <p className="text-xs text-gray-400 font-medium group-hover:text-red-500 transition-colors">ยินดีต้อนรับ,</p>
                 <p className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors dark:text-gray-200">{user.username}</p>
              </Link>
              
              {/* รูป Profile */}
              <Link href="/profile">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-red-200 cursor-pointer hover:shadow-md transition-all bg-gray-100 flex items-center justify-center dark:bg-neutral-800 dark:border-neutral-700">
                   {user.avatar_url ? (
                     <Image src={user.avatar_url} alt={`รูปโปรไฟล์ของ ${user.username}`} fill sizes="40px" className="object-cover" />
                   ) : (
                     <span className="font-bold text-red-600">{user.username.charAt(0).toUpperCase()}</span>
                   )}
                </div>
              </Link>
              
              {/* ✅ ใส่ปุ่ม Logout แบบใหม่ตรงนี้ */}
              <LogoutButton />

          </div>
        ) : (
          /* กรณีไม่ได้ Login */
          <>
            <Link href="/register" className="hidden sm:inline-flex text-gray-600 hover:text-red-600 font-medium px-3 py-2 transition-colors dark:text-gray-300">สมัครสมาชิก</Link>
            <Link href="/login" className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white px-3 sm:px-5 py-2 rounded-md text-sm font-medium shadow-md transition-all hover:shadow-red-500/30">เข้าสู่ระบบ</Link>
          </>
        )}
      </nav>

      <SearchInput className="order-last block w-full max-w-none md:hidden" />
    </header>
  );
}
