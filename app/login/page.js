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

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("Login Failed");
      return; 
    }

    // --- จุดที่แก้ไข: เพิ่ม role เข้าไปใน Cookie ---
    const userData = JSON.stringify({ 
      id: user.id, 
      username: user.username,
      role: user.role // เพิ่มตรงนี้!
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
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
          
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">เข้าสู่ระบบ</h2>
          <p className="text-center text-gray-500 mb-8">ยินดีต้อนรับกลับสู่ IT Techboard</p>

          <form action={login} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input name="password" type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
            <button type="submit" className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-95">
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm">
            ยังไม่มีบัญชี? <Link href="/register" className="text-red-600 hover:underline font-bold">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  );
}