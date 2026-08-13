import React from 'react';
import db from '../../../lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Components
import UserBadge from '../../../components/UserBadge';
import TopicCard from '../../../components/TopicCard';
import Editor from '../../../components/Editor'; 
import CommentItem from '../../../components/CommentItem';
import RippleButton from '../../../components/RippleButton'; 
import ReportButton from '../../../components/ReportButton';
import ViewCounter from '../../../components/ViewCounter';
import PollUI from '../../../components/PollUI'; // ✅ Import โพล
import TopicEngagementActions from '../../../components/TopicEngagementActions';

// Libs & Styles
import { pusherServer } from '../../../lib/pusher'; 
import 'highlight.js/styles/atom-one-dark.css'; 
import { getCurrentUser, isAdmin as isAdminUser, requireUser } from '../../../lib/auth';
import { plainText, sanitizeRichText } from '../../../lib/content';
import { enforceRateLimit } from '../../../lib/rateLimit';
import { optionalPositiveInteger, positiveInteger, requiredText } from '../../../lib/validation';
import { deleteCommentCascade, deleteTopicCascade } from '../../../lib/moderation';
import { notificationChannelName } from '../../../lib/pusherChannels';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const [topics] = await db.query('SELECT title, content FROM topics WHERE id = ?', [id]);
  const topic = topics[0];
  if (!topic) return { title: 'ไม่พบเนื้อหา | ITHub' };
  return {
    title: `${topic.title} | ITHub`,
    description: topic.content.replace(/<[^>]*>?/gm, '').slice(0, 100) + '...',
  };
}

