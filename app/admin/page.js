// app/admin/page.js
import React from 'react';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import DeleteButton from './DeleteButton';
import { getCurrentUser, requireAdmin, requireContentModerator } from '../../lib/auth';
import { positiveInteger } from '../../lib/validation';
import { deleteCommentCascade, deleteTopicCascade } from '../../lib/moderation';
import { isContentModeratorRole } from '../../lib/roles';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Eye, FileText, LockKeyhole, MessageCircle, Trash2, Users } from 'lucide-react';

export default async function AdminDashboard() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const myRole = currentUser.role;

  if (!isContentModeratorRole(myRole)) {
    redirect('/'); 
  }

  const isSuperAdmin = myRole === 'super_admin';
  const isTeacher = myRole === 'teacher';

  const [
    [userCountData],
    [topicCountData],
    [commentCountData],
    [users],
    [reports],
    [latestTopics]
  ] = await Promise.all([
    isTeacher ? Promise.resolve([[{ count: 0 }], []]) : db.query('SELECT COUNT(*) as count FROM users'),
    db.query('SELECT COUNT(*) as count FROM topics'),
    db.query('SELECT COUNT(*) as count FROM comments'),
    isTeacher ? Promise.resolve([[], []]) : db.query(`
      SELECT id, username, role, avatar_url, is_banned FROM users ORDER BY
      CASE WHEN role = 'super_admin' THEN 1 WHEN role = 'admin' THEN 2 WHEN role = 'teacher' THEN 3 ELSE 4 END,
      created_at DESC
      LIMIT 20
    `),
    db.query(`
      SELECT r.id, r.topic_id, r.comment_id, r.reason,
             reporter.username AS reporter_name,
             t.title AS topic_title,
             c.content AS comment_content
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN topics t ON r.topic_id = t.id
      LEFT JOIN comments c ON r.comment_id = c.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT 50
    `),
    db.query(`
      SELECT t.id, t.title, t.created_at, u.username, u.role
      FROM topics t 
      JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC 
      LIMIT 10
    `)
  ]);

  async function toggleBan(formData) {
    'use server';
    const actor = await requireAdmin();
    const userId = positiveInteger(formData.get('userId'), 'user id');
    const [targets] = await db.query('SELECT role, is_banned FROM users WHERE id = ?', [userId]);
    const target = targets[0];
    if (!target || target.role === 'super_admin' || actor.id === userId) throw new Error('Forbidden');
    await db.query('UPDATE users SET is_banned = ? WHERE id = ?', [!target.is_banned, userId]);
    revalidatePath('/admin');
  }

  async function resolveReport(formData) {
    'use server';
    await requireContentModerator();
    const reportId = positiveInteger(formData.get('reportId'), 'report id');
    await db.query("UPDATE reports SET status = 'resolved' WHERE id = ?", [reportId]);
    revalidatePath('/admin');
  }

  async function deleteTopic(formData) {
    'use server';
    try {
      await requireContentModerator();
      const topicId = positiveInteger(formData.get('topicId'), 'topic id');
      const deleted = await deleteTopicCascade(topicId);
      if (!deleted) return { success: false, message: 'ไม่พบกระทู้หรือกระทู้ถูกลบไปแล้ว' };
      revalidatePath('/');
      revalidatePath('/admin');
      revalidatePath('/admin/topics');
      revalidatePath('/leaderboard');
      revalidatePath('/profile');
      revalidatePath('/profile/saved');
      return { success: true, message: 'ลบกระทู้และรายการรายงานแล้ว' };
    } catch (error) {
      console.error('Reported topic deletion error:', error);
      return { success: false, message: 'ลบกระทู้ไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  async function deleteComment(formData) {
    'use server';
    try {
      await requireContentModerator();
      const commentId = positiveInteger(formData.get('commentId'), 'comment id');
      const deleted = await deleteCommentCascade(commentId);
      if (!deleted) return { success: false, message: 'ไม่พบความคิดเห็นหรือความคิดเห็นถูกลบไปแล้ว' };
      revalidatePath('/admin');
      revalidatePath('/admin/comments');
      revalidatePath('/leaderboard');
      return { success: true, message: 'ลบความคิดเห็นและรายการรายงานแล้ว' };
    } catch (error) {
      console.error('Reported comment deletion error:', error);
      return { success: false, message: 'ลบความคิดเห็นไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  return (
    <main className="ithub-page-container mx-auto max-w-7xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
      <div>
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-200 dark:border-red-900/30 pb-6">
            <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
                     <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white"><LockKeyhole aria-hidden="true" size={23} /></span> {isTeacher ? 'ศูนย์ดูแลเนื้อหา' : 'ศูนย์จัดการระบบ'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">
                    {isTeacher ? 'ตรวจสอบรายงาน กระทู้ และความคิดเห็นในชุมชน' : 'ตรวจสอบเนื้อหา สมาชิก และสถานะชุมชน'}
                </p>
            </div>
            {isSuperAdmin && (
                <div className="mt-4 md:mt-0 px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-500/50 dark:text-yellow-400 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                   <LockKeyhole aria-hidden="true" size={15} /> สิทธิ์ผู้ดูแลสูงสุด
                </div>
            )}
        </div>

        {/* --- Stats Cards --- */}
        <div className={`grid grid-cols-1 gap-6 mb-10 ${isTeacher ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
           
           {/* Card 1: Users */}
           {!isTeacher && <Link href="/admin/users" className="block group">
                <div className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-500/50 hover:shadow-md">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                         <Users aria-hidden="true" size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">สมาชิกทั้งหมด</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-800 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-500">
                        {userCountData[0].count}
                    </p>
                    <div className="mt-4 flex items-center text-xs text-gray-400 font-mono">
                         เปิดหน้าจัดการสมาชิก
                    </div>
                </div>
           </Link>}

          {/* Card 2: Topics */}
          <Link href="/admin/topics" className="block group">
                <div className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-500/50 hover:shadow-md">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                         <FileText aria-hidden="true" size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">กระทู้ทั้งหมด</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-800 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-500">
                        {topicCountData[0].count}
                    </p>
                     <div className="mt-4 flex items-center text-xs text-gray-400 font-mono">
                         เปิดหน้าจัดการกระทู้
                    </div>
                </div>
          </Link>

          {/* Card 3: Comments */}
          <Link href="/admin/comments" className="block group">
                <div className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-500/50 hover:shadow-md">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                         <MessageCircle aria-hidden="true" size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">ความคิดเห็น</h3>
                    <p className="mt-2 text-4xl font-bold text-gray-800 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-500">
                        {commentCountData[0].count}
                    </p>
                    <div className="mt-4 flex items-center text-xs text-gray-400 font-mono">
                         เปิดหน้าตรวจสอบความคิดเห็น
                    </div>
                </div>
          </Link>

          {/* Card 4: System Health */}
          <div className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400"><Activity aria-hidden="true" size={16} /> สถานะระบบ</h3>
              <div className="space-y-4">
                 <div>
                    <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>ภาระเซิร์ฟเวอร์</span><span className="font-bold text-red-600">12%</span></div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-neutral-800"><div className="h-full w-[12%] rounded-full bg-red-500"></div></div>
                 </div>
                 <div>
                    <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>ฐานข้อมูล</span><span className="font-bold text-green-600 dark:text-green-400">ปกติ</span></div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-neutral-800"><div className="h-full w-full rounded-full bg-green-500"></div></div>
                 </div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Recent Topics & Reports */}
            <div className={`${isTeacher ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}>
                
                {/* --- Reports Section --- */}
                <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden shadow-lg shadow-red-500/5 mb-8">
                    <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                        <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                             <AlertTriangle aria-hidden="true" size={18} /> รายงานที่รอตรวจสอบ <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">{reports.length}</span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        {reports.length > 0 ? (
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-red-50 dark:bg-neutral-800 text-red-700 dark:text-red-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-3">ประเภท</th>
                                    <th className="px-6 py-3">เนื้อหา</th>
                                    <th className="px-6 py-3">เหตุผล</th>
                                    <th className="px-6 py-3">ผู้รายงาน</th>
                                    <th className="px-6 py-3 text-center">การจัดการ</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100 dark:divide-neutral-800">
                                {reports.map((r) => (
                                    <tr key={r.id} className="hover:bg-red-50/50 dark:hover:bg-neutral-800 transition">
                                    <td className="px-6 py-4 text-xs font-bold">{r.topic_id ? 'กระทู้' : 'ความคิดเห็น'}</td>
                                    <td className="px-6 py-4 max-w-xs truncate font-medium">{r.topic_title || r.comment_content}</td>
                                    <td className="px-6 py-4 text-red-600 dark:text-red-400">{r.reason}</td>
                                    <td className="px-6 py-4">{r.reporter_name}</td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <form action={resolveReport}>
                                            <input type="hidden" name="reportId" value={r.id} />
                                            <button aria-label="ปิดรายงานโดยไม่ลบเนื้อหา" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-gray-600 dark:text-gray-300 transition" title="ปิดรายงาน"><Eye aria-hidden="true" size={16} /></button>
                                        </form>
                                        {r.topic_id ? (
                                            <DeleteButton 
                                                action={deleteTopic} 
                                                id={r.topic_id} 
                                                idName="topicId" 
                                                 reportId={r.id}
                                                 ariaLabel="ลบกระทู้ที่ถูกรายงาน"
                                                 title="ลบกระทู้ที่ถูกรายงาน?"
                                                 description="กระทู้และข้อมูลที่เกี่ยวข้องทั้งหมด รวมถึงรายการรายงานนี้ จะถูกลบถาวร"
                                                className="p-2 rounded-lg bg-red-100 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-900/30 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white transition"
                                            >
                                                 <Trash2 aria-hidden="true" size={16} />
                                            </DeleteButton>
                                        ) : (
                                            <DeleteButton 
                                                action={deleteComment} 
                                                id={r.comment_id} 
                                                idName="commentId" 
                                                 reportId={r.id}
                                                 ariaLabel="ลบความคิดเห็นที่ถูกรายงาน"
                                                 title="ลบความคิดเห็นที่ถูกรายงาน?"
                                                 description="ความคิดเห็นและรายการรายงานนี้จะถูกลบถาวร แต่คำตอบย่อยจะยังอยู่"
                                                className="p-2 rounded-lg bg-orange-100 hover:bg-orange-600 text-orange-600 hover:text-white dark:bg-orange-900/30 dark:hover:bg-orange-600 dark:text-orange-400 dark:hover:text-white transition"
                                            >
                                                 <Trash2 aria-hidden="true" size={16} />
                                            </DeleteButton>
                                        )}
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-900">
                                 <CheckCircle2 className="mb-3 text-emerald-600" aria-hidden="true" size={34} />
                                 <p className="text-lg font-bold">ไม่มีรายการค้าง</p>
                                <p className="text-sm">ไม่มีรายการร้องเรียนที่รอตรวจสอบในขณะนี้</p>
                            </div>
                        )}
                    </div>
                </div>
                

                {/* --- Recent Topics Table --- */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200"><Activity aria-hidden="true" size={18} /> กระทู้ล่าสุด</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                        <thead className="bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-gray-500 uppercase font-bold text-xs">
                            <tr>
                            <th className="px-6 py-3">ชื่อกระทู้</th>
                            <th className="px-6 py-3">ผู้เขียน</th>
                            <th className="px-6 py-3">วันที่</th>
                            <th className="px-6 py-3 text-right">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {latestTopics.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white truncate max-w-xs">
                                    <Link href={`/topic/${t.id}`} target="_blank" className="hover:text-red-600 transition">{t.title}</Link>
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-white">
                                        {t.username.charAt(0).toUpperCase()}
                                    </div>
                                    {t.username}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono opacity-70">
                                    {new Date(t.created_at).toLocaleDateString('th-TH')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <DeleteButton 
                                        action={deleteTopic} 
                                        id={t.id} 
                                        idName="topicId" 
                                        ariaLabel={`ลบกระทู้ ${t.title}`}
                                        title={`ลบกระทู้ “${t.title}”?`}
                                        description="กระทู้และข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบถาวร"
                                        className="text-xs text-red-500 hover:text-white border border-red-500/30 hover:bg-red-600 px-3 py-1 rounded transition"
                                    >
                                        ลบ
                                    </DeleteButton>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Column: User List (Side Panel) */}
            {!isTeacher && <div className="lg:col-span-1">
                 <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
                        <h3 className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200"><ClipboardList aria-hidden="true" size={18} /> จัดการสมาชิก</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[600px] p-2 flex-1">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {users.map((u) => {
                                const isTargetSuperAdmin = u.role === 'super_admin';
                                const showActions = !isTargetSuperAdmin && u.id !== currentUser.id;

                                return (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-white overflow-hidden ring-2 ring-transparent group-hover:ring-red-500 transition">
                                                    {u.avatar_url ? <Image src={u.avatar_url} alt={`รูปโปรไฟล์ของ ${u.username}`} fill sizes="40px" className="object-cover" /> : u.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 ${u.is_banned ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                    {u.username}
                                                </p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                                                    u.role === 'super_admin' ? 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:bg-yellow-900/20' :
                                                    u.role === 'admin' ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-400 dark:bg-red-900/20' :
                                                    u.role === 'teacher' ? 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:bg-blue-900/20' :
                                                    'border-gray-200 text-gray-500 dark:border-neutral-700 dark:text-gray-500'
                                                }`}>
                                                    {u.role === 'teacher' ? 'อาจารย์' : u.role}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Actions Panel (Visible on Hover) */}
                                        {showActions && (
                                            <div className="mt-3 flex gap-2 justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                <form action={toggleBan}>
                                                    <input type="hidden" name="userId" value={u.id} />
                                                    <input type="hidden" name="currentStatus" value={u.is_banned ? '1' : '0'} />
                                                    <button className={`px-2 py-1 rounded text-white text-xs transition ${u.is_banned ? 'bg-gray-500' : 'bg-red-500 hover:bg-red-600'}`}>
                                                         {u.is_banned ? 'ปลดระงับ' : 'ระงับ'}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>}

        </div>
      </div>
    </main>
  );
}
