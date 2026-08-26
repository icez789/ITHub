import React from 'react';
import db from '../../../lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, CalendarDays, Edit3, Eye, Flame, MessageCircle, Send, Trash2, UserRound } from 'lucide-react';

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
            message: `มีรายการรายงานใหม่รอตรวจสอบ: ${reason}`,
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
    <main className="ithub-page-container mx-auto max-w-[1120px] pb-24 pt-6 md:pb-12 md:pt-8">
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-primary)]"><ArrowLeft aria-hidden="true" size={17} /> กลับหน้าหลัก</Link>
            <div className="flex flex-wrap items-center gap-2">
                {currentUser && <ReportButton targetId={id} type="topic" reportAction={submitReport} />}
                {isOwner && <Link href={`/edit/${id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><Edit3 aria-hidden="true" size={16} /> แก้ไข</Link>}
                {(isOwner || isAdmin) && <form action={deleteTopic}><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><Trash2 aria-hidden="true" size={16} /> {isAdmin && !isOwner ? 'ลบในฐานะแอดมิน' : 'ลบกระทู้'}</button></form>}
            </div>
          </div>

          {/* Topic Card Container */}
          <article className="mb-10 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            {/* Topic Header Area */}
            <header className="border-b border-[var(--app-border)] bg-zinc-950 px-5 py-7 text-white sm:px-8 sm:py-9">
               <span className="mb-3 inline-block rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold">{topic.category}</span>
               <h1 className="max-w-[860px] text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">{topic.title}</h1>
               <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-300">
                 <span className="flex items-center gap-1.5">
                   <UserRound aria-hidden="true" size={15} /> {topic.username || 'ไม่ระบุ'}
                   {/* แสดงยศตาม XP */}
                   <UserBadge role={topic.role} xp={topic.xp} />
                 </span>
                 <span className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={15} /> {new Date(topic.created_at).toLocaleDateString('th-TH')}</span>
                 <span className="flex items-center gap-1.5"><Eye aria-hidden="true" size={15} /> {topic.views.toLocaleString()} ครั้ง</span>
               </div>
            </header>

            {/* Topic Content Body */}
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="mx-auto max-w-[840px]">
              {topic.image_url && (
                <div className="mb-7 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)]">
                   <Image src={topic.image_url} alt={`ภาพประกอบกระทู้ ${topic.title}`} width={1200} height={800} sizes="(max-width: 1024px) 100vw, 840px" loading="eager" className="max-h-[520px] h-auto w-full object-contain" />
                </div>
              )}
              
              {/* Content with Syntax Highlighting */}
              <div 
                className="view-ql-editor prose max-w-none text-[17px] leading-8 text-[var(--app-text)] dark:prose-invert sm:text-lg"
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
                topicId={id}
                isAuthenticated={Boolean(currentUser)}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                likeCount={likeCount}
                likeAction={toggleLike}
                bookmarkAction={toggleBookmark}
              />
              </div>
            </div>
          </article>

          {/* Comments Section */}
          <section className="mx-auto mb-8 max-w-[840px]" aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--app-text)]"><MessageCircle aria-hidden="true" size={21} /> ความคิดเห็น <span className="text-[var(--app-text-muted)]">({allComments.length})</span></h2>
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
                <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] py-8 text-center text-[var(--app-text-muted)]">
                  ยังไม่มีความคิดเห็น... เป็นคนแรกที่ตอบกระทู้นี้สิ!
                </div>
              )}
            </div>
          </section>

          {/* Comment Form */}
          <section className="mx-auto max-w-[840px] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 sm:p-6" aria-labelledby="comment-form-heading">
            <h2 id="comment-form-heading" className="mb-4 text-lg font-bold text-[var(--app-text)]">แสดงความคิดเห็น</h2>
            {currentUser ? (
              <form action={addComment}>
                <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700">
                   <Editor className="h-32 mb-12 bg-white text-black" />
                </div>
                <RippleButton type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-primary)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--app-primary-hover)]"><Send aria-hidden="true" size={17} /> ส่งความคิดเห็น</RippleButton>
              </form>
            ) : (
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4 text-center">
                <p className="mb-2 text-sm text-[var(--app-text-muted)]">เข้าสู่ระบบเพื่อร่วมตอบคำถามและแลกเปลี่ยนกับชุมชน</p>
                <Link href={`/login?next=/topic/${id}`} className="font-semibold text-[var(--app-primary)] hover:underline">เข้าสู่ระบบเพื่อแสดงความคิดเห็น</Link>
              </div>
            )}
          </section>

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <section className="mx-auto mt-12 max-w-[840px] border-t border-[var(--app-border)] pt-8" aria-labelledby="related-heading">
              <h2 id="related-heading" className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--app-text)]">
                <Flame aria-hidden="true" size={21} /> กระทู้ที่เกี่ยวข้องในหมวด <span className="text-[var(--app-primary)]">{topic.category}</span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]">
                {relatedTopics.map((t, index) => (
                  <TopicCard key={t.id} index={index} id={t.id} title={t.title} category={t.category} username={t.username} createdAt={t.created_at} imageUrl={t.image_url} excerpt={plainText(t.content).slice(0, 120)} views={t.views || 0} commentCount={0} likeCount={0} />
                ))}
              </div>
            </section>
          )}
    </main>
  );
}