export default async function TopicDetailPage({ params }) {
  const { id } = await params;
  
  const currentUser = await getCurrentUser();
  const isAdmin = isAdminUser(currentUser);

  // --- 1. เตรียม Queries ทั้งหมด ---
  
  // Query กระทู้ (ดึง XP มาด้วย)
  const topicQuery = db.query(`
    SELECT topics.*, users.username, users.role, users.post_count, users.xp 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id 
    WHERE topics.id = ?
  `, [id]);

  // Query คอมเมนต์ (ดึง XP มาด้วย)
  const commentsQuery = db.query(`
    SELECT comments.*, users.username, users.role, users.post_count, users.xp 
    FROM comments 
    LEFT JOIN users ON comments.user_id = users.id 
    WHERE topic_id = ? 
    ORDER BY created_at ASC
  `, [id]);

  // Query โพล (ถ้ามี)
  const pollQuery = db.query('SELECT * FROM polls WHERE topic_id = ?', [id]);

  const likeCountQuery = db.query('SELECT COUNT(*) as count FROM likes WHERE topic_id = ?', [id]);

  const userLikeQuery = currentUser 
    ? db.query('SELECT * FROM likes WHERE topic_id = ? AND user_id = ?', [id, currentUser.id])
    : Promise.resolve([[]]); 

  const bookmarkQuery = currentUser
    ? db.query('SELECT * FROM bookmarks WHERE topic_id = ? AND user_id = ?', [id, currentUser.id])
    : Promise.resolve([[]]);

  // --- 2. รัน Query พร้อมกัน (Parallel Fetching) ---
  const [
    [topics], 
    [allComments], 
    [polls], 
    [likeCountResult], 
    [userLike], 
    [bookmark]
  ] = await Promise.all([
    topicQuery, 
    commentsQuery, 
    pollQuery,
    likeCountQuery, 
    userLikeQuery, 
    bookmarkQuery
  ]);

  const topic = topics[0];

  if (!topic) return <div className="p-10 text-center dark:text-white">ไม่พบกระทู้นี้...</div>;
  topic.content = sanitizeRichText(topic.content);
  allComments.forEach((comment) => {
    comment.content = sanitizeRichText(comment.content);
  });

  // --- 3. จัดการข้อมูล Poll (ถ้ามี) ---
  const poll = polls[0] || null;
  let pollOptions = [];
  let userVote = null;

  if (poll) {
      // ดึงตัวเลือกโพล
      const [options] = await db.query('SELECT * FROM poll_options WHERE poll_id = ?', [poll.id]);
      pollOptions = options;

      // เช็คว่า User เคยโหวตไหม
      if (currentUser) {
          const [votes] = await db.query('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?', [poll.id, currentUser.id]);
          userVote = votes[0]?.option_id || null;
      }
  }

  // --- 4. ดึงกระทู้ที่เกี่ยวข้อง ---
  const [relatedTopics] = await db.query(`
    SELECT topics.*, users.username 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id
    WHERE topics.category = ? AND topics.id != ?
    ORDER BY topics.created_at DESC
    LIMIT 4
  `, [topic.category, id]);

  // จัดระเบียบ Comment (Parent/Child)
  const commentMap = {};
  const rootComments = [];
  allComments.forEach(c => { c.children = []; commentMap[c.id] = c; });
  allComments.forEach(c => { if (c.parent_id && commentMap[c.parent_id]) { commentMap[c.parent_id].children.push(c); } else { rootComments.push(c); } });

  const likeCount = likeCountResult[0].count;
  const isLiked = userLike.length > 0;
  const isBookmarked = bookmark.length > 0;
  const isOwner = currentUser && (currentUser.id === topic.user_id);

  // --- Server Actions ---

  async function deleteTopic() {
    'use server';
    const actor = await requireUser();
    const topicId = positiveInteger(id, 'topic id');
    const [freshTopics] = await db.query('SELECT user_id FROM topics WHERE id = ?', [topicId]);
    if (!freshTopics[0] || (freshTopics[0].user_id !== actor.id && !isAdminUser(actor))) throw new Error('Forbidden');

    await deleteTopicCascade(topicId);
    redirect('/?notify=delete_success');
  }
  
  async function addComment(formData) { 
    'use server'; 
    const actor = await requireUser();
    await enforceRateLimit(`comment:${actor.id}`, { limit: 12, windowMs: 60 * 1000 });
    const topicId = positiveInteger(id, 'topic id');
    const parentId = optionalPositiveInteger(formData.get('parentId'), 'parent comment id');
    const content = sanitizeRichText(formData.get('content'));
    if (plainText(content).length < 1 || content.length > 20_000) throw new Error('Invalid comment');

    const [freshTopics] = await db.query('SELECT user_id FROM topics WHERE id = ?', [topicId]);
    const freshTopic = freshTopics[0];
    if (!freshTopic) throw new Error('Topic not found');
    if (parentId) {
      const [parents] = await db.query('SELECT id FROM comments WHERE id = ? AND topic_id = ?', [parentId, topicId]);
      if (!parents[0]) throw new Error('Invalid parent comment');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO comments (topic_id, content, user_id, parent_id) VALUES (?, ?, ?, ?)',
        [topicId, content, actor.id, parentId],
      );
      await connection.query('UPDATE users SET xp = COALESCE(xp, 0) + 2 WHERE id = ?', [actor.id]);
      if (!parentId && freshTopic.user_id !== actor.id) {
        await connection.query(
          'INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES (?, ?, ?, ?, ?)',
          [freshTopic.user_id, actor.id, topicId, 'comment', `${actor.username} แสดงความคิดเห็นในกระทู้ของคุณ`],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    if (!parentId && freshTopic.user_id !== actor.id) {
      try {
        await pusherServer.trigger(notificationChannelName(freshTopic.user_id), 'new-notification', {
          message: `${actor.username} แสดงความคิดเห็นในกระทู้ของคุณ`,
          link: `/topic/${topicId}`,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Pusher Error:', error);
      }
    }
    revalidatePath(`/topic/${topicId}`);
  }

  async function toggleLike() { 
    'use server';
    let actor;
    let topicId;
    try {
      actor = await requireUser();
      topicId = positiveInteger(id, 'topic id');
    } catch {
      return { success: false, message: 'กรุณาเข้าสู่ระบบอีกครั้ง' };
    }

    let connection;
    let added = false;
    let topicOwnerId = null;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [freshTopics] = await connection.query('SELECT user_id FROM topics WHERE id = ? FOR UPDATE', [topicId]);
      if (!freshTopics[0]) throw new Error('Topic not found');
      topicOwnerId = freshTopics[0].user_id;

      const [existing] = await connection.query(
        'SELECT 1 AS found FROM likes WHERE user_id = ? AND topic_id = ? LIMIT 1 FOR UPDATE',
        [actor.id, topicId],
      );
      if (existing.length > 0) {
        await connection.query('DELETE FROM likes WHERE user_id = ? AND topic_id = ?', [actor.id, topicId]);
      } else {
        added = true;
        await connection.query('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)', [actor.id, topicId]);
        if (topicOwnerId !== actor.id) {
          await connection.query(
            'INSERT INTO notifications (user_id, actor_id, topic_id, type, message) VALUES (?, ?, ?, ?, ?)',
            [topicOwnerId, actor.id, topicId, 'like', `${actor.username} ถูกใจกระทู้ของคุณ`],
          );
        }
      }
      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Toggle Like Error:', error);
      return { success: false, message: 'บันทึกการถูกใจไม่สำเร็จ กรุณาลองใหม่' };
    } finally {
      connection?.release();
    }

    if (added && topicOwnerId !== actor.id) {
      try {
        await pusherServer.trigger(notificationChannelName(topicOwnerId), 'new-notification', {
          message: `${actor.username} ถูกใจกระทู้ของคุณ`,
          link: `/topic/${topicId}`,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Pusher Like Error:', error);
      }
    }

    revalidatePath(`/topic/${topicId}`);
    revalidatePath('/');
    return { success: true, message: added ? 'ถูกใจกระทู้แล้ว' : 'ยกเลิกถูกใจแล้ว' };
  }

  async function toggleBookmark() {
    'use server';
    let actor;
    let topicId;
    try {
      actor = await requireUser();
      topicId = positiveInteger(id, 'topic id');
    } catch {
      return { success: false, message: 'กรุณาเข้าสู่ระบบอีกครั้ง' };
    }

    let connection;
    let added = false;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [topics] = await connection.query('SELECT id FROM topics WHERE id = ? FOR UPDATE', [topicId]);
      if (!topics[0]) throw new Error('Topic not found');

      const [existing] = await connection.query(
        'SELECT 1 AS found FROM bookmarks WHERE user_id = ? AND topic_id = ? LIMIT 1 FOR UPDATE',
        [actor.id, topicId],
      );
      if (existing.length > 0) {
        await connection.query('DELETE FROM bookmarks WHERE user_id = ? AND topic_id = ?', [actor.id, topicId]);
      } else {
        added = true;
        await connection.query('INSERT INTO bookmarks (user_id, topic_id) VALUES (?, ?)', [actor.id, topicId]);
      }
      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error('Toggle Bookmark Error:', error);
      return { success: false, message: 'บันทึกกระทู้ไม่สำเร็จ กรุณาลองใหม่' };
    } finally {
      connection?.release();
    }

    revalidatePath(`/topic/${topicId}`);
    revalidatePath('/profile/saved');
    return { success: true, message: added ? 'บันทึกกระทู้แล้ว' : 'นำออกจากรายการบันทึกแล้ว' };
  }
  async function deleteComment(formData) {
    'use server';
    const actor = await requireUser();
    const commentId = positiveInteger(formData.get('commentId'), 'comment id');
    const topicId = positiveInteger(id, 'topic id');
    const [comments] = await db.query('SELECT user_id FROM comments WHERE id = ? AND topic_id = ?', [commentId, topicId]);
    if (!comments[0] || (comments[0].user_id !== actor.id && !isAdminUser(actor))) throw new Error('Forbidden');
    await deleteCommentCascade(commentId);
    revalidatePath(`/topic/${topicId}`);
  }
  async function submitReport(formData) { 
    'use server'; 
    const actor = await requireUser();
    await enforceRateLimit(`report:${actor.id}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    const targetId = positiveInteger(formData.get('targetId'), 'report target');
    const type = formData.get('type'); 
    const reason = requiredText(formData.get('reason'), 'reason', { min: 3, max: 500 });
    
    if (type === 'topic') { 
      const [targets] = await db.query('SELECT id FROM topics WHERE id = ?', [targetId]);
      if (!targets[0]) throw new Error('Invalid report target');
      await db.query('INSERT INTO reports (reporter_id, topic_id, reason) VALUES (?, ?, ?)', [actor.id, targetId, reason]);
    } else if (type === 'comment') { 
      const [targets] = await db.query('SELECT id FROM comments WHERE id = ?', [targetId]);
      if (!targets[0]) throw new Error('Invalid report target');
      await db.query('INSERT INTO reports (reporter_id, comment_id, reason) VALUES (?, ?, ?)', [actor.id, targetId, reason]);
    } else throw new Error('Invalid report type');

    // 🚀 ยิง Pusher แจ้งเตือน Admin/Super Admin ทุกคนแบบ Real-time
    try {
      const [admins] = await db.query("SELECT id FROM users WHERE role IN ('admin', 'super_admin')");
      for (const admin of admins) {
         await pusherServer.trigger(notificationChannelName(admin.id), 'new-notification', {
            message: `🚨 มีรายการ Report ใหม่รอตรวจสอบ: ${reason}`,
            link: '/admin', // กดที่กระดิ่งแล้วเด้งไปหน้าแอดมินเลย
            created_at: new Date().toISOString()
         });
      }
    } catch (error) {
      console.error("Pusher Report Error:", error);
    }
  }
  // --- Render UI ---
  return (
    <div className="p-8 pl-6 md:pl-8 max-w-7xl mx-auto">
          {/* CSS สำหรับ Syntax Highlighter */}
          <style dangerouslySetInnerHTML={{__html: `
            .view-ql-editor pre.ql-syntax {
                background-color: #282c34 !important;
                color: #abb2bf !important;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                font-family: monospace;
                margin-top: 1em;
                margin-bottom: 1em;
                border: 1px solid #3e4451;
            }
          `}} />

          <ViewCounter topicId={id} />

          {/* Header Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors dark:text-gray-400 dark:hover:text-red-400">&larr; กลับหน้าหลัก</Link>
            <div className="flex gap-3 items-center">
                {currentUser && <ReportButton targetId={id} type="topic" reportAction={submitReport} />}
                {isOwner && <Link href={`/edit/${id}`} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-500 hover:text-white transition border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-700">✏️ แก้ไข</Link>}
                {(isOwner || isAdmin) && <form action={deleteTopic}><button type="submit" className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-700">🗑️ {isAdmin && !isOwner ? 'ลบ (Admin)' : 'ลบกระทู้นี้'}</button></form>}
            </div>
          </div>

          {/* Topic Card Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 relative dark:bg-neutral-900 dark:border-neutral-800">
            {/* Topic Header Area */}
            <div className="bg-gray-900 p-8 text-white relative overflow-hidden dark:bg-black">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-[80px] opacity-50"></div>
               <span className="inline-block bg-red-600 text-xs font-bold px-2 py-1 rounded mb-4">{topic.category}</span>
               <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{topic.title}</h1>
               <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm mt-4 dark:text-gray-500">
                 <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-white">
                   👤 {topic.username || 'ไม่ระบุ'}
                   {/* แสดงยศตาม XP */}
                   <UserBadge role={topic.role} xp={topic.xp} />
                 </span>
                 <span className="flex items-center gap-1">📅 {new Date(topic.created_at).toLocaleDateString('th-TH')}</span>
                 <span className="flex items-center gap-1 font-bold text-yellow-400">👁️ {topic.views.toLocaleString()} ครั้ง</span>
               </div>
            </div>

            {/* Topic Content Body */}
            <div className="p-8 min-h-[200px] border-b border-gray-100 dark:border-neutral-800">
              {topic.image_url && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm inline-block max-w-full dark:border-neutral-700">
                   <Image src={topic.image_url} alt={`ภาพประกอบกระทู้ ${topic.title}`} width={1200} height={800} sizes="(max-width: 1024px) 100vw, 900px" loading="eager" className="max-h-[500px] w-auto h-auto object-contain bg-gray-50 dark:bg-black" />
                </div>
              )}
              
              {/* Content with Syntax Highlighting */}
              <div 
                className="view-ql-editor text-lg leading-relaxed text-gray-700 prose max-w-none dark:text-gray-300 dark:prose-invert" 
                dangerouslySetInnerHTML={{ __html: topic.content }} 
              />
              
              {/* ✅ แสดงโพล (ถ้ากระทู้นี้มีโพล) */}
              {poll && (
                 <div className="mt-8">
                    <PollUI 
                        poll={poll} 
                        options={pollOptions} 
                        userVote={userVote} 
                        currentUser={currentUser} 
                    />
                 </div>
              )}

              {/* Action Buttons (Like / Bookmark) */}
              <TopicEngagementActions
                isAuthenticated={Boolean(currentUser)}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                likeCount={likeCount}
                likeAction={toggleLike}
                bookmarkAction={toggleBookmark}
              />
            </div>
          </div>

          {/* Comments Section */}
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

          {/* Comment Form */}
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

          {/* Related Topics */}
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
  );
}
