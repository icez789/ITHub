import React from 'react';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import Link from 'next/link';
import Image from 'next/image';
import DeleteButton from '../DeleteButton'; // ดึงปุ่มจากโฟลเดอร์ admin แม่
import { getCurrentUser, requireContentModerator } from '../../../lib/auth';
import { isContentModeratorRole } from '../../../lib/roles';
import { positiveInteger } from '../../../lib/validation';
import { deleteTopicCascade } from '../../../lib/moderation';
import { destroyMediaAsset } from '../../../lib/mediaCleanup';
import AdminPagination from '../AdminPagination';
import { ArrowLeft, CalendarDays, Eye, FileText, MessageCircle, Search, Trash2 } from 'lucide-react';

export default async function TopicsManagementPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!isContentModeratorRole(currentUser.role)) redirect('/');

  // Search Logic
  const params = await searchParams;
  const q = String(params?.q || '').trim().slice(0, 100);
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${q}%`;
  const querySQL = `
    SELECT t.id, t.title, t.content, t.created_at, t.views, t.is_pinned, t.is_locked, u.username, u.avatar_url,
    (SELECT COUNT(*) FROM comments WHERE topic_id = t.id) as comment_count
    FROM topics t 
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.title LIKE ? OR t.content LIKE ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [[topics], [countRows]] = await Promise.all([
    db.query(querySQL, [searchPattern, searchPattern, pageSize, offset]),
    db.query('SELECT COUNT(*) AS count FROM topics WHERE title LIKE ? OR content LIKE ?', [searchPattern, searchPattern]),
  ]);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0].count) / pageSize));

  // Action ลบกระทู้
  async function deleteTopic(formData) {
    'use server';
    try {
      const actor = await requireContentModerator();
      const topicId = positiveInteger(formData.get('topicId'), 'topic id');
      const result = await deleteTopicCascade(topicId, { actorId: actor.id, action: 'topic.delete.moderation' });
      if (!result.deleted) return { success: false, message: 'ไม่พบกระทู้หรือกระทู้ถูกลบไปแล้ว' };
      if (result.imagePublicId) after(() => destroyMediaAsset(result.imagePublicId, 'topic_deleted'));
      revalidatePath('/');
      revalidatePath('/admin');
      revalidatePath('/admin/topics');
      revalidatePath('/leaderboard');
      revalidatePath('/profile');
      revalidatePath('/profile/saved');
      return { success: true, message: 'ลบกระทู้แล้ว' };
    } catch (error) {
      console.error('Admin topic deletion error:', error);
      return { success: false, message: 'ลบกระทู้ไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
       <div>
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-red-600"><ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ</Link>
                <h1 className="flex items-center gap-3 text-3xl font-bold">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white"><FileText aria-hidden="true" size={22} /></span> จัดการกระทู้
                </h1>
            </div>
            <form className="relative w-full md:w-96">
                <label htmlFor="topic-search" className="sr-only">ค้นหากระทู้</label>
                <input id="topic-search" name="q" defaultValue={q} placeholder="ค้นหากระทู้..." className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-2.5 pl-10 pr-4 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"/>
                <Search className="absolute left-3 top-3 text-[var(--app-muted)]" aria-hidden="true" size={17} />
            </form>
         </div>

         <div className="grid gap-4">
            {topics.map((t) => (
                <article key={t.id} className="flex items-start justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition hover:border-red-500/40">
                    <div className="flex-1">
                        <Link href={`/topic/${t.id}`} target="_blank" className="text-lg font-bold text-gray-900 dark:text-white hover:text-red-600 transition block mb-1">
                            {t.title}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{t.content}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--app-muted)]">
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                <span className="relative w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] overflow-hidden">
                                {t.avatar_url ? <Image src={t.avatar_url} alt={`รูปโปรไฟล์ของ ${t.username || 'สมาชิกที่ถูกลบ'}`} fill sizes="20px" className="object-cover" /> : (t.username || '?').charAt(0)}
                                </span>
                                {t.username || 'สมาชิกที่ถูกลบ'}
                            </span>
                            <span className="flex items-center gap-1"><CalendarDays aria-hidden="true" size={14} /> {new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                            <span className="flex items-center gap-1"><MessageCircle aria-hidden="true" size={14} /> {t.comment_count}</span>
                            <span className="flex items-center gap-1"><Eye aria-hidden="true" size={14} /> {t.views}</span>
                        </div>
                    </div>
                    
                    <div className="ml-4">
                        <DeleteButton 
                            action={deleteTopic} 
                            id={t.id} 
                            idName="topicId" 
                            ariaLabel={`ลบกระทู้ ${t.title}`}
                            title={`ลบกระทู้ “${t.title}”?`}
                            description="กระทู้และความคิดเห็น การถูกใจ รายการบันทึก รายงาน และโพลที่เกี่ยวข้องจะถูกลบถาวร"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                        >
                            <Trash2 aria-hidden="true" size={14} /> ลบ
                        </DeleteButton>
                    </div>
                </article>
            ))}
            {topics.length === 0 && <div className="py-10 text-center text-[var(--app-muted)]">ไม่พบกระทู้</div>}
         </div>
         <AdminPagination path="/admin/topics" page={page} totalPages={totalPages} query={q} />
       </div>
    </main>
  );
}
