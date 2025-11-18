import Link from 'next/link';
import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import db from '../lib/db'; 
import TopicCard from '../components/TopicCard'; 

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const search = params?.search || '';
  const category = params?.category || '';
  const page = parseInt(params?.page || '1'); 
  const pageSize = 9; // ปรับเป็น 9 เพื่อให้หาร 3 ลงตัวสวยๆ (3x3)
  const offset = (page - 1) * pageSize;

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

  const countSql = `SELECT COUNT(*) as total FROM topics ${whereClause}`;
  const [countResult] = await db.query(countSql, sqlParams);
  const totalTopics = countResult[0].total;
  const totalPages = Math.ceil(totalTopics / pageSize);

  let sql = `
    SELECT topics.*, users.username 
    FROM topics 
    LEFT JOIN users ON topics.user_id = users.id
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const queryParams = [...sqlParams, pageSize, offset];
  const [topics] = await db.query(sql, queryParams);

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <Navbar />
        
        <div className="flex-1 overflow-y-auto p-8 pl-6 md:pl-8">
          
          {!search && !category && page === 1 && (
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

          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-600 pl-4">
               {search ? `ผลการค้นหา: "${search}"` : category ? `หมวดหมู่: ${category}` : 'กระทู้ล่าสุด'}
               <span className="text-sm text-gray-400 font-normal ml-2">(หน้า {page} จาก {totalPages || 1})</span>
             </h2>
             
             {(search || category) && (
               <Link href="/" className="text-red-600 hover:underline text-sm">
                 &larr; ดูทั้งหมด
               </Link>
             )}
          </div>

          {/* แก้ไข Grid ตรงนี้: เปลี่ยนเป็น lg:grid-cols-3 และเพิ่ม gap-8 */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
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
              <div className="col-span-full text-center py-20 text-gray-500">
                ไม่พบข้อมูล...
              </div>
            )}
          </section>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 mb-12">
              {page > 1 ? (
                <Link href={`/?page=${page - 1}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm">&larr; ก่อนหน้า</Link>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed">&larr; ก่อนหน้า</span>
              )}
              <span className="font-bold text-gray-600">หน้า {page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={`/?page=${page + 1}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-sm">ถัดไป &rarr;</Link>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed">ถัดไป &rarr;</span>
              )}
            </div>
          )}

          <footer className="w-full border-t border-gray-200 py-8 text-center text-gray-500 text-sm">
            © 2025 <span className="font-bold text-red-600">IT TECHBOARD</span>. All rights reserved.
          </footer>

        </div>
      </main>
    </div>
  );
}