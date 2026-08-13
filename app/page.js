import Link from 'next/link';
import React from 'react';
import db from '../lib/db'; 
import TopicCard from '../components/TopicCard'; 

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || '').trim().slice(0, 100);
  const requestedCategory = String(params?.category || '');
  const allowedCategories = new Set(['Hardware', 'Software', 'Network', 'AI & Data', 'General']);
  const category = allowedCategories.has(requestedCategory) ? requestedCategory : '';
  const parsedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10_000) : 1;
  const pageSize = 9; 
  const offset = (page - 1) * pageSize;

  // ฟังก์ชันสร้าง Link (รักษาค่า Search/Category เดิมไว้)
  const buildLink = (newSort, newPage) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    
    // จัดการ Sort
    const currentSort = params?.sort || 'latest'; 
    if (newSort) {
        q.set('sort', newSort);
    } else if (currentSort) {
        q.set('sort', currentSort); 
    }
    
    // จัดการ Page
    if (newPage > 1) q.set('page', newPage);
    
    return `/?${q.toString()}`;
  };

  const requestedSort = params?.sort || 'latest';
  const sort = ['latest', 'popular', 'likes'].includes(requestedSort) ? requestedSort : 'latest';

  // --- SQL Logic ---
  const conditions = [];
  const sqlParams = [];

  if (search) {
    conditions.push('title LIKE ?');
    sqlParams.push(`%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    sqlParams.push(category);
  }

  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = ' WHERE ' + conditions.join(' AND ');
  }

  let orderBy = 'topics.created_at DESC';
  let joinLikes = '';
  let selectLikeCount = '';
  let groupBy = '';

  if (sort === 'popular') {
    orderBy = 'topics.views DESC, topics.created_at DESC';
  } else if (sort === 'likes') {
    // ✅ ใช้วิธี Subquery แทนการ JOIN เพื่อหลีกเลี่ยงกฎ GROUP BY
    selectLikeCount = ', (SELECT COUNT(*) FROM likes WHERE likes.topic_id = topics.id) as like_count';
    joinLikes = ''; // ปล่อยว่างไว้ ไม่ต้อง JOIN
    groupBy = '';   // ปล่อยว่างไว้ ไม่ต้องใช้ GROUP BY แล้ว
    orderBy = 'like_count DESC, topics.created_at DESC';
  }

  const countSql = `SELECT COUNT(DISTINCT topics.id) as total FROM topics ${joinLikes} ${whereClause}`;
  const sql = `
    SELECT topics.*, users.username ${selectLikeCount}
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id
    ${joinLikes}
    ${whereClause}
    ${groupBy}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  
  const queryParams = [...sqlParams, pageSize, offset];
  const [countResult, topicsResult, siteStatsResult, popularCategoriesResult] = await Promise.all([
    db.query(countSql, sqlParams),
    db.query(sql, queryParams),
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM topics) AS total_topics,
        (SELECT COUNT(*) FROM users WHERE is_banned = 0) AS total_members,
        (SELECT COUNT(*) FROM users WHERE is_banned = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS new_members
    `),
    db.query(`
      SELECT category, COUNT(*) AS topic_count
      FROM topics
      WHERE category IN ('Hardware', 'Software', 'Network', 'AI & Data', 'General')
      GROUP BY category
      ORDER BY topic_count DESC, category ASC
      LIMIT 5
    `),
  ]);
  const totalTopics = Number(countResult[0][0].total);
  const totalPages = Math.ceil(totalTopics / pageSize);
  const topics = topicsResult[0];
  const siteStats = siteStatsResult[0][0] || {};
  const popularCategories = popularCategoriesResult[0] || [];
  const numberFormat = new Intl.NumberFormat('th-TH');

  return (
    <div className="p-8 pl-6 md:pl-8 max-w-7xl mx-auto"> 
      
      {/* Banner (แสดงเฉพาะหน้าแรก ตอนไม่ค้นหา) */}
      {!search && !category && page === 1 && sort === 'latest' && (
        <section className="w-full h-72 rounded-2xl overflow-hidden relative mb-10 group shadow-xl border border-gray-200 dark:border-neutral-800">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-red-900 to-black animate-gradient-flow"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/90 to-transparent"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
            <span className="text-red-500 font-bold tracking-[0.2em] text-sm mb-2 animate-pulse bg-black/60 px-3 py-1 rounded-full border border-red-500/30 shadow-lg backdrop-blur-sm">
              HOT TOPIC
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-2xl tracking-tight">
              อัปเดตเทรนด์ <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">AI & Technology</span>
            </h1>
            <p className="text-gray-300 max-w-lg drop-shadow-md font-medium">
              ร่วมพูดคุย แลกเปลี่ยนความรู้ด้านไอที ฮาร์ดแวร์ และนวัตกรรมใหม่ๆ ได้ที่นี่
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ฝั่งซ้าย: เนื้อหากระทู้ */}
        <div className="lg:col-span-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-600 pl-4 flex items-center gap-2 dark:text-white">
                {search ? `ผลการค้นหา: "${search}"` : category ? `หมวดหมู่: ${category}` : 'รายการกระทู้'}
                <span className="text-sm text-gray-400 font-normal ml-2">(หน้า {page})</span>
              </h2>

              {/* ปุ่ม Sort: เพิ่ม scroll={false} เพื่อไม่ให้เด้งขึ้นบน */}
              <div className="flex bg-white dark:bg-neutral-900 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
                 <Link 
                    href={buildLink('latest', 1)} 
                    scroll={false} 
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sort === 'latest' ? 'bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                 >
                   🕒 ล่าสุด
                 </Link>
                 <Link 
                    href={buildLink('popular', 1)} 
                    scroll={false}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sort === 'popular' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                 >
                   🔥 ยอดนิยม
                 </Link>
                 <Link 
                    href={buildLink('likes', 1)} 
                    scroll={false}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sort === 'likes' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                 >
                   ❤️ มาแรง
                 </Link>
              </div>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {topics.length > 0 ? (
              topics.map((topic, index) => (
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
              <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400">
                ไม่พบข้อมูล...
              </div>
            )}
          </section>

          {/* Pagination: เพิ่ม scroll={false} */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 mb-12">
              {page > 1 ? (
                <Link 
                    href={buildLink(sort, page - 1)} 
                    scroll={false}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                    &larr; ก่อนหน้า
                </Link>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-600">&larr; ก่อนหน้า</span>
              )}
              
              <span className="font-bold text-gray-600 dark:text-gray-300">หน้า {page} / {totalPages}</span>
              
              {page < totalPages ? (
                <Link 
                    href={buildLink(sort, page + 1)} 
                    scroll={false}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                    ถัดไป &rarr;
                </Link>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-600">ถัดไป &rarr;</span>
              )}
            </div>
          )}
        </div>

        {/* Sidebar ขวา (สถิติ) */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-6 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 dark:text-white dark:border-neutral-700">📊 สถิติเว็บไซต์</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">กระทู้ทั้งหมด</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{numberFormat.format(Number(siteStats.total_topics || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">สมาชิก</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{numberFormat.format(Number(siteStats.total_members || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">สมาชิกใหม่ 7 วัน</span>
                  <span className="font-bold text-green-600 dark:text-green-400">+{numberFormat.format(Number(siteStats.new_members || 0))}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl shadow-md text-white dark:bg-neutral-800">
              <h3 className="font-bold mb-4 flex items-center gap-2">🔥 หมวดหมู่ยอดนิยม</h3>
              <div className="flex flex-wrap gap-2">
                {popularCategories.length > 0 ? popularCategories.map((item) => (
                  <Link
                    key={item.category}
                    href={{ pathname: '/', query: { category: item.category } }}
                    className="bg-gray-700 hover:bg-red-600 px-3 py-1 rounded-full text-xs transition-colors dark:bg-neutral-700 dark:hover:bg-red-600"
                  >
                    {item.category} · {numberFormat.format(Number(item.topic_count))}
                  </Link>
                )) : <span className="text-sm text-gray-300">ยังไม่มีข้อมูลหมวดหมู่</span>}
              </div>
            </div>

              <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-xl shadow-md text-white text-center">
                <h3 className="font-bold text-lg mb-2">มีเรื่องไอทีอยากแบ่งปัน?</h3>
                <p className="text-sm mb-4 opacity-90">เริ่มกระทู้ใหม่เพื่อถาม ตอบ หรือส่งต่อความรู้ให้ชุมชน</p>
                <Link href="/create" className="block bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-100 transition">สร้างกระทู้</Link>
              </div>
          </div>
        </div>

      </div>

    </div>
  );
}
