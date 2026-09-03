import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก (Layout จัดการให้แล้ว)
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import RippleButton from '../../components/RippleButton';
import AuthShell from '../../components/AuthShell';
import { getCurrentUser } from '../../lib/auth';
import { enforceRateLimit } from '../../lib/rateLimit';
import { requiredText, validEmail } from '../../lib/validation';

export default async function RegisterPage({ searchParams }) {
  
  // รับค่า query string เพื่อแสดงแจ้งเตือน (เช่น ?notify=password_mismatch)
  const params = await searchParams;
  const notify = params?.notify;

  async function registerUser(formData) {
    'use server';
    
    let username;
    let email;
    let password;
    let confirmPassword;

    try {
      username = requiredText(formData.get('username'), 'username', { min: 3, max: 40 });
      email = validEmail(formData.get('email'));
      password = requiredText(formData.get('password'), 'password', { min: 8, max: 128 });
      confirmPassword = String(formData.get('confirmPassword') || '');
      await enforceRateLimit(`register:${email}`, { limit: 4, windowMs: 60 * 60 * 1000 });
    } catch {
      redirect('/register?notify=error');
    }

    // 1. เช็คว่ารหัสผ่านตรงกันไหม
    if (password !== confirmPassword) {
        redirect('/register?notify=password_mismatch');
    }

    // 2. แฮชรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // 3. บันทึกลงฐานข้อมูล
      await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
    } catch (error) {
      console.error("Register Error:", error);
      // เช็ค Error Code ของ MySQL (ER_DUP_ENTRY = 1062) กรณีชื่อหรืออีเมลซ้ำ
      if (error.code === 'ER_DUP_ENTRY') {
         redirect('/register?notify=duplicate_user');
      }
      redirect('/register?notify=error');
    }

    // 4. สมัครเสร็จแล้ว ส่งไปหน้า Login
    redirect('/login?notify=register_success');
  }

  // --- ถ้าล็อกอินอยู่แล้ว ไม่ควรมาหน้านี้ ให้ดีดกลับหน้าแรก ---
  if (await getCurrentUser()) {
      redirect('/'); 
  }

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อถาม ตอบ และแบ่งปันกับชุมชน" footer={<>มีบัญชีอยู่แล้ว? <Link href="/login" className="font-semibold text-[var(--app-primary)] hover:underline">เข้าสู่ระบบ</Link></>}>
        {/* --- ส่วนแสดง Error Message --- */}
        {notify === 'password_mismatch' && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                รหัสผ่านไม่ตรงกัน กรุณาลองใหม่
            </div>
        )}
        {notify === 'duplicate_user' && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                ชื่อผู้ใช้หรืออีเมลนี้ มีผู้ใช้งานแล้ว
            </div>
        )}
        {notify === 'error' && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
            </div>
        )}

        <form action={registerUser} className="flex flex-col gap-4">
          
          <div>
            <label htmlFor="register-username" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">ชื่อผู้ใช้</label>
            <input id="register-username" name="username" type="text" required minLength={3} maxLength={40} autoComplete="username" placeholder="เช่น Somchai IT" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">อีเมล</label>
            <input id="register-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">รหัสผ่าน</label>
            <input id="register-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">ยืนยันรหัสผ่าน</label>
            <input id="register-confirm-password" name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] outline-none transition-shadow focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>

          {/* ปุ่ม Submit */}
          <RippleButton 
            type="submit" 
            className="mt-2 w-full rounded-lg bg-[var(--app-primary)] py-3 font-semibold text-[var(--app-primary-contrast)] hover:bg-[var(--app-primary-hover)]"
          >
            สมัครสมาชิก
          </RippleButton>
        </form>

    </AuthShell>
  );
}
