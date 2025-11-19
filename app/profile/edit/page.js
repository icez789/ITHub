import React from 'react';
import Navbar from '../../../components/Navbar';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import Link from 'next/link';

export default async function EditProfilePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  if (!session) redirect('/login');
  const userSession = JSON.parse(session.value);

  // ดึงข้อมูลล่าสุด
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userSession.id]);
  const user = users[0];

  // --- Server Action: บันทึกการแก้ไข ---
  async function updateProfile(formData) {
    'use server';
    
    const username = formData.get('username');
    const bio = formData.get('bio');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    const oldPassword = formData.get('oldPassword');

    // 1. อัปเดตข้อมูลทั่วไป (ชื่อ, Bio)
    await db.query('UPDATE users SET username = ?, bio = ? WHERE id = ?', [username, bio, userSession.id]);

    // 2. ถ้ามีการขอเปลี่ยนรหัสผ่าน
    if (newPassword || oldPassword) {
       // ต้องใส่ให้ครบ
       if (!newPassword || !oldPassword) {
          console.log("Error: กรุณากรอกรหัสผ่านให้ครบ");
          return;
       }
       // เช็กรหัสเก่าว่าถูกไหม
       const isMatch = await bcrypt.compare(oldPassword, user.password);
       if (!isMatch) {
          console.log("Error: รหัสผ่านเดิมไม่ถูกต้อง");
          return;
       }
       // เช็กรหัสใหม่ว่าตรงกันไหม
       if (newPassword !== confirmPassword) {
          console.log("Error: รหัสผ่านใหม่ไม่ตรงกัน");
          return;
       }

       // ผ่านหมด -> เข้ารหัสแล้วบันทึก
       const hashedPassword = await bcrypt.hash(newPassword, 10);
       await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userSession.id]);
    }

    // 3. อัปเดต Cookie (เพราะชื่ออาจเปลี่ยน)
    const userData = JSON.stringify({ 
      id: user.id, 
      username: username, // ใช้ชื่อใหม่
      role: user.role 
    });
    
    const cookieStore = await cookies();
    cookieStore.set('user_session', userData, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 
    });

    redirect('/profile?notify=edit_success');
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Navbar />
      
      <div className="container mx-auto p-6 max-w-2xl">
        <Link href="/profile" className="text-gray-500 hover:text-red-600 mb-4 inline-block dark:text-gray-400 dark:hover:text-red-400">
          &larr; กลับหน้าโปรไฟล์
        </Link>

        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-blue-500 dark:bg-neutral-900 dark:border-blue-600">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
            ⚙️ แก้ไขข้อมูลส่วนตัว
          </h1>

          <form action={updateProfile} className="flex flex-col gap-6">
            
            {/* ส่วนข้อมูลทั่วไป */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2 dark:text-gray-200">ข้อมูลทั่วไป</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">ชื่อผู้ใช้ (Username)</label>
                  <input name="username" type="text" required defaultValue={user.username} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">คำแนะนำตัว (Bio)</label>
                  <textarea name="bio" rows="3" defaultValue={user.bio} placeholder="เขียนอะไรสักหน่อยเกี่ยวกับตัวคุณ..." className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-black dark:border-neutral-700 dark:text-white"></textarea>
                </div>
            </div>

            {/* ส่วนเปลี่ยนรหัสผ่าน */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
                <h3 className="font-bold text-lg border-b pb-2 text-gray-700 dark:text-gray-200">🔐 เปลี่ยนรหัสผ่าน (ถ้าต้องการ)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่านเดิม</label>
                  <input name="oldPassword" type="password" placeholder="กรอกเพื่อยืนยันการเปลี่ยนรหัส" className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-black dark:border-neutral-600 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่านใหม่</label>
                      <input name="newPassword" type="password" className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-black dark:border-neutral-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">ยืนยันรหัสใหม่</label>
                      <input name="confirmPassword" type="password" className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-black dark:border-neutral-600 dark:text-white" />
                    </div>
                </div>
            </div>

            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all mt-2 dark:bg-blue-700 dark:hover:bg-blue-600">
              บันทึกการเปลี่ยนแปลง
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}