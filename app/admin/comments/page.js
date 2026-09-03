import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import DeleteButton from '../DeleteButton';
import { getCurrentUser, requireContentModerator } from '../../../lib/auth';
import { isContentModeratorRole } from '../../../lib/roles';
import { positiveInteger } from '../../../lib/validation';
import { deleteCommentCascade } from '../../../lib/moderation';
import AdminPagination from '../AdminPagination';
import { ArrowLeft, MessageCircle, Search, Trash2 } from 'lucide-react';

export default async function CommentsManagementPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!isContentModeratorRole(currentUser.role)) redirect('/');

  const params = await searchParams;
  const q = String(params?.q || '').trim().slice(0, 100);
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${q}%`;
  const querySQL = `
    SELECT c.id, c.topic_id, c.content, c.created_at,
           u.username, u.avatar_url, t.title AS topic_title
    FROM comments c
    JOIN users u ON c.user_id = u.id
    JOIN topics t ON c.topic_id = t.id
    WHERE c.content LIKE ? OR u.username LIKE ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [[comments], [countRows]] = await Promise.all([
    db.query(querySQL, [searchPattern, searchPattern, pageSize, offset]),
    db.query(`
      SELECT COUNT(*) AS count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.content LIKE ? OR u.username LIKE ?
    `, [searchPattern, searchPattern]),
  ]);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0].count) / pageSize));

  async function deleteComment(formData) {
    'use server';
    try {
      const actor = await requireContentModerator();
      const commentId = positiveInteger(formData.get('commentId'), 'comment id');
      const result = await deleteCommentCascade(commentId, { actorId: actor.id, action: 'comment.delete.moderation' });
      if (!result.deleted) return { success: false, message: 'ไม่พบความคิดเห็นหรือความคิดเห็นถูกลบไปแล้ว' };
      revalidatePath('/admin');
      revalidatePath('/admin/comments');
      revalidatePath('/leaderboard');
      return { success: true, message: 'ลบความคิดเห็นแล้ว' };
    } catch (error) {
      console.error('Admin comment deletion error:', error);
      return { success: false, message: 'ลบความคิดเห็นไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
       <div>
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-accent-text)]"><ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ</Link>
                <h1 className="flex items-center gap-3 text-3xl font-bold">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-primary)] text-[var(--app-primary-contrast)]"><MessageCircle aria-hidden="true" size={22} /></span> จัดการความคิดเห็น
                </h1>
            </div>
            <form className="relative w-full md:w-96">
                <label htmlFor="comment-search" className="sr-only">ค้นหาความคิดเห็น</label>
                <input id="comment-search" name="q" defaultValue={q} placeholder="ค้นหาความคิดเห็น..." className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] py-2.5 pl-10 pr-4 text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"/>
                <Search className="absolute left-3 top-3 text-[var(--app-muted)]" aria-hidden="true" size={17} />
            </form>
         </div>

         <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
             <div className="divide-y divide-[var(--app-border)]">
                {comments.map((c) => (
                    <div key={c.id} className="flex gap-4 p-6 transition hover:bg-[var(--app-surface-subtle)]">
                        <div className="flex-shrink-0">
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
                                {c.avatar_url ? <Image src={c.avatar_url} alt={`รูปโปรไฟล์ของ ${c.username}`} fill sizes="40px" className="object-cover" /> : c.username.charAt(0)}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="mr-2 font-bold text-[var(--app-text)]">{c.username}</span>
                                    <span className="text-xs text-[var(--app-text-muted)]">แสดงความคิดเห็นใน </span>
                                    <Link href={`/topic/${c.topic_id}`} target="_blank" className="text-xs font-bold text-[var(--app-accent-text)] hover:underline">
                                        {c.topic_title}
                                    </Link>
                                </div>
                                <span className="text-xs text-[var(--app-text-muted)]">{new Date(c.created_at).toLocaleString('th-TH')}</span>
                            </div>
                            
                            <p className="mt-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-sm text-[var(--app-text-muted)]">
                                {c.content}
                            </p>

                            <div className="mt-2 flex justify-end">
                                <DeleteButton 
                                    action={deleteComment} 
                                    id={c.id} 
                                    idName="commentId" 
                                    ariaLabel={`ลบความคิดเห็นของ ${c.username}`}
                                    title={`ลบความคิดเห็นของ ${c.username}?`}
                                    description="ความคิดเห็นนี้จะถูกลบถาวร แต่คำตอบย่อยจะยังอยู่และถูกย้ายออกจากชุดคำตอบเดิม"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                                >
                                    <Trash2 aria-hidden="true" size={14} /> ลบความคิดเห็น
                                </DeleteButton>
                            </div>
                        </div>
                    </div>
                ))}
                {comments.length === 0 && <div className="py-10 text-center text-[var(--app-muted)]">ไม่พบความคิดเห็น</div>}
             </div>
         </div>
         <AdminPagination path="/admin/comments" page={page} totalPages={totalPages} query={q} />
       </div>
    </main>
  );
}
