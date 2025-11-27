import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก (Layout จัดการให้แล้ว)
import { redirect } from 'next/navigation';
import db from '../../lib/db';
import { cookies } from 'next/headers';
import fs from 'node:fs/promises';
import path from 'node:path';
import Editor from '../../components/Editor'; 

export default async function CreateTopicPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  // 1. ถ้าไม่มี Session ดีดไปหน้า Login ทันที
  if (!session) {
    redirect('/login');
  }

  // 2. ป้องกัน error กรณีคุกกี้พัง (Invalid JSON)
  let user;
  try {
    user = JSON.parse(session.value);
  } catch (error) {
    redirect('/login'); // ถ้าแกะข้อมูลไม่ได้ ให้ไป login ใหม่
  }

  async function createTopic(formData) {
    'use server';

    const title = formData.get('title');
    const category = formData.get('category');
    const content = formData.get('content');
    const imageFile = formData.get('image');

    let imageUrl = null;

    // Logic อัปโหลดรูปภาพ (สำหรับ Local Server)
    if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + '_' + imageFile.name.replaceAll(" ", "_");
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      try { await fs.mkdir(uploadDir, { recursive: true }); } catch (e) {}

      const savePath = path.join(uploadDir, fileName);
      await fs.writeFile(savePath, buffer);
      imageUrl = `/uploads/${fileName}`;
    }

    // บันทึกลงฐานข้อมูล
    await db.query(
      'INSERT INTO topics (title, category, content, user_id, image_url) VALUES (?, ?, ?, ?, ?)', 
      [title, category, content, user.id, imageUrl]
    );

    // เพิ่มแต้ม Post Count ให้ User
    await db.query('UPDATE users SET post_count = post_count + 1 WHERE id = ?', [user.id]);

    redirect('/?notify=create_success');
  }

  return (
    // เอา min-h-screen ออก เพราะ parent layout มี scroll ให้แล้ว
    <div className="container mx-auto p-6 max-w-3xl">
      
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600 dark:bg-neutral-900 dark:border-red-700">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
          <span className="text-red-600 text-3xl">+</span> ตั้งกระทู้ใหม่
        </h1>
        
        <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
          โพสต์โดย: <span className="font-bold text-black dark:text-white">{user.username}</span>
        </p>

        <form action={createTopic} className="flex flex-col gap-6">
          
          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หัวข้อกระทู้ <span className="text-red-500">*</span></label>
            <input name="title" type="text" required placeholder="เช่น สอบถามเรื่องการประกอบคอม..." className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หมวดหมู่ <span className="text-red-500">*</span></label>
            <select name="category" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white cursor-pointer">
              <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
              <option value="Software">Software (โปรแกรม & OS)</option>
              <option value="Network">Network (เครือข่าย & Internet)</option>
              <option value="AI & Data">AI & Data Science</option>
              <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รายละเอียด</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700">
               <Editor /> 
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รูปภาพประกอบ (ถ้ามี)</label>
            <input name="image" type="file" accept="image/*" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:bg-black dark:border-neutral-700 dark:text-gray-300 dark:file:bg-red-900/30 dark:file:text-red-400 cursor-pointer" />
          </div>

          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-md transition-all mt-2 transform hover:scale-[1.01] active:scale-95 dark:bg-red-700 dark:hover:bg-red-600">
             โพสต์กระทู้ทันที 🚀
          </button>
        </form>
      </div>
    </div>
  );
}