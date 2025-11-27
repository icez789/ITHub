import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก (Layout จัดการให้แล้ว)
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  // 1. เช็คว่าล็อกอินไหม
  if (!session) redirect('/login');
  
  const currentUser = JSON.parse(session.value);
  
  // 2. เช็คว่าเป็น Admin จริงไหม (Double Check กับ DB)
  const [adminCheck] = await db.query('SELECT role FROM users WHERE id = ?', [currentUser.id]);
  if (!adminCheck[0] || adminCheck[0].role !== 'admin') {
    redirect('/'); // ถ้าไม่ใช่ Admin ดีดกลับหน้าแรกทันที
  }

  // 3. ดึงสถิติ
  const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
  const [topicCount] = await db.query('SELECT COUNT(*) as count FROM topics');
  const [commentCount] = await db.query('SELECT COUNT(*) as count FROM comments');

  // 4. ดึง User
  const [users] = await db.query('SELECT * FROM users ORDER BY created_at DESC');

  // 5. ดึงรายการแจ้งปัญหา (Reports)
  const [reports] = await db.query(`
    SELECT r.*, 
           reporter.username as reporter_name,
           t.title as topic_title,
           c.content as comment_content
    FROM reports r
    LEFT JOIN users reporter ON r.reporter_id = reporter.id
    LEFT JOIN topics t ON r.topic_id = t.id
    LEFT JOIN comments c ON r.comment_id = c.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `);

  // --- Server Actions ---
  
  async function toggleBan(formData) {
    'use server';
    const userId = formData.get('userId');
    const currentStatus = formData.get('currentStatus') === '1'; 
    const newStatus = !currentStatus;
    await db.query('UPDATE users SET is_banned = ? WHERE id = ?', [newStatus, userId]);
    revalidatePath('/admin');
  }

  async function resolveReport(formData) {
    'use server';
    const reportId = formData.get('reportId');
    await db.query("UPDATE reports SET status = 'resolved' WHERE id = ?", [reportId]);
    revalidatePath('/admin');
  }

  return (
    // ปรับ div นอกสุดให้เข้ากับ layout หลัก (เอา min-h-screen ออก)
    <div className="p-6 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
      
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 dark:text-white">
          <span className="text-4xl">🛡️</span> Admin Dashboard
        </h1>

        {/* --- ส่วนสถิติ (Stats) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">สมาชิกทั้งหมด</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{userCount[0].count}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">กระทู้ทั้งหมด</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{topicCount[0].count}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">คอมเมนต์ทั้งหมด</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{commentCount[0].count}</p>
          </div>
        </div>

        {/* --- รายการแจ้งปัญหา (Reports) --- */}
        {reports.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-10 border border-red-100 dark:bg-neutral-900 dark:border-red-900/30">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex justify-between items-center dark:bg-red-900/20 dark:border-red-900/30">
              <h3 className="font-bold text-red-700 flex items-center gap-2 dark:text-red-400">
                🚨 แจ้งปัญหาที่รอตรวจสอบ ({reports.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-red-50 text-red-700 uppercase font-bold dark:bg-red-900/10 dark:text-red-400">
                  <tr>
                    <th className="px-6 py-3">ประเภท</th>
                    <th className="px-6 py-3">เนื้อหาที่ถูกแจ้ง</th>
                    <th className="px-6 py-3">เหตุผล</th>
                    <th className="px-6 py-3">ผู้แจ้ง</th>
                    <th className="px-6 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-neutral-800">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-red-50/50 transition dark:hover:bg-neutral-800">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${r.topic_id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                          {r.topic_id ? 'กระทู้' : 'คอมเมนต์'}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate font-medium dark:text-gray-300">
                        {r.topic_id ? (
                          <Link href={`/topic/${r.topic_id}`} target="_blank" className="hover:underline text-blue-600 dark:text-blue-400">
                            {r.topic_title || '(กระทู้อาจถูกลบไปแล้ว)'} ↗
                          </Link>
                        ) : (
                          <span className="italic">"{r.comment_content || '(คอมเมนต์ถูกลบ)'}"</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-red-600 font-bold dark:text-red-400">{r.reason}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{r.reporter_name}</td>
                      <td className="px-6 py-4 text-center">
                        <form action={resolveReport}>
                          <input type="hidden" name="reportId" value={r.id} />
                          <button 
                            type="submit" 
                            className="px-3 py-1 rounded text-xs font-bold bg-green-500 text-white hover:bg-green-600 shadow-sm transition"
                          >
                            ✅ เคลียร์
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ตารางรายชื่อสมาชิก --- */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden dark:bg-neutral-900 dark:border dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center dark:bg-neutral-800 dark:border-neutral-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">📋 รายชื่อผู้ใช้งาน</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase font-bold dark:bg-neutral-950 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Posts</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-600">#{u.id}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 dark:bg-neutral-700 dark:text-gray-300">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full rounded-full object-cover"/> 
                          ) : u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold dark:text-gray-200">{u.username}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-center dark:text-gray-300">{u.post_count}</td>
                    <td className="px-6 py-4 text-center">
                      {u.is_banned ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">🔴 Banned</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">🟢 Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.id !== currentUser.id && (
                        <form action={toggleBan}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="currentStatus" value={u.is_banned ? '1' : '0'} />
                          <button 
                            type="submit" 
                            className={`px-3 py-1 rounded text-xs font-bold transition shadow-sm ${u.is_banned ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                          >
                            {u.is_banned ? '🔓 ปลดแบน' : '🚫 แบน'}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}