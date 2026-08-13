import React from 'react';
import db from '../../../lib/db'; // ถอยกลับ 3 ชั้นเพื่อหา lib
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, requireAdmin } from '../../../lib/auth';
import { positiveInteger } from '../../../lib/validation';
import AdminPagination from '../AdminPagination';

export default async function UsersManagementPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!['admin', 'super_admin'].includes(currentUser.role)) redirect('/');

  const isSuperAdmin = currentUser.role === 'super_admin';
  
  // 2. Search Logic
  const params = await searchParams;
  const q = String(params?.q || '').trim().slice(0, 100);
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const querySQL = `
    SELECT id, username, email, role, avatar_url, is_banned FROM users
    WHERE username LIKE ? OR email LIKE ?
    ORDER BY CASE WHEN role = 'super_admin' THEN 1 WHEN role = 'admin' THEN 2 ELSE 3 END, created_at DESC
    LIMIT ? OFFSET ?
  `;
  const searchPattern = `%${q}%`;
  const [[users], [countRows]] = await Promise.all([
    db.query(querySQL, [searchPattern, searchPattern, pageSize, offset]),
    db.query('SELECT COUNT(*) AS count FROM users WHERE username LIKE ? OR email LIKE ?', [searchPattern, searchPattern]),
  ]);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0].count) / pageSize));

  // --- Actions ---
  async function toggleBan(formData) {
    'use server';
    const actor = await requireAdmin();
    const userId = positiveInteger(formData.get('userId'), 'user id');
    const [target] = await db.query('SELECT role, is_banned FROM users WHERE id = ?', [userId]);
    // กันไม่ให้แบน Super Admin
    if (!target[0] || target[0].role === 'super_admin' || actor.id === userId) throw new Error('Forbidden');

    await db.query('UPDATE users SET is_banned = ? WHERE id = ?', [!target[0].is_banned, userId]);
    revalidatePath('/admin/users');
  }

  async function toggleAdmin(formData) {
    'use server';
    const actor = await requireAdmin();
    if (actor.role !== 'super_admin') throw new Error('Forbidden');
    const userId = positiveInteger(formData.get('userId'), 'user id');
    const [target] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!target[0] || target[0].role === 'super_admin' || actor.id === userId) throw new Error('Forbidden');

    const newRole = target[0].role === 'admin' ? 'user' : 'admin';
    await db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);
    revalidatePath('/admin/users');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-8 font-sans">
       <div className="container mx-auto max-w-6xl">
         {/* Header & Breadcrumb */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="text-sm text-gray-500 hover:text-red-500 mb-2 inline-block">← Back to Dashboard</Link>
                <h1 className="text-3xl font-black flex items-center gap-3">
                    <span className="text-red-600 text-4xl">👥</span> User Management
                </h1>
            </div>
            
            {/* Search Bar */}
            <form className="relative w-full md:w-96">
                <input 
                    name="q" 
                    defaultValue={q}
                    placeholder="Search username or email..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-red-500 outline-none transition"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                <button type="submit" className="hidden"></button>
            </form>
         </div>

         {/* Users Table */}
         <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                    <thead className="bg-gray-100 dark:bg-neutral-950 text-gray-500 dark:text-gray-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {users.map((u) => {
                             const isTargetSuperAdmin = u.role === 'super_admin';
                             const showActions = !isTargetSuperAdmin && u.id !== currentUser.id;

                            return (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 overflow-hidden">
                                            {u.avatar_url ? <Image src={u.avatar_url} alt={`รูปโปรไฟล์ของ ${u.username}`} fill sizes="40px" className="object-cover" /> : u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{u.username}</div>
                                            <div className="text-xs text-gray-400">{u.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold border ${
                                            u.role === 'super_admin' ? 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10' :
                                            u.role === 'admin' ? 'border-red-500/50 text-red-600 bg-red-500/10' :
                                            'border-gray-300 text-gray-500'
                                        }`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.is_banned ? 
                                            <span className="text-red-600 font-bold flex items-center gap-1">🚫 Banned</span> : 
                                            <span className="text-green-600 font-bold flex items-center gap-1">● Active</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {showActions ? (
                                            <div className="flex justify-center gap-2">
                                                {isSuperAdmin && (
                                                    <form action={toggleAdmin}>
                                                        <input type="hidden" name="userId" value={u.id} />
                                                        <button className="px-3 py-1.5 rounded text-xs border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition">
                                                            {u.role === 'admin' ? '⬇️ Demote' : '⬆️ Promote'}
                                                        </button>
                                                    </form>
                                                )}
                                                <form action={toggleBan}>
                                                    <input type="hidden" name="userId" value={u.id} />
                                                    <input type="hidden" name="currentStatus" value={u.is_banned ? '1' : '0'} />
                                                    <button className={`px-3 py-1.5 rounded text-xs text-white transition ${u.is_banned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                                                        {u.is_banned ? 'Unlock' : 'Ban'}
                                                    </button>
                                                </form>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No Actions</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {users.length === 0 && (
                            <tr><td colSpan="4" className="text-center py-8 text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
         <AdminPagination path="/admin/users" page={page} totalPages={totalPages} query={q} />
       </div>
    </div>
  );
}
