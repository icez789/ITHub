import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import db from '../../../lib/db';
import { getCurrentUser } from '../../../lib/auth';
import { isAdminRole } from '../../../lib/roles';
import AdminPagination from '../AdminPagination';

export const metadata = { title: 'ประวัติการดูแลระบบ | ITHub' };

function metadataText(value) {
  if (!value) return '—';
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value);
  } catch {
    return '—';
  }
}

export default async function AuditLogPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!isAdminRole(currentUser.role)) redirect('/');

  const params = await searchParams;
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const [[logs], [countRows]] = await Promise.all([
    db.query(
      `SELECT l.id, l.action, l.target_type, l.target_id, l.metadata, l.request_id, l.created_at,
              u.username AS actor_name
       FROM moderation_audit_logs l
       LEFT JOIN users u ON u.id = l.actor_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset],
    ),
    db.query('SELECT COUNT(*) AS count FROM moderation_audit_logs'),
  ]);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0].count) / pageSize));

  return <main className="ithub-page-container mx-auto max-w-7xl pb-24 pt-8 md:pb-12 md:pt-12">
    <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-red-600"><ArrowLeft aria-hidden="true" size={16} /> กลับศูนย์จัดการ</Link>
    <h1 className="flex items-center gap-3 text-3xl font-bold"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white"><ClipboardList aria-hidden="true" size={22} /></span> ประวัติการดูแลระบบ</h1>
    <p className="mb-8 mt-2 text-sm text-[var(--app-text-muted)]">บันทึกแบบอ่านอย่างเดียวสำหรับตรวจสอบการทำงานของผู้ดูแล</p>

    <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--app-surface-subtle)] text-xs uppercase text-[var(--app-text-muted)]"><tr><th className="px-4 py-3">เวลา</th><th className="px-4 py-3">ผู้ดำเนินการ</th><th className="px-4 py-3">การทำงาน</th><th className="px-4 py-3">เป้าหมาย</th><th className="px-4 py-3">รายละเอียด</th><th className="px-4 py-3">Request ID</th></tr></thead>
        <tbody className="divide-y divide-[var(--app-border)]">
          {logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-4 py-3">{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(log.created_at))}</td><td className="px-4 py-3 font-semibold">{log.actor_name || 'บัญชีถูกลบ'}</td><td className="px-4 py-3 font-mono text-xs">{log.action}</td><td className="px-4 py-3">{log.target_type} #{log.target_id}</td><td className="max-w-xs truncate px-4 py-3 font-mono text-xs" title={metadataText(log.metadata)}>{metadataText(log.metadata)}</td><td className="max-w-40 truncate px-4 py-3 font-mono text-xs" title={log.request_id || ''}>{log.request_id || '—'}</td></tr>)}
          {logs.length === 0 ? <tr><td colSpan="6" className="px-4 py-12 text-center text-[var(--app-text-muted)]">ยังไม่มีประวัติการดูแลระบบ</td></tr> : null}
        </tbody>
      </table>
    </div>
    <AdminPagination path="/admin/audit" page={page} totalPages={totalPages} />
  </main>;
}
