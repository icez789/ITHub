import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import DeleteButton from '../DeleteButton';
import { getCurrentUser, requireAdmin } from '../../../lib/auth';
import { positiveInteger } from '../../../lib/validation';
import { deleteCommentCascade } from '../../../lib/moderation';

export default async function CommentsManagementPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!['admin', 'super_admin'].includes(currentUser.role)) redirect('/');

  const params = await searchParams;
  const q = String(params?.q || '').slice(0, 100);
  const querySQL = `
    SELECT c.*, u.username, u.avatar_url, t.title as topic_title
    FROM comments c
    JOIN users u ON c.user_id = u.id
    JOIN topics t ON c.topic_id = t.id
    WHERE c.content LIKE ? OR u.username LIKE ?
    ORDER BY c.created_at DESC
    LIMIT 50
  `;
  // Limit 50 ไว้ก่อนเพื่อไม่ให้เยอะเกินไป (ถ้าจะทำจริงจังต้องทำ Pagination)
  const [comments] = await db.query(querySQL, [`%${q}%`, `%${q}%`]);

  async function deleteComment(formData) {
    'use server';
    await requireAdmin();
    const commentId = positiveInteger(formData.get('commentId'), 'comment id');
    await deleteCommentCascade(commentId);
    revalidatePath('/admin/comments');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-8 font-sans">
       <div className="container mx-auto max-w-6xl">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="text-sm text-gray-500 hover:text-red-500 mb-2 inline-block">← Back to Dashboard</Link>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <span className="text-red-600 text-4xl">💬</span> Comment Manager
                </h1>
            </div>
            <form className="relative w-full md:w-96">
                <input name="q" defaultValue={q} placeholder="Search comments..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-red-500 outline-none transition"/>
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </form>
         </div>

         <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
             <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {comments.map((c) => (
                    <div key={c.id} className="p-6 hover:bg-gray-50 dark:hover:bg-neutral-800/30 transition flex gap-4">
                        <div className="flex-shrink-0">
                            <div className="relative w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {c.avatar_url ? <Image src={c.avatar_url} alt={`รูปโปรไฟล์ของ ${c.username}`} fill sizes="40px" className="object-cover" /> : c.username.charAt(0)}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-bold text-gray-900 dark:text-white mr-2">{c.username}</span>
                                    <span className="text-xs text-gray-400">commented on </span>
                                    <Link href={`/topic/${c.topic_id}`} target="_blank" className="text-xs font-bold text-red-500 hover:underline">
                                        {c.topic_title}
                                    </Link>
                                </div>
                                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('th-TH')}</span>
                            </div>
                            
                            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-neutral-800">
                                {c.content}
                            </p>

                            <div className="mt-2 flex justify-end">
                                <DeleteButton 
                                    action={deleteComment} 
                                    id={c.id} 
                                    idName="commentId" 
                                    className="text-xs text-red-500 hover:text-red-700 font-bold"
                                >
                                    Remove Comment
                                </DeleteButton>
                            </div>
                        </div>
                    </div>
                ))}
                {comments.length === 0 && <div className="text-center py-10 text-gray-500">No comments found.</div>}
             </div>
         </div>
       </div>
    </div>
  );
}
