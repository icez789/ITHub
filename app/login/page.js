import React from 'react';
// Navbar ไม่ต้องใส่แล้ว เพราะ Layout จัดการให้
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import RippleButton from '../../components/RippleButton';
import {
  getCurrentUser,
  isSessionConfigurationError,
  setUserSession,
} from '../../lib/auth';
import { enforceRateLimit } from '../../lib/rateLimit';
import { validEmail } from '../../lib/validation';

export default async function LoginPage({ searchParams }) {
  
  // รับค่า query string สำหรับแจ้งเตือน (เช่น ?notify=login_failed)
  const params = await searchParams;
  const notify = params?.notify;
  const requestedNext = typeof params?.next === 'string' ? params.next : '';
  const nextPath = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/';
  const nextQuery = nextPath !== '/' ? `&next=${encodeURIComponent(nextPath)}` : '';

  async function login(formData) {
    'use server';
    
    let email;
    const password = String(formData.get('password') || '');

    try {
      email = validEmail(formData.get('email'));
      await enforceRateLimit(`login:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 });
    } catch {
      redirect(`/login?notify=login_failed${nextQuery}`);
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    // ตรวจสอบรหัสผ่าน
    if (!user || !(await bcrypt.compare(password, user.password))) {
      redirect(`/login?notify=login_failed${nextQuery}`);
    }

    // ตรวจสอบสถานะแบน
    if (user.is_banned) {
       redirect(`/login?notify=banned${nextQuery}`);
    }

    try {
      await setUserSession(user);
    } catch (error) {
      if (isSessionConfigurationError(error)) {
        console.error('Login session is not configured:', error.message);
        redirect(`/login?notify=server_config${nextQuery}`);
      }
      throw error;
    }

    redirect(nextPath === '/' ? '/?notify=login_success' : nextPath);
  }

  // --- เช็คว่าถ้าล็อกอินอยู่แล้ว ให้เด้งไปหน้าแรก ---
  if (await getCurrentUser()) {
      redirect(nextPath);
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
        
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">เข้าสู่ระบบ</h1>
        <p className="text-center text-gray-500 mb-8 dark:text-gray-400">ยินดีต้อนรับกลับสู่ ITHub</p>

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
        {notify === 'server_config' && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm text-center dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                ระบบเข้าสู่ระบบยังตั้งค่าไม่สมบูรณ์ กรุณาติดต่อผู้ดูแลระบบ
            </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">อีเมล</label>
            <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่าน</label>
            <input id="login-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
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
