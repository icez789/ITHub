import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import fs from 'node:fs/promises';
import path from 'node:path';
import ProfileAvatar from '../../components/ProfileAvatar'; 
import Footer from '../../components/Footer';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  // 1. เช็ค Session ถ้าไม่มีดีดไป Login
  if (!session) {
    redirect('/login');
  }

  // 2. ป้องกัน Error กรณีคุกกี้พัง
  let userSession;
  try {
    userSession = JSON.parse(session.value);
  } catch (error) {
    redirect('/login');
  }

  // 3. ดึงข้อมูล User (ถ้า User ถูกลบจาก DB ไปแล้ว ให้ดีดออก)
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userSession.id]);
  const fullUserData = users[0];

  if (!fullUserData) {
     redirect('/login');
  }

  const [myTopics] = await db.query(
    'SELECT * FROM topics WHERE user_id = ? ORDER BY created_at DESC', 
    [userSession.id]
  );

  async function updateAvatar(formData) {
    'use server';
    const imageFile = formData.get('avatar');

    if (imageFile && imageFile.size > 0) {
      const fileName = `user_${userSession.id}_${Date.now()}_${imageFile.name.replaceAll(" ", "_")}`;
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadDir = path.join(process.cwd(), 'public/uploads/avatars');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (error) {
        console.error('Error creating directory:', error);
      }

      const savePath = path.join(uploadDir, fileName);
      await fs.writeFile(savePath, buffer);

      const avatarUrl = `/uploads/avatars/${fileName}`;
      await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userSession.id]);
      
      redirect('/profile?notify=edit_success');
    }
  }

  return (
    // เอา min-h-screen wrapper ออก เพื่อให้เข้ากับ Layout หลัก
    <div className="container mx-auto p-6 max-w-5xl">
        
        <h1 className="text-3xl font-bold mb-8 text-gray-800 border-l-8 border-red-600 pl-4 dark:text-white dark:border-red-700">
          โปรไฟล์ของฉัน
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1">
            <ProfileAvatar 
              user={fullUserData} 
              updateAvatar={updateAvatar} 
              myTopicsCount={myTopics.length} 
            />
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-gray-200">
              📝 กระทู้ที่คุณตั้งไว้ ({myTopics.length})
            </h3>

            <div className="space-y-4">
              {myTopics.length > 0 ? (
                myTopics.map((topic) => (
                  <div key={topic.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 dark:bg-neutral-900 dark:border-neutral-800">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded dark:bg-neutral-800 dark:text-gray-400">
                            {topic.category}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(topic.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <Link href={`/topic/${topic.id}`} className="text-lg font-bold text-gray-800 hover:text-red-600 transition-colors line-clamp-1 dark:text-gray-100 dark:hover:text-red-400">
                          {topic.title}
                        </Link>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link href={`/topic/${topic.id}`} className="flex-1 sm:flex-none text-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700">
                          ดู
                        </Link>
                        <Link href={`/edit/${topic.id}`} className="flex-1 sm:flex-none text-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-500 hover:text-white text-sm font-medium transition dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-800">
                          แก้ไข
                        </Link>
                     </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-10 rounded-xl text-center border border-dashed border-gray-300 dark:bg-neutral-900 dark:border-neutral-800">
                  <p className="text-gray-400 text-lg mb-4">คุณยังไม่เคยตั้งกระทู้เลย...</p>
                  <Link href="/create" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition inline-block dark:bg-red-700 dark:hover:bg-red-600">
                    + เริ่มตั้งกระทู้แรก
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="mt-12">
            <Footer />
        </div>
    </div>
  );
}