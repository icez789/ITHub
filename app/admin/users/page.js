import React from 'react';
import db from '../../../lib/db'; // ถอยกลับ 3 ชั้นเพื่อหา lib
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, requireAdmin, requireSuperAdmin } from '../../../lib/auth';
import { positiveInteger } from '../../../lib/validation';
import { ASSIGNABLE_ROLES, isAdminRole, roleLabel } from '../../../lib/roles';
import AdminPagination from '../AdminPagination';
import RoleAssignmentForm from '../../../components/RoleAssignmentForm';
import { ArrowLeft, Ban, CircleCheck, GraduationCap, Search, ShieldCheck, Undo2, Users } from 'lucide-react';

export default async function UsersManagementPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!isAdminRole(currentUser.role)) redirect('/');

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
    ORDER BY CASE WHEN role = 'super_admin' THEN 1 WHEN role = 'admin' THEN 2 WHEN role = 'teacher' THEN 3 ELSE 4 END, created_at DESC
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

  async function setRole(formData) {
    'use server';
    try {
      const actor = await requireSuperAdmin();
      const userId = positiveInteger(formData.get('userId'), 'user id');
      const nextRole = String(formData.get('role') || '');
      if (!ASSIGNABLE_ROLES.includes(nextRole)) return { success: false, message: 'ไม่รองรับสิทธิ์ที่เลือก' };
      const [target] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (!target[0] || target[0].role === 'super_admin' || actor.id === userId) {
        return { success: false, message: 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีนี้ได้' };
      }

      await db.query('UPDATE users SET role = ? WHERE id = ?', [nextRole, userId]);
      revalidatePath('/admin');
      revalidatePath('/admin/users');
      return { success: true, role: nextRole };
    } catch (error) {
      console.error('Role assignment error:', error);
      return { success: false, message: 'คุณไม่มีสิทธิ์เปลี่ยนระดับสมาชิก' };
    }
  }

  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12">
       <div>
         {/* Header & Breadcrumb */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-red-600"><ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ</Link>
                <h1 className="flex items-center gap-3 text-3xl font-bold">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white"><Users aria-hidden="true" size={22} /></span> จัดการสมาชิก
                </h1>
            </div>
            
            {/* Search Bar */}
            <form className="relative w-full md:w-96">
                <input 
                    name="q" 
                    defaultValue={q}
                    id="user-search"
                    placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล..."
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-2.5 pl-10 pr-4 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
                <label htmlFor="user-search" className="sr-only">ค้นหาสมาชิก</label>
                <Search className="absolute left-3 top-3 text-[var(--app-muted)]" aria-hidden="true" size={17} />
                <button type="submit" className="hidden"></button>
            </form>
         </div>

         {/* Users Table */}
         <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                    <thead className="bg-gray-100 dark:bg-neutral-950 text-gray-500 dark:text-gray-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">สมาชิก</th>
                            <th className="px-6 py-4">สิทธิ์</th>
                            <th className="px-6 py-4">สถานะ</th>
                            <th className="px-6 py-4 text-center">การจัดการ</th>
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
                                            u.role === 'teacher' ? 'border-blue-500/50 text-blue-600 bg-blue-500/10 dark:text-blue-300' :
                                            'border-gray-300 text-gray-500'
                                        }`}>
                                            <span className="inline-flex items-center gap-1">
                                              {u.role === 'teacher' ? <GraduationCap aria-hidden="true" size={12} /> : null}
                                              {roleLabel(u.role)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.is_banned ? 
                                            <span className="flex items-center gap-1 font-bold text-red-600"><Ban aria-hidden="true" size={15} /> ระงับการใช้งาน</span> :
                                            <span className="flex items-center gap-1 font-bold text-green-600"><CircleCheck aria-hidden="true" size={15} /> ใช้งานได้</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {showActions ? (
                                            <div className="flex justify-center gap-2">
                                                {isSuperAdmin && (
                                                    <RoleAssignmentForm
                                                      userId={u.id}
                                                      username={u.username}
                                                      initialRole={u.role}
                                                      action={setRole}
                                                    />
                                                )}
                                                <form action={toggleBan}>
                                                    <input type="hidden" name="userId" value={u.id} />
                                                    <input type="hidden" name="currentStatus" value={u.is_banned ? '1' : '0'} />
                                                    <button className={`px-3 py-1.5 rounded text-xs text-white transition ${u.is_banned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                                                        <span className="inline-flex items-center gap-1.5">{u.is_banned ? <Undo2 aria-hidden="true" size={14} /> : <ShieldCheck aria-hidden="true" size={14} />}{u.is_banned ? 'ปลดระงับ' : 'ระงับ'}</span>
                                                    </button>
                                                </form>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">จัดการไม่ได้</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {users.length === 0 && (
                            <tr><td colSpan="4" className="py-8 text-center text-gray-500">ไม่พบสมาชิก</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
         <AdminPagination path="/admin/users" page={page} totalPages={totalPages} query={q} />
       </div>
    </main>
  );
}
