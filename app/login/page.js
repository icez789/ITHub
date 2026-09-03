import React from 'react';
// Navbar ไม่ต้องใส่แล้ว เพราะ Layout จัดการให้
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import RippleButton from '../../components/RippleButton';
import AuthShell from '../../components/AuthShell';
import {
  getCurrentUser,
  isSessionConfigurationError,
  setUserSession,
} from '../../lib/auth';
import { enforceRateLimit } from '../../lib/rateLimit';
import { validEmail } from '../../lib/validation';
import { getTrustedClientIp } from '../../lib/clientIp';

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
      const requestHeaders = await headers();
      const clientIp = getTrustedClientIp(requestHeaders);
      await Promise.all([
        enforceRateLimit(`login-account:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 }),
        enforceRateLimit(`login-ip:${clientIp}`, { limit: 40, windowMs: 15 * 60 * 1000 }),
      ]);
    } catch {
      redirect(`/login?notify=login_failed${nextQuery}`);
    }

    const [users] = await db.query(
      'SELECT id, password, is_banned, session_version FROM users WHERE email = ? LIMIT 1',
      [email],
    );
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
    <AuthShell title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับสู่ชุมชน ITHub" footer={<>ยังไม่มีบัญชี? <Link href="/register" className="font-semibold text-[var(--app-primary)] hover:underline">สมัครสมาชิก</Link></>}>
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
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">อีเมล</label>
            <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">รหัสผ่าน</label>
            <input id="login-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" placeholder="••••••••" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>
          
          <RippleButton 
            type="submit" 
            className="mt-2 w-full rounded-lg bg-[var(--app-primary)] py-3 font-semibold text-[var(--app-primary-contrast)] hover:bg-[var(--app-primary-hover)]"
          >
            เข้าสู่ระบบ
          </RippleButton>
        </form>

    </AuthShell>
  );
}
