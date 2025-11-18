import React from 'react';
import Navbar from '../../components/Navbar';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs'; // 1. เรียกใช้ตัวเข้ารหัส
import Link from 'next/link';

export default function RegisterPage() {

  // --- Server Action: สมัครสมาชิก ---
  async function registerUser(formData) {
    'use server';
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    // เช็กว่ารหัสตรงกันไหม
    if (password !== confirmPassword) {
      // (ในของจริงควรส่ง Error กลับไปแสดง แต่ตอนนี้เอาแบบง่ายก่อน)
      return console.log("รหัสผ่านไม่ตรงกัน");
    }

    // 2. เข้ารหัสรหัสผ่าน (Hashing)
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // 3. บันทึกลง Database
      await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      
      // สมัครเสร็จ ให้เด้งไปหน้า Login (เดี๋ยวเราจะสร้างทีหลัง)
      redirect('/login?notify=register_success');

    } catch (error) {
      console.error("Register Error:", error);
      // กรณีอีเมลซ้ำ หรือ Database Error
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 relative overflow-hidden">
          {/* Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-800"></div>
          
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">สมัครสมาชิก</h2>
          <p className="text-center text-gray-500 mb-8">เข้าร่วมชุมชน IT Techboard วันนี้!</p>

          <form action={registerUser} className="flex flex-col gap-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้ (Username)</label>
              <input 
                name="username"
                type="text" 
                required
                placeholder="เช่น Somchai IT"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input 
                name="email"
                type="email" 
                required
                placeholder="name@example.com"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input 
                name="password"
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
              <input 
                name="confirmPassword"
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <button 
              type="submit" 
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform active:scale-95"
            >
              สมัครสมาชิก
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm">
            มีบัญชีอยู่แล้ว? <Link href="/login" className="text-red-600 hover:underline font-bold">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}