import React from 'react';
// import Navbar from '../../../components/Navbar'; <-- ลบออก!
import { redirect } from 'next/navigation';
import db from '../../../lib/db';
import { cookies } from 'next/headers';
import Editor from '../../../components/Editor'; 

export default async function EditTopicPage({ params }) {
  const { id } = await params; // ดึง ID กระทู้จาก URL

  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  // 1. เช็คว่าล็อกอินไหม
  if (!session) redirect('/login');
  
  const user = JSON.parse(session.value);

  // 2. ดึงข้อมูลกระทู้เดิมมาแสดง
  const [topics] = await db.query('SELECT * FROM topics WHERE id = ?', [id]);
  const topic = topics[0];

  // ถ้าหากระทู้ไม่เจอ
  if (!topic) {
    return <div className="text-center p-10 text-white">ไม่พบกระทู้นี้</div>;
  }

  // 3. 🔒 Security Check: ต้องเป็นเจ้าของกระทู้ หรือ Admin เท่านั้นถึงจะแก้ได้
  if (topic.user_id !== user.id && user.role !== 'admin') {
      redirect('/'); // ถ้าไม่ใช่เจ้าของ ดีดกลับหน้าแรก
  }

  // Server Action สำหรับบันทึกการแก้ไข
  async function updateTopic(formData) {
    'use server';

    const title = formData.get('title');
    const category = formData.get('category');
    const content = formData.get('content');

    // อัปเดตลง Database (แก้ไขเฉพาะ Text ก่อน รูปภาพอาจจะซับซ้อนถ้าต้องลบอันเก่า)
    await db.query(
      'UPDATE topics SET title = ?, category = ?, content = ? WHERE id = ?', 
      [title, category, content, id]
    );

    // กลับไปหน้ากระทู้นั้น พร้อมแจ้งเตือน
    redirect(`/topic/${id}?notify=edit_success`);
  }

  return (
    // เอา min-h-screen ออก เพื่อให้ Layout จัดการ
    <div className="container mx-auto p-6 max-w-3xl">
      
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-yellow-500 dark:bg-neutral-900 dark:border-yellow-600">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
          <span className="text-3xl">✏️</span> แก้ไขกระทู้
        </h1>
        
        <form action={updateTopic} className="flex flex-col gap-6">
          
          {/* หัวข้อกระทู้ */}
          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หัวข้อกระทู้</label>
            <input 
                name="title" 
                type="text" 
                defaultValue={topic.title} // ใส่ค่าเดิม
                required 
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-500" 
            />
          </div>

          {/* หมวดหมู่ */}
          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หมวดหมู่</label>
            <select 
                name="category" 
                defaultValue={topic.category} // เลือกค่าเดิม
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-black dark:border-neutral-700 dark:text-white"
            >
                <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
                <option value="Software">Software (โปรแกรม & OS)</option>
                <option value="Network">Network (เครือข่าย & Internet)</option>
                <option value="AI & Data">AI & Data Science</option>
                <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
          </div>

          {/* รายละเอียด (Editor) */}
          <div>
            <label className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รายละเอียด</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700 bg-white dark:bg-black">
                {/* ส่งค่า content เดิมไปให้ Editor (ต้องแน่ใจว่า Editor รับ prop เช่น initialValue หรือ children นะครับ) */}
                <Editor defaultValue={topic.content} /> 
            </div>
          </div>

          <div className="flex gap-4 mt-4">
             {/* ปุ่มยกเลิก */}
             <a href={`/topic/${id}`} className="flex-1 py-3 text-center border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition dark:text-gray-300 dark:border-neutral-600 dark:hover:bg-neutral-800">
                ยกเลิก
             </a>
             
             {/* ปุ่มบันทึก */}
             <button type="submit" className="flex-[2] bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-[1.01] active:scale-95 dark:bg-yellow-600 dark:hover:bg-yellow-500">
                บันทึกการแก้ไข 💾
             </button>
          </div>

        </form>
      </div>
    </div>
  );
}