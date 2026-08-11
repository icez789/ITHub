import Link from 'next/link';
import { redirect } from 'next/navigation';
import db from '../../lib/db';
import { getCurrentUser } from '../../lib/auth';
import { markNotificationsAsRead } from '../../lib/actions';

export const metadata = {
  title: 'การแจ้งเตือน | ITHub',
  description: 'ติดตามการตอบกลับและกิจกรรมล่าสุดใน ITHub',
};

const typeIcons = {
  comment: '💬',
  like: '❤️',
  report: '⚠️',
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [notifications] = await db.query(
    `SELECT n.id, n.topic_id, n.type, n.message, n.is_read, n.created_at,
            actor.username AS actor_name, actor.avatar_url AS actor_avatar
     FROM notifications n
     LEFT JOIN users actor ON actor.id = n.actor_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 100`,
    [user.id],
  );
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 md:py-14">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600 mb-2">Updates</p>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">การแจ้งเตือน</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{unreadCount > 0 ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'อ่านครบแล้ว'}</p>
        </div>
        {unreadCount > 0 && (
          <form action={markNotificationsAsRead}>
            <button type="submit" className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-bold px-4 py-2 hover:bg-red-100 dark:hover:bg-red-950/40 transition">
              ทำเครื่องหมายว่าอ่านทั้งหมด
            </button>
          </form>
        )}
      </header>

      {notifications.length > 0 ? (
        <section aria-label="รายการแจ้งเตือน" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.topic_id ? `/topic/${notification.topic_id}` : '/'}
              className={`flex gap-4 p-5 border-b last:border-0 border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 transition ${notification.is_read ? '' : 'bg-red-50/60 dark:bg-red-950/10'}`}
            >
              <span className="w-11 h-11 shrink-0 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xl" aria-hidden="true">{typeIcons[notification.type] || '🔔'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-4">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{notification.message}</span>
                  {!notification.is_read && <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 mt-1.5" aria-label="ยังไม่ได้อ่าน" />}
                </span>
                <span className="block mt-2 text-xs text-gray-400">
                  {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(notification.created_at))}
                </span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="text-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="text-5xl mb-4" aria-hidden="true">🔕</div>
          <h2 className="text-xl font-bold">ยังไม่มีการแจ้งเตือน</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">เมื่อมีคนตอบหรือถูกใจกระทู้ของคุณ รายการจะปรากฏที่นี่</p>
          <Link href="/" className="inline-flex rounded-lg bg-red-600 text-white font-bold px-5 py-3 hover:bg-red-700 transition">สำรวจกระทู้</Link>
        </section>
      )}
    </main>
  );
}
