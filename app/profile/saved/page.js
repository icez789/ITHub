import React from 'react';
// import Navbar from '../../../components/Navbar'; <-- ลบออกตามสูตร
import Footer from '../../../components/Footer';
import db from '../../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import TopicCard from '../../../components/TopicCard';

export default async function SavedTopicsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  // 1. เช็ค Session
  if (!session) redirect('/login');
  
  // 2. ป้องกัน Error กรณีคุกกี้พัง
  let user;
  try {
    user = JSON.parse(session.value);
  } catch (error) {
    redirect('/login');
  }

  // 3. ดึงข้อมูลกระทู้ที่ User นี้กด Bookmark ไว้
  // (ต้อง JOIN ตาราง topics กับ bookmarks เพื่อเอาข้อมูลกระทู้มาโชว์)
  const [savedTopics] = await db.query(`
    SELECT topics.*, users.username 
    FROM bookmarks
    JOIN topics ON bookmarks.topic_id = topics.id
    LEFT JOIN users ON topics.user_id = users.id
    WHERE bookmarks.user_id = ?
    ORDER BY bookmarks.created_at DESC
  `, [user.id]);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/profile" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-2xl transition-colors">
                &larr;
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 border-l-8 border-blue-600 pl-4 dark:text-white dark:border-blue-500">
                🔖 กระทู้ที่บันทึกไว้
            </h1>
        </div>

        {/* รายการกระทู้ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {savedTopics.length > 0 ? (
                savedTopics.map((topic, index) => (
                    <TopicCard 
                        key={topic.id} 
                        index={index}
                        id={topic.id} 
                        title={topic.title}
                        username={topic.username}
                        created_at={topic.created_at}
                        image_url={topic.image_url}
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
        </div>

        <Footer />
    </div>
  );
}