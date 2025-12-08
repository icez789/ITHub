import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs'; // ✅ อย่าลืม install: npm install bcryptjs
import Link from 'next/link';

export const metadata = {
  title: 'แก้ไขข้อมูลส่วนตัว | IT Techboard',
};

export default async function EditProfilePage({ searchParams }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');

  // 1. เช็ค Session
  if (!session) redirect('/login');

  let userSession;
  try {
    userSession = JSON.parse(session.value);
  } catch (error) {
    redirect('/login');
  }

  // 2. ดึงข้อมูล User ล่าสุดจาก DB
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userSession.id]);
  const currentUser = users[0];

  if (!currentUser) redirect('/login');

  // รับค่า Notify เพื่อแจ้งเตือน
  const params = await searchParams; // Next.js 15+ ต้อง await searchParams
  const notify = params?.notify;

  // --- Server Action ---
  async function updateProfile(formData) {
    'use server';
    
    const username = formData.get('username');
    const bio = formData.get('bio'); 
    
    const oldPassword = formData.get('oldPassword');
    const newPassword = formData.get('newPassword');
    const confirmNewPassword = formData.get('confirmNewPassword');

    // 1. อัปเดตข้อมูลทั่วไป (Username, Bio)
    try {
        await db.query('UPDATE users SET username = ?, bio = ? WHERE id = ?', [username, bio, userSession.id]);
    } catch (error) {
        console.error("Update Error:", error);
        // กรณีชื่อซ้ำ (ถ้าตั้ง unique ไว้ที่ username) อาจจะต้อง catch error นี้
        return redirect('/profile/edit?notify=error_username');
    }

    // 2. Logic เปลี่ยนรหัสผ่าน (ถ้ามีการกรอก)
    if (newPassword || oldPassword) {
        if (!oldPassword || !newPassword) {
            redirect('/profile/edit?notify=missing_password');
        }

        // เช็คว่ารหัสเดิมถูกไหม
        const match = await bcrypt.compare(oldPassword, currentUser.password);
        if (!match) {
            redirect('/profile/edit?notify=wrong_old_password');
        }

        if (newPassword !== confirmNewPassword) {
            redirect('/profile/edit?notify=password_mismatch');
        }

        // แฮชรหัสใหม่แล้วบันทึก
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userSession.id]);
    }

    // 3. อัปเดต Session Cookie (สำคัญมาก เพราะ Username เปลี่ยน)
    // เราต้องสร้างก้อนข้อมูลใหม่ โดยอิงจากข้อมูลล่าสุดใน DB (ไม่งั้นข้อมูลใน Cookie จะไม่อัปเดต)
    const updatedSessionData = {
        ...userSession,
        username: username, // อัปเดตชื่อใหม่
        // ถ้ามี avatar หรือ role เปลี่ยน ก็ควรอัปเดตตรงนี้ด้วย
    };
    
    // ตั้งค่า Cookie ใหม่ทับอันเดิม
    const newCookieStore = await cookies();
    newCookieStore.set('user_session', JSON.stringify(updatedSessionData), { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 วัน
    });

    redirect('/profile?notify=profile_updated');
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      
      {/* Header & Back Button */}
      <div className="mb-8">
        <Link href="/profile" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 mb-4 inline-flex items-center gap-1 transition-colors">
            &larr; กลับหน้าโปรไฟล์
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            ⚙️ แก้ไขข้อมูลส่วนตัว
        </h1>
      </div>

      {/* แจ้งเตือน Error (Alerts) */}
      {notify === 'wrong_old_password' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center font-bold flex items-center justify-center gap-2">
              ❌ รหัสผ่านเดิมไม่ถูกต้อง
          </div>
      )}
      {notify === 'password_mismatch' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center font-bold flex items-center justify-center gap-2">
              ❌ รหัสผ่านใหม่ไม่ตรงกัน
          </div>
      )}
      {notify === 'missing_password' && (
          <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-center flex items-center justify-center gap-2">
              ⚠️ กรุณากรอกรหัสผ่านให้ครบถ้วน
          </div>
      )}
      {notify === 'error_username' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center font-bold">
              ❌ ชื่อผู้ใช้นี้ถูกใช้งานแล้ว หรือเกิดข้อผิดพลาด
          </div>
      )}

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 dark:bg-neutral-900 dark:border-neutral-800">
        
        <form action={updateProfile} className="space-y-6">
            
            {/* ส่วนข้อมูลทั่วไป */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4 dark:text-gray-200">ข้อมูลทั่วไป</h2>
                
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">ชื่อผู้ใช้ (Username)</label>
                    <input 
                        name="username" 
                        type="text" 
                        defaultValue={currentUser.username}
                        required 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white" 
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">คำแนะนำตัว (Bio)</label>
                    <textarea 
                        name="bio" 
                        defaultValue={currentUser.bio || ''}
                        placeholder="เขียนอะไรสักหน่อยเกี่ยวกับตัวคุณ..."
                        rows="3"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white" 
                    ></textarea>
                </div>
            </div>

            {/* ส่วนเปลี่ยนรหัสผ่าน */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 dark:text-gray-200">
                    🔒 เปลี่ยนรหัสผ่าน <span className="text-sm font-normal text-gray-500">(ถ้าต้องการ)</span>
                </h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1 dark:text-gray-400">รหัสผ่านเดิม</label>
                    <input 
                        name="oldPassword" 
                        type="password" 
                        placeholder="กรอกเพื่อยืนยันการเปลี่ยนรหัส"
                        className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-600 dark:text-white" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 dark:text-gray-400">รหัสผ่านใหม่</label>
                        <input 
                            name="newPassword" 
                            type="password" 
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-600 dark:text-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 dark:text-gray-400">ยืนยันรหัสใหม่</label>
                        <input 
                            name="confirmNewPassword" 
                            type="password" 
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-600 dark:text-white" 
                        />
                    </div>
                </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div className="flex justify-end gap-3 pt-4">
                <Link href="/profile" className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition dark:text-gray-300 dark:border-neutral-600 dark:hover:bg-neutral-800">
                    ยกเลิก
                </Link>
                <button type="submit" className="px-8 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition hover:scale-105 active:scale-95 dark:bg-red-700 dark:hover:bg-red-600">
                    บันทึกการแก้ไข
                </button>
            </div>

        </form>

      </div>
    </div>
  );
}