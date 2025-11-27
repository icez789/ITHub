import React from 'react';
// Navbar ไม่ต้องใส่แล้ว เพราะ Layout จัดการให้
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import { cookies } from 'next/headers';
import RippleButton from '../../components/RippleButton';

export default async function LoginPage({ searchParams }) {
  
  // รับค่า query string สำหรับแจ้งเตือน (เช่น ?notify=login_failed)
  const params = await searchParams;
  const notify = params?.notify;

  async function login(formData) {
    'use server';
    
    const email = formData.get('email');
    const password = formData.get('password');

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    // ตรวจสอบรหัสผ่าน
    if (!user || !(await bcrypt.compare(password, user.password))) {
      redirect('/login?notify=login_failed');
    }

    // ตรวจสอบสถานะแบน
    if (user.is_banned) {
       redirect('/login?notify=banned');
    }

    // สร้าง Session Data
    const userData = JSON.stringify({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      avatar_url: user.avatar_url 
    });
    
    const cookieStore = await cookies();
    cookieStore.set('user_session', userData, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      path: '/',      
      maxAge: 60 * 60 * 24 // 1 วัน
    });

    redirect('/?notify=login_success');
  }

  // --- เช็คว่าถ้าล็อกอินอยู่แล้ว ให้เด้งไปหน้าแรก ---
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (session) {
      redirect('/'); 
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
        
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">เข้าสู่ระบบ</h2>
        <p className="text-center text-gray-500 mb-8 dark:text-gray-400">ยินดีต้อนรับกลับสู่ IT Techboard</p>

        {/* แสดงแจ้งเตือน Error */}
        {notify === 'login_failed' && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                อีเมลหรือรหัสผ่านไม่ถูกต้อง
            </div>
        )}
        {notify === 'banned' && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center font-bold">
                บัญชีของคุณถูกระงับการใช้งาน
            </div>
        )}
        {notify === 'logout_success' && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 border border-green-200 rounded-lg text-sm text-center">
                ออกจากระบบเรียบร้อยแล้ว
            </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">อีเมล</label>
            <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่าน</label>
            <input name="password" type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
          </div>
          
          <RippleButton 
            type="submit" 
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg dark:bg-red-700 dark:hover:bg-red-600"
          >
            เข้าสู่ระบบ
          </RippleButton>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm dark:text-gray-400">
          ยังไม่มีบัญชี? <Link href="/register" className="text-red-600 hover:underline font-bold dark:text-red-400">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
}