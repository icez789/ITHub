import React from 'react';
// import Navbar from '../../components/Navbar'; <-- ลบออก
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  if (!session) redirect('/login');
  
  const currentUser = JSON.parse(session.value);
  
  const [userCheck] = await db.query('SELECT role FROM users WHERE id = ?', [currentUser.id]);
  const myRole = userCheck[0]?.role;

  if (myRole !== 'admin' && myRole !== 'super_admin') {
    redirect('/'); 
  }

  const isSuperAdmin = myRole === 'super_admin';

  // --- Queries ---
  const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
  const [topicCount] = await db.query('SELECT COUNT(*) as count FROM topics');
  const [commentCount] = await db.query('SELECT COUNT(*) as count FROM comments');
  
  // ✅ แก้ไขตรงนี้: เปลี่ยนจาก ' เป็น ` (Backtick) เพื่อให้เขียนหลายบรรทัดได้
  const [users] = await db.query(`
    SELECT * FROM users ORDER BY 
    CASE WHEN role = 'super_admin' THEN 1 WHEN role = 'admin' THEN 2 ELSE 3 END, 
    created_at DESC
  `);
  
  const [reports] = await db.query(`
    SELECT r.*, reporter.username as reporter_name, t.title as topic_title, c.content as comment_content
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
    if (!isSuperAdmin) {
       const targetId = formData.get('userId');
       const [target] = await db.query('SELECT role FROM users WHERE id = ?', [targetId]);
       if (target[0].role === 'super_admin') return;
    }

    const userId = formData.get('userId');
    const currentStatus = formData.get('currentStatus') === '1'; 
    const newStatus = !currentStatus;
    await db.query('UPDATE users SET is_banned = ? WHERE id = ?', [newStatus, userId]);
    revalidatePath('/admin');
  }

  async function toggleAdmin(formData) {
    'use server';
    if (!isSuperAdmin) {
       const targetId = formData.get('userId');
       const [target] = await db.query('SELECT role FROM users WHERE id = ?', [targetId]);
       if (target[0].role === 'super_admin') return;
    }

    const userId = formData.get('userId');
    const currentRole = formData.get('currentRole');
    
    if (currentRole === 'super_admin') return;

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);
    revalidatePath('/admin');
  }

  async function resolveReport(formData) {
    'use server';
    const reportId = formData.get('reportId');
    await db.query("UPDATE reports SET status = 'resolved' WHERE id = ?", [reportId]);
    revalidatePath('/admin');
  }

  return (
    <div className="p-6 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 dark:text-white">
          <span className="text-4xl">🛡️</span> Admin Dashboard 
          {isSuperAdmin && <span className="text-sm bg-yellow-500 text-black px-2 py-1 rounded font-extrabold">SUPER ADMIN</span>}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">สมาชิก</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{userCount[0].count}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">กระทู้</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{topicCount[0].count}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 dark:bg-neutral-900 dark:border-neutral-800">
            <h3 className="text-gray-500 text-sm font-bold uppercase dark:text-gray-400">คอมเมนต์</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-white">{commentCount[0].count}</p>
          </div>
        </div>

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
                    <th className="px-6 py-3">เนื้อหา</th>
                    <th className="px-6 py-3">เหตุผล</th>
                    <th className="px-6 py-3">ผู้แจ้ง</th>
                    <th className="px-6 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-neutral-800">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-red-50/50 transition dark:hover:bg-neutral-800">
                      <td className="px-6 py-4">{r.topic_id ? 'กระทู้' : 'คอมเมนต์'}</td>
                      <td className="px-6 py-4 max-w-xs truncate">{r.topic_title || r.comment_content}</td>
                      <td className="px-6 py-4 text-red-600 font-bold">{r.reason}</td>
                      <td className="px-6 py-4">{r.reporter_name}</td>
                      <td className="px-6 py-4 text-center">
                        <form action={resolveReport}>
                          <input type="hidden" name="reportId" value={r.id} />
                          <button type="submit" className="px-3 py-1 rounded text-xs font-bold bg-green-500 text-white hover:bg-green-600 shadow-sm transition">✅ เคลียร์</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden dark:bg-neutral-900 dark:border dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center dark:bg-neutral-800 dark:border-neutral-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">📋 รายชื่อผู้ใช้งาน</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase font-bold dark:bg-neutral-950 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {users.map((u) => {
                  
                  const isTargetSuperAdmin = u.role === 'super_admin';
                  const amISuperAdmin = myRole === 'super_admin';
                  const showActions = !isTargetSuperAdmin && u.id !== currentUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition dark:hover:bg-neutral-800/50">
                        <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 dark:bg-neutral-700 dark:text-gray-300">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover"/> : u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold dark:text-gray-200 flex items-center gap-1">
                                    {u.username}
                                    {isTargetSuperAdmin && <span className="text-[10px] bg-yellow-400 text-black px-1 rounded">OWNER</span>}
                                </p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'super_admin' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-gray-100 text-gray-600'}`}>
                                {u.role === 'super_admin' ? '👑 Super Admin' : u.role}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            {u.is_banned ? <span className="text-red-500 font-bold">Banned</span> : <span className="text-green-500 font-bold">Active</span>}
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                        {showActions && (
                            <div className="flex items-center justify-center gap-2">
                                <form action={toggleAdmin}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="currentRole" value={u.role} />
                                    <button 
                                        type="submit" 
                                        className={`px-3 py-1 rounded text-xs font-bold transition shadow-sm border ${u.role === 'admin' ? 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {u.role === 'admin' ? '⬇️ ลดขั้น' : '⬆️ เลื่อนยศ'}
                                    </button>
                                </form>

                                <form action={toggleBan}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="currentStatus" value={u.is_banned ? '1' : '0'} />
                                    <button 
                                        type="submit" 
                                        className={`px-3 py-1 rounded text-xs font-bold transition shadow-sm ${u.is_banned ? 'bg-gray-500 text-white' : 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'}`}
                                    >
                                        {u.is_banned ? '🔓 ปลด' : '🚫 แบน'}
                                    </button>
                                </form>
                            </div>
                        )}
                        {isTargetSuperAdmin && <span className="text-xs text-gray-400 italic">แตะต้องไม่ได้</span>}
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}