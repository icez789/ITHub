import React from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import db from '../../../lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import UserBadge from '../../../components/UserBadge';
import TopicCard from '../../../components/TopicCard';
import Editor from '../../../components/Editor'; 
import CommentItem from '../../../components/CommentItem';
import RippleButton from '../../../components/RippleButton'; 
import ReportButton from '../../../components/ReportButton';
import ViewCounter from '../../../components/ViewCounter'; 

// Metadata
export async function generateMetadata({ params }) {
  const { id } = await params;
  const [topics] = await db.query('SELECT title, content, user_id FROM topics WHERE id = ?', [id]);
  const topic = topics[0];

  if (!topic) return { title: 'ไม่พบเนื้อหา | IT Techboard' };

  const [users] = await db.query('SELECT username FROM users WHERE id = ?', [topic.user_id]);
  const authorName = users[0]?.username || 'Member';

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  // (ส่วนรูป OG เราลบออกไปแล้ว เหลือแค่ Title)
  
  return {
    title: `${topic.title} | IT Techboard`,
    description: topic.content.replace(/<[^>]*>?/gm, '').slice(0, 100) + '...',
  };
}

export default async function TopicDetailPage({ params }) {
  const { id } = await params;
  
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  let currentUser = null;
  if (session) currentUser = JSON.parse(session.value);

  const isAdmin = currentUser?.role === 'admin';

  // ❌ ลบบรรทัดนี้ออก: await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [id]);
  // เราจะใช้ ViewCounter แทนด้านล่าง

  // 1. ดึงข้อมูลกระทู้หลัก
  const [topics] = await db.query(`
    SELECT topics.*, users.username, users.role, users.post_count 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id 
    WHERE topics.id = ?
  `, [id]);
  const topic = topics[0];

  if (!topic) return <div className="p-10 text-center dark:text-white">ไม่พบกระทู้นี้...</div>;

  // 2. ดึงคอมเมนต์ทั้งหมด
  const [allComments] = await db.query(`
    SELECT comments.*, users.username, users.role, users.post_count 
    FROM comments 
    LEFT JOIN users ON comments.user_id = users.id 
    WHERE topic_id = ? 
    ORDER BY created_at ASC
  `, [id]);

  // --- Logic จัดกลุ่มคอมเมนต์ ---
  const commentMap = {};
  const rootComments = [];

  allComments.forEach(c => {
      c.children = [];
      commentMap[c.id] = c;
  });

  allComments.forEach(c => {
      if (c.parent_id && commentMap[c.parent_id]) {
          commentMap[c.parent_id].children.push(c);
      } else {
          rootComments.push(c);
      }
  });

  // 3. ดึงยอดไลก์
  const [likeCountResult] = await db.query('SELECT COUNT(*) as count FROM likes WHERE topic_id = ?', [id]);
  const likeCount = likeCountResult[0].count;

  let isLiked = false;
  if (currentUser) {
    const [userLike] = await db.query('SELECT * FROM likes WHERE topic_id = ? AND user_id = ?', [id, currentUser.id]);
    isLiked = userLike.length > 0;
  }

  // Bookmark Logic
  let isBookmarked = false;
  if (currentUser) {
    const [bookmark] = await db.query('SELECT * FROM bookmarks WHERE topic_id = ? AND user_id = ?', [id, currentUser.id]);
    isBookmarked = bookmark.length > 0;
  }

  // Related Topics
  const [relatedTopics] = await db.query(`
    SELECT topics.*, users.username 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id
    WHERE topics.category = ? AND topics.id != ?
    ORDER BY topics.created_at DESC
    LIMIT 4
  `, [topic.category, id]);

  const isOwner = currentUser && (currentUser.id === topic.user_id);

  // --- Server Actions ---
  async function deleteTopic() { 'use server'; await db.query('DELETE FROM topics WHERE id = ?', [id]); redirect('/?notify=delete_success'); }
  
  async function addComment(formData) { 
    'use server'; 
    const content = formData.get('content'); 
    const parentId = formData.get('parentId') || null;
    if (currentUser) { 
      await db.query('INSERT INTO comments (topic_id, content, user_id, parent_id) VALUES (?, ?, ?, ?)', [id, content, currentUser.id, parentId]); 
      
      if (!parentId && topic.user_id !== currentUser.id) {
          await db.query('INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES (?, ?, ?, ?, ?)', 
            [topic.user_id, currentUser.id, id, 'comment', `${currentUser.username} แสดงความคิดเห็นในกระทู้ของคุณ`]
          );
      }
      revalidatePath(`/topic/${id}`); 
    } 
  }

  async function toggleLike() { 
    'use server'; 
    if (!currentUser) return; 
    const [existing] = await db.query('SELECT * FROM likes WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); 
    if (existing.length > 0) { await db.query('DELETE FROM likes WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); } 
    else { 
      await db.query('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)', [currentUser.id, id]); 
      if (topic.user_id !== currentUser.id) {
        await db.query('INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES (?, ?, ?, ?, ?)', [topic.user_id, currentUser.id, id, 'like', `${currentUser.username} ถูกใจกระทู้ของคุณ`]);
      }
    } 
    revalidatePath(`/topic/${id}`); 
  }

  async function toggleBookmark() { 'use server'; if (!currentUser) return; const [existing] = await db.query('SELECT * FROM bookmarks WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); if (existing.length > 0) { await db.query('DELETE FROM bookmarks WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); } else { await db.query('INSERT INTO bookmarks (user_id, topic_id) VALUES (?, ?)', [currentUser.id, id]); } revalidatePath(`/topic/${id}`); }
  
  async function deleteComment(formData) { 'use server'; const commentId = formData.get('commentId'); await db.query('DELETE FROM comments WHERE id = ?', [commentId]); revalidatePath(`/topic/${id}`); }

  async function submitReport(formData) {
    'use server';
    if (!currentUser) return;
    const targetId = formData.get('targetId');
    const type = formData.get('type'); 
    const reason = formData.get('reason');
    if (type === 'topic') { await db.query('INSERT INTO reports (reporter_id, topic_id, reason) VALUES (?, ?, ?)', [currentUser.id, targetId, reason]); } 
    else if (type === 'comment') { await db.query('INSERT INTO reports (reporter_id, comment_id, reason) VALUES (?, ?, ?)', [currentUser.id, targetId, reason]); }
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-8 pl-6 md:pl-8">
          
          {/* 2. ✨ ใส่ตัวนับวิวไว้ตรงนี้ (มันจะทำงานเงียบๆ) */}
          <ViewCounter topicId={id} />

          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors dark:text-gray-400 dark:hover:text-red-400">&larr; กลับหน้าหลัก</Link>
            <div className="flex gap-3 items-center">
                {currentUser && <ReportButton targetId={id} type="topic" reportAction={submitReport} />}
                {isOwner && <Link href={`/edit/${id}`} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-500 hover:text-white transition border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-700">✏️ แก้ไข</Link>}
                {(isOwner || isAdmin) && <form action={deleteTopic}><button type="submit" className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-700">🗑️ {isAdmin && !isOwner ? 'ลบ (Admin)' : 'ลบกระทู้นี้'}</button></form>}
            </div>
          </div>

          {/* Topic Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 relative dark:bg-neutral-900 dark:border-neutral-800">
            <div className="bg-gray-900 p-8 text-white relative overflow-hidden dark:bg-black">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-[80px] opacity-50"></div>
               <span className="inline-block bg-red-600 text-xs font-bold px-2 py-1 rounded mb-4">{topic.category}</span>
               <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{topic.title}</h1>
               <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm mt-4 dark:text-gray-500">
                 <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-white">
                   👤 {topic.username || 'ไม่ระบุ'}
                   <UserBadge role={topic.role} postCount={topic.post_count} />
                 </span>
                 <span className="flex items-center gap-1">📅 {new Date(topic.created_at).toLocaleDateString('th-TH')}</span>
                 <span className="flex items-center gap-1 font-bold text-yellow-400">👁️ {topic.views.toLocaleString()} ครั้ง</span>
               </div>
            </div>

            <div className="p-8 min-h-[200px] border-b border-gray-100 dark:border-neutral-800">
              {topic.image_url && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm inline-block max-w-full dark:border-neutral-700">
                   <img src={topic.image_url} alt="Topic Image" className="max-h-[500px] w-auto object-contain bg-gray-50 dark:bg-black" />
                </div>
              )}
              <div className="text-lg leading-relaxed text-gray-700 prose max-w-none dark:text-gray-300 dark:prose-invert" dangerouslySetInnerHTML={{ __html: topic.content }} />
              
              <div className="mt-8 flex items-center gap-4">
                <form action={toggleLike}>
                  <button type="submit" disabled={!currentUser} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-sm border ${isLiked ? 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700 dark:hover:bg-neutral-700'} ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
                    <span className="text-2xl">{isLiked ? '❤️' : '🤍'}</span>
                    <span>{isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm ml-1 border border-black/5 dark:bg-black/30 dark:border-white/10">{likeCount}</span>
                  </button>
                </form>
                <form action={toggleBookmark}>
                  <button type="submit" disabled={!currentUser} className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold transition-all shadow-sm border ${isBookmarked ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700 dark:hover:bg-neutral-700'} ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`} title="บันทึกไว้อ่านทีหลัง">
                    <span className="text-2xl">{isBookmarked ? '🔖' : '🏷️'}</span>
                    <span className="hidden sm:inline">{isBookmarked ? 'บันทึกแล้ว' : 'บันทึก'}</span>
                  </button>
                </form>
                {!currentUser && <span className="text-sm text-gray-400">(เข้าสู่ระบบเพื่อใช้งาน)</span>}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2 dark:text-gray-200">💬 ความคิดเห็น ({allComments.length})</h3>
            <div className="flex flex-col gap-4">
              {rootComments.length > 0 ? (
                rootComments.map((comment) => (
                   <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      currentUser={currentUser} 
                      isAdmin={isAdmin} 
                      topicUserId={topic.user_id}
                      deleteAction={deleteComment}
                      replyAction={addComment}
                      reportAction={submitReport} 
                   />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300 dark:bg-neutral-900 dark:border-neutral-800 dark:text-gray-500">
                  ยังไม่มีความคิดเห็น... เป็นคนแรกที่ตอบกระทู้นี้สิ!
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600 dark:bg-neutral-900 dark:border-red-700">
            <h3 className="font-bold text-lg mb-4 dark:text-gray-200">แสดงความคิดเห็น</h3>
            {currentUser ? (
              <form action={addComment}>
                <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700">
                   <Editor className="h-32 mb-12 bg-white text-black" />
                </div>
                <RippleButton type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md dark:bg-red-700 dark:hover:bg-red-600">ส่งความคิดเห็น 🚀</RippleButton>
              </form>
            ) : (
              <div className="text-center py-4 bg-gray-100 rounded-lg border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                <p className="text-gray-500 mb-2 dark:text-gray-400">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                <Link href="/login" className="text-red-600 hover:underline font-bold dark:text-red-400">เข้าสู่ระบบคลิกที่นี่</Link>
              </div>
            )}
          </div>

          {relatedTopics.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-neutral-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                🔥 กระทู้ที่เกี่ยวข้องในหมวด <span className="text-red-600">{topic.category}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedTopics.map((t, index) => (
                  <TopicCard key={t.id} index={index} id={t.id} title={t.title} username={t.username} created_at={t.created_at} image_url={t.image_url} />
                ))}
              </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}