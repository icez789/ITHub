import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import DeleteButton from '../DeleteButton'; // ดึงปุ่มจากโฟลเดอร์ admin แม่

export default async function TopicsManagementPage({ searchParams }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session) redirect('/login');
  
  const currentUser = JSON.parse(session.value);
  const [userCheck] = await db.query('SELECT role FROM users WHERE id = ?', [currentUser.id]);
  if (userCheck[0]?.role !== 'admin' && userCheck[0]?.role !== 'super_admin') redirect('/');

  // Search Logic
  const q = searchParams?.q || '';
  const querySQL = `
    SELECT t.*, u.username, u.avatar_url, 
    (SELECT COUNT(*) FROM comments WHERE topic_id = t.id) as comment_count
    FROM topics t 
    JOIN users u ON t.user_id = u.id
    WHERE t.title LIKE ? OR t.content LIKE ?
    ORDER BY t.created_at DESC
  `;
  const [topics] = await db.query(querySQL, [`%${q}%`, `%${q}%`]);

  // Action ลบกระทู้
  async function deleteTopic(formData) {
    'use server';
    const topicId = formData.get('topicId');
    await db.query('DELETE FROM topics WHERE id = ?', [topicId]);
    await db.query('DELETE FROM comments WHERE topic_id = ?', [topicId]);
    revalidatePath('/admin/topics');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-8 font-sans">
       <div className="container mx-auto max-w-6xl">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="text-sm text-gray-500 hover:text-red-500 mb-2 inline-block">← Back to Dashboard</Link>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <span className="text-red-600 text-4xl">📝</span> Topic Management
                </h1>
            </div>
            <form className="relative w-full md:w-96">
                <input name="q" defaultValue={q} placeholder="Search topics..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-red-500 outline-none transition"/>
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </form>
         </div>

         <div className="grid gap-4">
            {topics.map((t) => (
                <div key={t.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:border-red-500/30 transition flex justify-between items-start">
                    <div className="flex-1">
                        <Link href={`/topic/${t.id}`} target="_blank" className="text-lg font-bold text-gray-900 dark:text-white hover:text-red-600 transition block mb-1">
                            {t.title}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{t.content}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] overflow-hidden">
                                    {t.avatar_url ? <img src={t.avatar_url} className="w-full h-full object-cover"/> : t.username.charAt(0)}
                                </span>
                                {t.username}
                            </span>
                            <span>📅 {new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                            <span className="flex items-center gap-1">💬 {t.comment_count}</span>
                            <span className="flex items-center gap-1">👁️ {t.views}</span>
                        </div>
                    </div>
                    
                    <div className="ml-4">
                        <DeleteButton 
                            action={deleteTopic} 
                            id={t.id} 
                            idName="topicId" 
                            className="px-3 py-1.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded hover:bg-red-600 hover:text-white transition text-xs font-bold"
                        >
                            Delete
                        </DeleteButton>
                    </div>
                </div>
            ))}
            {topics.length === 0 && <div className="text-center py-10 text-gray-500">No topics found.</div>}
         </div>
       </div>
    </div>
  );
}