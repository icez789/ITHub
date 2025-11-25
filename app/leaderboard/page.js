import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import db from '../../lib/db';
import Link from 'next/link';
import UserBadge from '../../components/UserBadge';

export default async function LeaderboardPage() {
  // ดึง Top 10 ผู้ใช้งานที่โพสต์เยอะที่สุด
  const [users] = await db.query('SELECT * FROM users ORDER BY post_count DESC LIMIT 10');

  // แยก 3 อันดับแรกออกมา
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300">
      <Navbar />
      
      <div className="container mx-auto p-6 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-12 mt-4">
          <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 drop-shadow-sm">
            🏆 Hall of Fame
          </h1>
          <p className="text-gray-500 dark:text-gray-400">สุดยอดนักเขียนประจำชุมชน IT Techboard</p>
        </div>

        {/* --- 🥇 Podium Section (3 อันดับแรก) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
          {/* อันดับ 2 (Silver) */}
          {top3[1] && (
            <div className="order-2 md:order-1 bg-white p-6 rounded-2xl shadow-lg border-b-4 border-gray-400 flex flex-col items-center transform hover:-translate-y-2 transition-transform dark:bg-neutral-900 dark:border-gray-600">
              <div className="text-4xl mb-2">🥈</div>
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-300 mb-3 bg-gray-100 flex items-center justify-center dark:border-gray-600 dark:bg-black">
                 {top3[1].avatar_url ? <img src={top3[1].avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold">{top3[1].username.charAt(0)}</span>}
              </div>
              <h2 className="font-bold text-lg text-gray-700 dark:text-gray-200">{top3[1].username}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{top3[1].post_count} โพสต์</p>
            </div>
          )}

          {/* อันดับ 1 (Gold) - ใหญ่สุด */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-white p-8 rounded-2xl shadow-xl border-b-4 border-yellow-400 flex flex-col items-center transform hover:-translate-y-3 transition-transform relative overflow-hidden dark:bg-neutral-900 dark:border-yellow-600 z-10">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-yellow-200 to-yellow-500"></div>
              <div className="text-6xl mb-2 animate-bounce">👑</div>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 mb-3 bg-yellow-50 flex items-center justify-center shadow-lg dark:bg-black">
                 {top3[0].avatar_url ? <img src={top3[0].avatar_url} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold">{top3[0].username.charAt(0)}</span>}
              </div>
              <h2 className="font-bold text-2xl text-gray-800 dark:text-white">{top3[0].username}</h2>
              <UserBadge role={top3[0].role} postCount={top3[0].post_count} />
              <p className="text-red-600 font-bold mt-2 text-lg dark:text-red-400">{top3[0].post_count} โพสต์</p>
            </div>
          )}

          {/* อันดับ 3 (Bronze) */}
          {top3[2] && (
            <div className="order-3 bg-white p-6 rounded-2xl shadow-lg border-b-4 border-orange-700 flex flex-col items-center transform hover:-translate-y-2 transition-transform dark:bg-neutral-900 dark:border-orange-900">
              <div className="text-4xl mb-2">🥉</div>
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-orange-300 mb-3 bg-orange-50 flex items-center justify-center dark:border-orange-900 dark:bg-black">
                 {top3[2].avatar_url ? <img src={top3[2].avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold">{top3[2].username.charAt(0)}</span>}
              </div>
              <h2 className="font-bold text-lg text-gray-700 dark:text-gray-200">{top3[2].username}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{top3[2].post_count} โพสต์</p>
            </div>
          )}
        </div>

        {/* --- 📋 List Section (อันดับ 4-10) --- */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:border dark:border-neutral-800">
          {rest.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm uppercase dark:bg-black dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 w-16 text-center">#</th>
                  <th className="px-6 py-3">สมาชิก</th>
                  <th className="px-6 py-3 text-right">จำนวนโพสต์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {rest.map((u, index) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition dark:hover:bg-neutral-800">
                    <td className="px-6 py-4 text-center font-bold text-gray-400 dark:text-gray-500">
                      {index + 4}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-bold dark:bg-neutral-700">
                         {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">{u.username}</span>
                      <UserBadge role={u.role} postCount={u.post_count} />
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                      {u.post_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">
              ยังไม่มีข้อมูลอันดับเพิ่มเติม
            </div>
          )}
        </div>

      </div>
      <Footer />
    </div>
  );
}