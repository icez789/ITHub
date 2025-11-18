import React from 'react';
import Navbar from '../../../components/Navbar';
import Sidebar from '../../../components/Sidebar';
import db from '../../../lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export default async function TopicDetailPage({ params }) {
  const { id } = await params;
  
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  let currentUser = null;
  if (session) currentUser = JSON.parse(session.value);

  const isAdmin = currentUser?.role === 'admin';

  // เพิ่มยอดวิว
  await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [id]);

  const [topics] = await db.query(`
    SELECT topics.*, users.username 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id 
    WHERE topics.id = ?
  `, [id]);
  const topic = topics[0];

  const [comments] = await db.query(`
    SELECT comments.*, users.username 
    FROM comments 
    LEFT JOIN users ON comments.user_id = users.id 
    WHERE topic_id = ? 
    ORDER BY created_at ASC
  `, [id]);

  const [likeCountResult] = await db.query('SELECT COUNT(*) as count FROM likes WHERE topic_id = ?', [id]);
  const likeCount = likeCountResult[0].count;

  let isLiked = false;
  if (currentUser) {
    const [userLike] = await db.query('SELECT * FROM likes WHERE topic_id = ? AND user_id = ?', [id, currentUser.id]);
    isLiked = userLike.length > 0;
  }

  if (!topic) return <div className="p-10 text-center dark:text-white">ไม่พบกระทู้นี้...</div>;

  const isOwner = currentUser && (currentUser.id === topic.user_id);

  // Server Actions
  async function deleteTopic() { 'use server'; await db.query('DELETE FROM topics WHERE id = ?', [id]); redirect('/?notify=delete_success'); }
  async function addComment(formData) { 'use server'; const content = formData.get('content'); if (currentUser) { await db.query('INSERT INTO comments (topic_id, content, user_id) VALUES (?, ?, ?)', [id, content, currentUser.id]); revalidatePath(`/topic/${id}`); redirect(`/topic/${id}`); } }
  async function toggleLike() { 'use server'; if (!currentUser) return; const [existing] = await db.query('SELECT * FROM likes WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); if (existing.length > 0) { await db.query('DELETE FROM likes WHERE user_id = ? AND topic_id = ?', [currentUser.id, id]); } else { await db.query('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)', [currentUser.id, id]); } revalidatePath(`/topic/${id}`); }
  async function deleteComment(formData) { 'use server'; const commentId = formData.get('commentId'); await db.query('DELETE FROM comments WHERE id = ?', [commentId]); revalidatePath(`/topic/${id}`); }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-8 pl-6 md:pl-8">
          
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors dark:text-gray-400 dark:hover:text-red-400">&larr; กลับหน้าหลัก</Link>
            <div className="flex gap-3">
                {isOwner && (
                  <Link href={`/edit/${id}`} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-500 hover:text-white transition border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-700">
                    ✏️ แก้ไข
                  </Link>
                )}
                {(isOwner || isAdmin) && (
                  <form action={deleteTopic}>
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-700">
                      🗑️ {isAdmin && !isOwner ? 'ลบ (Admin)' : 'ลบกระทู้นี้'}
                    </button>
                  </form>
                )}
            </div>
          </div>

          {/* === Topic Content === */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 relative dark:bg-neutral-900 dark:border-neutral-800">
            <div className="bg-gray-900 p-8 text-white relative overflow-hidden dark:bg-black">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-[80px] opacity-50"></div>
               <span className="inline-block bg-red-600 text-xs font-bold px-2 py-1 rounded mb-4">{topic.category}</span>
               <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{topic.title}</h1>
               <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm mt-4 dark:text-gray-500">
                 <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">👤 {topic.username || 'ไม่ระบุ'}</span>
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
              
              {/* เนื้อหา HTML: เพิ่ม dark:prose-invert เพื่อกลับสีตัวหนังสือให้อัตโนมัติ */}
              <div 
                className="text-lg leading-relaxed text-gray-700 prose max-w-none dark:text-gray-300 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: topic.content }} 
              />

              <div className="mt-8 flex items-center gap-4">
                <form action={toggleLike}>
                  <button 
                    type="submit" 
                    disabled={!currentUser} 
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-sm border 
                      ${isLiked 
                        ? 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800' 
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700 dark:hover:bg-neutral-700'} 
                      ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  >
                    <span className="text-2xl">{isLiked ? '❤️' : '🤍'}</span>
                    <span>{isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm ml-1 border border-black/5 dark:bg-black/30 dark:border-white/10">{likeCount}</span>
                  </button>
                </form>
                {!currentUser && <span className="text-sm text-gray-400">(เข้าสู่ระบบเพื่อกดถูกใจ)</span>}
              </div>
            </div>
          </div>

          {/* === Comments Section === */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2 dark:text-gray-200">💬 ความคิดเห็น ({comments.length})</h3>
            <div className="flex flex-col gap-4">
              {comments.length > 0 ? (
                comments.map((comment, index) => {
                  const canDeleteComment = currentUser && (currentUser.id === comment.user_id || currentUser.id === topic.user_id || isAdmin);
                  return (
                    // การ์ดคอมเมนต์: เพิ่ม Dark Mode
                    <div key={comment.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex gap-4 group relative dark:bg-neutral-900 dark:border-neutral-800">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-red-600 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-red-400">
                        {(comment.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 dark:text-gray-200">{comment.username || 'ผู้เยี่ยมชม'}</span>
                           </div>
                           <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleString('th-TH')}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed dark:text-gray-300">{comment.content}</p>
                      </div>
                      
                      {/* ปุ่มลบในคอมเมนต์ */}
                      {canDeleteComment && (
                        <form action={deleteComment} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <input type="hidden" name="commentId" value={comment.id} />
                           <button type="submit" className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors dark:hover:bg-neutral-800" title="ลบคอมเมนต์นี้">🗑️</button>
                        </form>
                      )}
                    </div>
                  );
                })
              ) : (
                // ถ้าไม่มีคอมเมนต์
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300 dark:bg-neutral-900 dark:border-neutral-800 dark:text-gray-500">
                  ยังไม่มีความคิดเห็น...
                </div>
              )}
            </div>
          </div>

          {/* === Comment Form === */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600 dark:bg-neutral-900 dark:border-red-700">
            <h3 className="font-bold text-lg mb-4 dark:text-gray-200">แสดงความคิดเห็น</h3>
            {currentUser ? (
              <form action={addComment}>
                <textarea 
                  name="content" 
                  required rows="4" 
                  placeholder={`แสดงความคิดเห็นในชื่อ ${currentUser.username}...`} 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-600"
                ></textarea>
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all dark:bg-red-700 dark:hover:bg-red-600">ส่งความคิดเห็น 🚀</button>
              </form>
            ) : (
              <div className="text-center py-4 bg-gray-100 rounded-lg border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700">
                <p className="text-gray-500 mb-2 dark:text-gray-400">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                <Link href="/login" className="text-red-600 hover:underline font-bold dark:text-red-400">เข้าสู่ระบบคลิกที่นี่</Link>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}