import React from 'react';
import Navbar from '../../../components/Navbar';
import { redirect } from 'next/navigation';
import db from '../../../lib/db';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Editor from '../../../components/Editor'; // เรียกใช้ Editor

export default async function EditTopicPage({ params }) {
  const { id } = await params;
  
  // เช็กสิทธิ์
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session) redirect('/login');
  const currentUser = JSON.parse(session.value);

  const [topics] = await db.query('SELECT * FROM topics WHERE id = ?', [id]);
  const topic = topics[0];

  if (!topic) return <div>ไม่พบข้อมูล</div>;

  // ป้องกันคนอื่นมาเนียนแก้ (ถ้าไม่ใช่เจ้าของ และไม่ใช่แอดมิน ดีดออก)
  const isOwner = currentUser.id === topic.user_id;
  const isAdmin = currentUser.role === 'admin';
  if (!isOwner && !isAdmin) {
    redirect('/');
  }

  async function updateTopic(formData) {
    'use server';
    const title = formData.get('title');
    const category = formData.get('category');
    const content = formData.get('content'); // รับ HTML จาก Editor

    await db.query(
      'UPDATE topics SET title = ?, category = ?, content = ? WHERE id = ?',
      [title, category, content, id]
    );

    redirect(`/topic/${id}?notify=edit_success`);
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar />
      
      <div className="container mx-auto p-6 max-w-2xl">
        <Link href={`/topic/${id}`} className="text-gray-500 hover:text-red-600 mb-4 inline-block">
          &larr; ยกเลิกการแก้ไข
        </Link>

        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-yellow-500">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-yellow-500 text-2xl">✏️</span> แก้ไขกระทู้
          </h1>

          <form action={updateTopic} className="flex flex-col gap-4">
            
            <div>
              <label className="block text-gray-600 font-medium mb-1">หัวข้อกระทู้</label>
              <input name="title" type="text" required defaultValue={topic.title} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">หมวดหมู่</label>
              <select name="category" defaultValue={topic.category} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Network">Network</option>
                <option value="AI & Data">AI & Data</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">รายละเอียด</label>
              {/* ส่งค่าเก่า (defaultValue) ไปให้ Editor */}
              <Editor defaultValue={topic.content} />
            </div>

            <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg shadow-md transition-all mt-4">
              บันทึกการแก้ไข
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}