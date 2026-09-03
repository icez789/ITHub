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
import { ArrowLeft, Ban, CircleCheck, GraduationCap, Search, Users } from 'lucide-react';
import { writeModerationAudit } from '../../../lib/audit';
import UserBanButton from '../../../components/UserBanButton';

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
    try {
    const actor = await requireAdmin();
    const userId = positiveInteger(formData.get('userId'), 'user id');
    const [target] = await db.query('SELECT role, is_banned FROM users WHERE id = ?', [userId]);
    // กันไม่ให้แบน Super Admin
    if (!target[0] || target[0].role === 'super_admin' || actor.id === userId) throw new Error('Forbidden');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'UPDATE users SET is_banned = ?, session_version = session_version + 1 WHERE id = ?',
        [!target[0].is_banned, userId],
      );
      await writeModerationAudit({ executor: connection, actorId: actor.id, action: target[0].is_banned ? 'user.unban' : 'user.ban', targetType: 'user', targetId: userId });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    revalidatePath('/admin/users');
    return { success: true, message: target[0].is_banned ? 'ปลดระงับบัญชีแล้ว' : 'ระงับบัญชีแล้ว' };
    } catch (error) {
      console.error('Toggle ban error:', error);
      return { success: false, message: 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่' };
    }
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

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          'UPDATE users SET role = ?, session_version = session_version + 1 WHERE id = ?',
          [nextRole, userId],
        );
        await writeModerationAudit({ executor: connection, actorId: actor.id, action: 'user.role.change', targetType: 'user', targetId: userId, metadata: { from: target[0].role, to: nextRole } });
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
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
                <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-accent-text)]"><ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ</Link>
                <h1 className="flex items-center gap-3 text-3xl font-bold">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-primary)] text-[var(--app-primary-contrast)]"><Users aria-hidden="true" size={22} /></span> จัดการสมาชิก
                </h1>
            </div>
            
            {/* Search Bar */}
            <form className="relative w-full md:w-96">
                <input 
                    name="q" 
                    defaultValue={q}
                    id="user-search"
                    placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล..."
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] py-2.5 pl-10 pr-4 text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
                <label htmlFor="user-search" className="sr-only">ค้นหาสมาชิก</label>
                <Search className="absolute left-3 top-3 text-[var(--app-muted)]" aria-hidden="true" size={17} />
                <button type="submit" className="hidden"></button>
            </form>
         </div>

         {/* Users Table */}
         <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[var(--app-text-muted)]">
                    <thead className="bg-[var(--app-surface-subtle)] text-xs font-bold uppercase text-[var(--app-text-muted)]">
                        <tr>
                            <th className="px-6 py-4">สมาชิก</th>
                            <th className="px-6 py-4">สิทธิ์</th>
                            <th className="px-6 py-4">สถานะ</th>
                            <th className="px-6 py-4 text-center">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--app-border)]">
                        {users.map((u) => {
                             const isTargetSuperAdmin = u.role === 'super_admin';
                             const showActions = !isTargetSuperAdmin && u.id !== currentUser.id;

                            return (
                                <tr key={u.id} className="transition hover:bg-[var(--app-surface-subtle)]">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--app-surface-subtle)] font-bold text-[var(--app-text-muted)]">
                                            {u.avatar_url ? <Image src={u.avatar_url} alt={`รูปโปรไฟล์ของ ${u.username}`} fill sizes="40px" className="object-cover" /> : u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--app-text)]">{u.username}</div>
                                            <div className="text-xs text-[var(--app-text-muted)]">{u.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold border ${
                                            u.role === 'super_admin' ? 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10' :
                                            u.role === 'admin' ? 'border-red-500/50 text-red-600 bg-red-500/10' :
                                            u.role === 'teacher' ? 'border-blue-500/50 text-blue-600 bg-blue-500/10 dark:text-blue-300' :
                                            'border-[var(--app-border)] text-[var(--app-text-muted)]'
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
                                                <UserBanButton action={toggleBan} userId={u.id} username={u.username} isBanned={Boolean(u.is_banned)} className={`rounded px-3 py-1.5 text-xs text-white transition ${u.is_banned ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`} />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-[var(--app-text-muted)]">จัดการไม่ได้</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {users.length === 0 && (
                            <tr><td colSpan="4" className="py-8 text-center text-[var(--app-text-muted)]">ไม่พบสมาชิก</td></tr>
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
