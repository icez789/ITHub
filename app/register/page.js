import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก (Layout จัดการให้แล้ว)
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import { cookies } from 'next/headers';
import RippleButton from '../../components/RippleButton';

export default async function RegisterPage({ searchParams }) {
  
  // รับค่า query string เพื่อแสดงแจ้งเตือน (เช่น ?notify=password_mismatch)
  const params = await searchParams;
  const notify = params?.notify;

  async function registerUser(formData) {
    'use server';
    
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

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
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (session) {
      redirect('/'); 
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
        
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">สมัครสมาชิก</h2>
        <p className="text-center text-gray-500 mb-8 dark:text-gray-400">เข้าร่วมชุมชน IT Techboard วันนี้!</p>

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
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">ชื่อผู้ใช้ (Username)</label>
            <input name="username" type="text" required placeholder="เช่น Somchai IT" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">อีเมล</label>
            <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่าน</label>
            <input name="password" type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">ยืนยันรหัสผ่าน</label>
            <input name="confirmPassword" type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-600" />
          </div>

          {/* ปุ่ม Submit */}
          <RippleButton 
            type="submit" 
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg dark:bg-red-700 dark:hover:bg-red-600"
          >
            สมัครสมาชิก
          </RippleButton>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm dark:text-gray-400">
          มีบัญชีอยู่แล้ว? <Link href="/login" className="text-red-600 hover:underline font-bold dark:text-red-400">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}