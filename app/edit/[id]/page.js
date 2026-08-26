import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import EditTopicForm from './EditTopicForm'; // ✅ นำเข้า Form ที่เราเพิ่งสร้าง
import { getCurrentUser, isAdmin } from '../../../lib/auth';
import { Edit3 } from 'lucide-react';

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
    <main className="ithub-page-container mx-auto max-w-3xl pb-24 pt-8 md:pb-12 md:pt-12">
       <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
            <Edit3 className="text-amber-600" aria-hidden="true" size={24} /> แก้ไขกระทู้
          </h1>
          
          {/* ✅ ส่งข้อมูลไปให้ Client Component จัดการต่อ */}
          <EditTopicForm topic={topic} />
          
       </div>
    </main>
  );
}
