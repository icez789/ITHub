import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import EditTopicForm from './EditTopicForm'; // ✅ นำเข้า Form ที่เราเพิ่งสร้าง
import { getCurrentUser, isAdmin } from '../../../lib/auth';

export const metadata = {
  title: 'แก้ไขกระทู้ | ITHub',
};

export default async function EditTopicPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // 2. ดึงข้อมูลกระทู้เดิม
  const [topics] = await db.query('SELECT * FROM topics WHERE id = ?', [id]);
  const topic = topics[0];

  // 3. เช็คความปลอดภัย
  if (!topic) return <div className="text-center p-10 dark:text-white">ไม่พบกระทู้นี้</div>;
  
  if (topic.user_id !== user.id && !isAdmin(user)) {
      redirect('/'); 
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
       <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-yellow-500 dark:bg-neutral-900 dark:border-yellow-600">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
            <span className="text-yellow-500 text-3xl">✏️</span> แก้ไขกระทู้
          </h1>
          
          {/* ✅ ส่งข้อมูลไปให้ Client Component จัดการต่อ */}
          <EditTopicForm topic={topic} />
          
       </div>
    </div>
  );
}
