import React from 'react';
import Navbar from '../../components/Navbar';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default function LoginPage() {

  async function login(formData) {
    'use server';
    
    const email = formData.get('email');
    const password = formData.get('password');

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    // ถ้าไม่เจอ User หรือ รหัสผิด
    if (!user || !(await bcrypt.compare(password, user.password))) {
      redirect('/login?notify=login_failed'); // ส่งไปแจ้งเตือนว่ารหัสผิด
    }

    // ✨ เช็กว่าโดนแบนไหม?
    if (user.is_banned) {
       redirect('/login?notify=banned'); // ส่งไปแจ้งเตือนว่าโดนแบน
    }

    // ถ้าผ่านทุกด่าน -> สร้าง Cookie
    const userData = JSON.stringify({ 
      id: user.id, 
      username: user.username,
      role: user.role 
    });
    
    const cookieStore = await cookies();
    cookieStore.set('user_session', userData, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 
    });

    redirect('/?notify=login_success');
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
          
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">เข้าสู่ระบบ</h2>
          <p className="text-center text-gray-500 mb-8 dark:text-gray-400">ยินดีต้อนรับกลับสู่ IT Techboard</p>

          <form action={login} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">อีเมล</label>
              <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่าน</label>
              <input name="password" type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
            </div>
            <button type="submit" className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-95">
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm dark:text-gray-400">
            ยังไม่มีบัญชี? <Link href="/register" className="text-red-600 hover:underline font-bold">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  );
}