import Link from 'next/link';
import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import db from '../lib/db'; 
import TopicCard from '../components/TopicCard'; 

export default async function HomePage({ searchParams }) {
  // 1. รับค่า Params
  const params = await searchParams;
  const search = params?.search || '';
  const category = params?.category || '';
  const page = parseInt(params?.page || '1'); 
  const sort = params?.sort || 'latest'; // รับค่า sort (default: latest)
  
  const pageSize = 9; 
  const offset = (page - 1) * pageSize;

  // --- ฟังก์ชันช่วยสร้าง Link (เพื่อให้กด Sort แล้ว Search/Category ไม่หาย) ---
  const buildLink = (newSort, newPage) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (newSort) q.set('sort', newSort);
    if (newPage > 1) q.set('page', newPage);
    return `/?${q.toString()}`;
  };

  // --- เตรียม SQL ---
  const conditions = [];
  const sqlParams = [];

  if (search) {
    conditions.push('topics.title LIKE ?'); // ระบุตาราง topics.title กันสับสน
    sqlParams.push(`%${search}%`);
  }
  if (category) {
    conditions.push('topics.category = ?');
    sqlParams.push(category);
  }

  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = ' WHERE ' + conditions.join(' AND ');
  }

  // --- Logic การเลือก ORDER BY ---
  let orderBy = 'topics.created_at DESC'; // ค่าเริ่มต้น (ล่าสุด)
  let joinLikes = '';
  let selectLikeCount = '';
  let groupBy = '';

  if (sort === 'popular') {
    // เรียงตามยอดวิว
    orderBy = 'topics.views DESC, topics.created_at DESC';
  } else if (sort === 'likes') {
    // เรียงตามยอดไลก์ (ต้อง JOIN และนับ)
    selectLikeCount = ', COUNT(likes.user_id) as like_count';
    joinLikes = 'LEFT JOIN likes ON topics.id = likes.topic_id';
    groupBy = 'GROUP BY topics.id';
    orderBy = 'like_count DESC, topics.created_at DESC';
  }

  // Query 1: นับจำนวนรวม
  const countSql = `SELECT COUNT(DISTINCT topics.id) as total FROM topics ${joinLikes} ${whereClause}`;
  const [countResult] = await db.query(countSql, sqlParams);
  const totalTopics = countResult[0].total;
  const totalPages = Math.ceil(totalTopics / pageSize);

  // Query 2: ดึงข้อมูลจริง
  let sql = `
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
  const [topics] = await db.query(sql, queryParams);

  const hotTags = ['#AI', '#NVIDIA', '#React', '#CyberSecurity'];

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
        <Navbar />
        
        <div className="flex-1 overflow-y-auto p-8 pl-6 md:pl-8">
          
          {/* Banner */}
          {!search && !category && page === 1 && sort === 'latest' && (
            <section className="w-full h-72 rounded-2xl overflow-hidden relative mb-10 group shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent"></div>
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
                <span className="text-red-500 font-bold tracking-[0.2em] text-sm mb-2 animate-pulse">HOT TOPIC</span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                  อัปเดตเทรนด์ <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">AI & Technology</span>
                </h1>
                <p className="text-gray-400 max-w-lg">ร่วมพูดคุย แลกเปลี่ยนความรู้ด้านไอที ฮาร์ดแวร์ และนวัตกรรมใหม่ๆ ได้ที่นี่</p>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            
            {/* ฝั่งซ้าย: เนื้อหา */}
            <div className="lg:col-span-3">
              
              {/* Header + Sorting Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                 <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-600 pl-4 flex items-center gap-2 dark:text-white">
                   {search ? `ผลการค้นหา: "${search}"` : category ? `หมวดหมู่: ${category}` : 'รายการกระทู้'}
                   <span className="text-sm text-gray-400 font-normal ml-2">(หน้า {page})</span>
                 </h2>

                 {/* ปุ่มตัวเลือกการเรียงลำดับ */}
                 <div className="flex bg-white dark:bg-neutral-900 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
                    <Link 
                      href={buildLink('latest', 1)} 
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sort === 'latest' ? 'bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                      🕒 ล่าสุด
                    </Link>
                    <Link 
                      href={buildLink('popular', 1)} 
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${sort === 'popular' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                      🔥 ยอดนิยม
                    </Link>
                    <Link 
                      href={buildLink('likes', 1)} 
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 mb-12">
                  {page > 1 ? (
                    <Link href={buildLink(sort, page - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800">&larr; ก่อนหน้า</Link>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-600">&larr; ก่อนหน้า</span>
                  )}
                  <span className="font-bold text-gray-600 dark:text-gray-300">หน้า {page} / {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={buildLink(sort, page + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800">ถัดไป &rarr;</Link>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-600">ถัดไป &rarr;</span>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar ขวา */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 dark:bg-neutral-900 dark:border-neutral-800">
                  <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 dark:text-white dark:border-neutral-700">📊 สถิติเว็บไซต์</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">กระทู้ทั้งหมด</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{totalTopics}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">สมาชิก</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">99+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">ออนไลน์</span>
                      <span className="font-bold text-green-500">● 5</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-xl shadow-md text-white dark:bg-neutral-800">
                  <h3 className="font-bold mb-4 flex items-center gap-2">🔥 แท็กมาแรง</h3>
                  <div className="flex flex-wrap gap-2">
                    {hotTags.map(tag => (
                      <span key={tag} className="bg-gray-700 hover:bg-red-600 px-3 py-1 rounded-full text-xs cursor-pointer transition-colors dark:bg-neutral-700 dark:hover:bg-red-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                 <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-xl shadow-md text-white text-center">
                    <h3 className="font-bold text-lg mb-2">กิจกรรมใหม่!</h3>
                    <p className="text-sm mb-4 opacity-90">ประกวดจัดสเปคคอมชิงรางวัล</p>
                    <button className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-100 transition">คลิกเลย</button>
                 </div>
              </div>
            </div>

          </div>

          <footer className="w-full border-t border-gray-200 py-8 text-center text-gray-500 text-sm mt-12 dark:bg-black dark:border-neutral-800 dark:text-gray-400">
            © 2025 <span className="font-bold text-red-600">IT TECHBOARD</span>. All rights reserved.
          </footer>

        </div>
      </main>
    </div>
  );
}