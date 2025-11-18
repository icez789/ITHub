import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '../lib/db'; 
import ThemeToggle from './ThemeToggle'; 

export default async function Navbar() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  let user = null;

  if (session) {
    try {
      const sessionData = JSON.parse(session.value);
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [sessionData.id]);
      user = users[0]; 
    } catch (error) {
      console.error("Session Error:", error);
    }
  }

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('user_session');
    redirect('/login?notify=logout_success');
  }

  return (
    // แก้ไข: dark:bg-black และ dark:border-neutral-800 (เส้นขอบสีเทาเข้มมาก)
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-6 shadow-sm z-50 sticky top-0 dark:bg-black dark:border-neutral-800 transition-colors duration-300">
      
      <Link href="/" className="flex items-center gap-3">
         <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
            IT
         </div>
         <span className="font-bold text-xl tracking-tight hidden sm:block text-gray-900 dark:text-white">TECH<span className="text-red-600">BOARD</span></span>
      </Link>
      
      <div className="flex-1 max-w-xl relative hidden md:block">
        <form action="/" method="GET">
          {/* ช่องค้นหา: ปรับสีพื้นหลังตอนมืดให้เป็นสีเทาเข้มๆ (neutral-900) เพื่อให้จมลงไปในพื้นดำ */}
          <input 
            name="search" 
            type="text" 
            placeholder="ค้นหาหัวข้อ... (กด Enter)" 
            className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-full py-2 px-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-100 dark:focus:bg-black dark:focus:border-red-600" 
          />
        </form>
      </div>

      <nav className="flex gap-3 items-center">
        <ThemeToggle />

        {user ? (
          <div className="flex items-center gap-4">
             <Link href="/create" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all transform hover:scale-105 active:scale-95 text-sm">
               <span>+</span> <span className="hidden sm:inline">สร้างกระทู้</span>
             </Link>

             <Link href="/profile" className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity group">
                <p className="text-xs text-gray-400 font-medium group-hover:text-red-500 transition-colors">ยินดีต้อนรับ,</p>
                <p className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors dark:text-gray-200">{user.username}</p>
             </Link>
             
             <Link href="/profile">
               <div className="w-10 h-10 rounded-full overflow-hidden border border-red-200 cursor-pointer hover:shadow-md transition-all bg-gray-100 flex items-center justify-center dark:bg-neutral-800 dark:border-neutral-700">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-red-600">{user.username.charAt(0).toUpperCase()}</span>
                  )}
               </div>
             </Link>
             
             <form action={logout}>
                <button className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-600 px-3 py-2 rounded-lg transition-all bg-white dark:bg-neutral-900 dark:text-gray-400 dark:border-neutral-700 dark:hover:text-red-500 dark:hover:border-red-500" title="ออกจากระบบ">
                  <span className="sm:hidden">Exit</span>
                  <span className="hidden sm:inline">Logout</span>
                </button>
             </form>
          </div>
        ) : (
          <>
            <Link href="/register" className="text-gray-600 hover:text-red-600 font-medium px-3 py-2 transition-colors dark:text-gray-300">Register</Link>
            <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md font-medium shadow-md transition-all hover:shadow-red-500/30">Login</Link>
          </>
        )}
      </nav>
    </header>
  );
}