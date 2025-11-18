import React from 'react';
import Navbar from '../../components/Navbar';
import { redirect } from 'next/navigation';
import db from '../../lib/db';
import { cookies } from 'next/headers';
import fs from 'node:fs/promises';
import path from 'node:path';
import Editor from '../../components/Editor'; // 1. เรียกใช้ Editor

export default async function CreateTopicPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  if (!session) redirect('/login');
  const user = JSON.parse(session.value);

  async function createTopic(formData) {
    'use server';

    const title = formData.get('title');
    const category = formData.get('category');
    const content = formData.get('content'); // รับค่าจาก Input ล่องหนใน Editor
    const imageFile = formData.get('image');

    let imageUrl = null;

    if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + '_' + imageFile.name.replaceAll(" ", "_");
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // สร้างโฟลเดอร์ถ้าไม่มี
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      try { await fs.mkdir(uploadDir, { recursive: true }); } catch (e) {}

      const savePath = path.join(uploadDir, fileName);
      await fs.writeFile(savePath, buffer);
      imageUrl = `/uploads/${fileName}`;
    }

    await db.query(
      'INSERT INTO topics (title, category, content, user_id, image_url) VALUES (?, ?, ?, ?, ?)', 
      [title, category, content, user.id, imageUrl]
    );

    redirect('/?notify=create_success');
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar />
      
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-red-600">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-red-600 text-3xl">+</span> ตั้งกระทู้ใหม่
          </h1>
          
          <p className="text-sm text-gray-500 mb-4">
            โพสต์โดย: <span className="font-bold text-black">{user.username}</span>
          </p>

          <form action={createTopic} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-600 font-medium mb-1">หัวข้อกระทู้</label>
              <input name="title" type="text" required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">หมวดหมู่</label>
              <select name="category" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="AI & Data">AI & Data</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">รายละเอียด</label>
              {/* 2. เปลี่ยน textarea เป็น Editor */}
              <Editor /> 
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">รูปภาพประกอบ (ถ้ามี)</label>
              <input name="image" type="file" accept="image/*" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
            </div>

            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition-all mt-4">
              โพสต์กระทู้
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}