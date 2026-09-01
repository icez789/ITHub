import { redirect } from 'next/navigation';
import db from '../../lib/db';
import { getCurrentUser } from '../../lib/auth';
import NotificationCenter from '../../components/NotificationCenter';

export const metadata = {
  title: 'การแจ้งเตือน | ITHub',
  description: 'ติดตามการตอบกลับและกิจกรรมล่าสุดใน ITHub',
};

export default async function NotificationsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const [[notifications], [countRows], [unreadRows]] = await Promise.all([
    db.query(
      `SELECT n.id, n.topic_id, n.type, n.message, n.is_read, n.created_at,
              actor.username AS actor_name, actor.avatar_url AS actor_avatar
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [user.id, pageSize, offset],
    ),
    db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?', [user.id]),
    db.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]),
  ]);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0].count) / pageSize));
  if (page > totalPages) redirect(`/notifications?page=${totalPages}`);

  return (
    <main className="ithub-page-container mx-auto max-w-4xl pb-24 pt-8 md:pb-12 md:pt-12">
      <NotificationCenter
        key={`${page}-${notifications[0]?.id || 'empty'}-${countRows[0].count}-${unreadRows[0].count}`}
        initialNotifications={notifications}
        initialUnreadCount={Number(unreadRows[0].count)}
        currentUserId={user.id}
        page={page}
        totalPages={totalPages}
      />
    </main>
  );
}
