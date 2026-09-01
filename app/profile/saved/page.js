import React from 'react';
// import Navbar from '../../../components/Navbar'; <-- ลบออกตามสูตร
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import Link from 'next/link';
import TopicCard from '../../../components/TopicCard';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { plainText } from '../../../lib/content';

export default async function SavedTopicsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // 3. ดึงข้อมูลกระทู้ที่ User นี้กด Bookmark ไว้
  // (ต้อง JOIN ตาราง topics กับ bookmarks เพื่อเอาข้อมูลกระทู้มาโชว์)
  const [savedTopics] = await db.query(`
    SELECT topics.*, users.username,
      (SELECT COUNT(*) FROM comments WHERE comments.topic_id = topics.id) AS comment_count,
      (SELECT COUNT(*) FROM likes WHERE likes.topic_id = topics.id) AS like_count
    FROM bookmarks
    JOIN topics ON bookmarks.topic_id = topics.id
    LEFT JOIN users ON topics.user_id = users.id
    WHERE bookmarks.user_id = ?
    ORDER BY bookmarks.created_at DESC
  `, [user.id]);

  return (
    <main className="ithub-page-container mx-auto max-w-4xl pb-24 pt-8 md:pb-12 md:pt-12">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/profile" aria-label="กลับไปหน้าโปรไฟล์" className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-primary)]">
                <ArrowLeft aria-hidden="true" size={20} />
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-[var(--app-text)]">
                <Bookmark aria-hidden="true" className="text-blue-600" size={26} /> กระทู้ที่บันทึกไว้
            </h1>
        </div>

        {/* รายการกระทู้ */}
        <section aria-label="รายการกระทู้ที่บันทึกไว้" className="mb-12 space-y-3">
            {savedTopics.length > 0 ? (
                savedTopics.map((topic, index) => (
                    <TopicCard 
                        key={topic.id} 
                        index={index}
                        id={topic.id} 
                        title={topic.title}
                        category={topic.category}
                        excerpt={plainText(topic.content).slice(0, 180)}
                        username={topic.username}
                        createdAt={topic.created_at}
                        imageUrl={topic.image_url}
                        views={topic.views}
                        commentCount={topic.comment_count}
                        likeCount={topic.like_count}
                        isPinned={Boolean(topic.is_pinned)}
                        isLocked={Boolean(topic.is_locked)}
                    />
                ))
            ) : (
                <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-gray-300 dark:border-neutral-800">
                    <p className="text-lg">คุณยังไม่มีกระทู้ที่บันทึกไว้</p>
                    <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block dark:text-blue-400">
                        ไปสำรวจกระทู้น่าสนใจ
                    </Link>
                </div>
            )}
        </section>

    </main>
  );
}
