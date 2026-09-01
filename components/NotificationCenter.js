'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pusher from 'pusher-js';
import { AlertTriangle, Bell, BellOff, CheckCheck, Heart, LoaderCircle, MessageCircle, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { notificationChannelName } from '../lib/pusherChannels';
import { deleteAllNotifications, deleteNotification, markNotificationAsRead, markNotificationsAsRead } from '../lib/actions';

const typeIcons = { comment: MessageCircle, like: Heart, report: AlertTriangle };
const notificationKey = (item) => item.id ? `id:${Number(item.id)}` : `content:${item.message || ''}|${item.link || ''}`;

export default function NotificationCenter({ initialNotifications, initialUnreadCount, currentUserId, page, totalPages }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const notificationKeysRef = useRef(new Set(initialNotifications.map(notificationKey)));

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
    notificationKeysRef.current = new Set(initialNotifications.map(notificationKey));
  }, [initialNotifications, initialUnreadCount, page]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!currentUserId || !key || !cluster) return;
    const pusher = new Pusher(key, { cluster, channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' } });
    const channelName = notificationChannelName(currentUserId);
    const channel = pusher.subscribe(channelName);
    channel.bind('new-notification', (incoming) => {
      const key = notificationKey(incoming);
      if (page !== 1 || notificationKeysRef.current.has(key)) return;
      notificationKeysRef.current.add(key);
      setUnreadCount((count) => count + 1);
      setNotifications((current) => [{ ...incoming, is_read: 0, topic_id: incoming.topic_id || null }, ...current].slice(0, 20));
    });
    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [currentUserId, page]);

  function run(action, onSuccess, id = 'all') {
    if (isPending) return;
    setError('');
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result?.success) setError(result?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
        else onSuccess?.();
      } catch (actionError) {
        console.error('Notification action failed:', actionError);
        setError('ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        setPendingId(null);
      }
    });
  }

  function openNotification(notification) {
    const href = notification.link || (notification.topic_id ? `/topic/${notification.topic_id}` : '/');
    if (notification.is_read) return router.push(href);
    run(() => markNotificationAsRead(notification.id), () => {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: 1 } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      router.push(href);
    }, notification.id);
  }

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-red-600">Updates</p>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">การแจ้งเตือน</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{unreadCount > 0 ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'อ่านครบแล้ว'}</p>
        </div>
        {notifications.length > 0 ? <div className="flex flex-wrap gap-2">
          {unreadCount > 0 ? <button type="button" disabled={isPending} onClick={() => run(() => markNotificationsAsRead(), () => {
            setNotifications((items) => items.map((item) => ({ ...item, is_read: 1 })));
            setUnreadCount(0);
          })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--app-surface-subtle)] disabled:opacity-50">
            {isPending && pendingId === 'all' ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <CheckCheck aria-hidden="true" size={16} />} อ่านทั้งหมด
          </button> : null}
          <ConfirmDialog trigger={<><Trash2 aria-hidden="true" size={16} /> ล้างทั้งหมด</>} triggerAriaLabel="ล้างการแจ้งเตือนทั้งหมด" triggerDisabled={isPending} triggerClassName="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-50" title="ล้างการแจ้งเตือนทั้งหมด?" description="รายการแจ้งเตือนทั้งหมดของคุณจะถูกลบถาวร แต่จะไม่กระทบกระทู้หรือความคิดเห็น" onConfirm={async () => {
            const result = await deleteAllNotifications();
            if (result.success) { setNotifications([]); setUnreadCount(0); router.refresh(); }
            return result;
          }} />
        </div> : null}
      </header>

      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}

      {notifications.length > 0 ? <section aria-label="รายการแจ้งเตือน" className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        {notifications.map((notification) => {
          const Icon = typeIcons[notification.type] || Bell;
          const pending = isPending && pendingId === notification.id;
          return <article key={notification.id} className={`flex items-start gap-3 border-b border-[var(--app-border)] p-4 last:border-0 sm:gap-4 sm:p-5 ${notification.is_read ? '' : 'bg-red-50/60 dark:bg-red-950/10'}`}>
            <button type="button" disabled={pending} onClick={() => openNotification(notification)} className="flex min-w-0 flex-1 gap-3 text-left disabled:opacity-60 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--app-surface-subtle)] text-[var(--app-primary)]"><Icon aria-hidden="true" size={20} /></span>
              <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-4"><span className="font-medium text-gray-800 dark:text-gray-200">{notification.message}</span>{!notification.is_read ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" aria-label="ยังไม่ได้อ่าน" /> : null}</span><span className="mt-2 block text-xs text-gray-400">{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(notification.created_at))}</span></span>
            </button>
            <ConfirmDialog trigger={<Trash2 aria-hidden="true" size={16} />} triggerAriaLabel="ลบการแจ้งเตือนนี้" triggerClassName="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" title="ลบการแจ้งเตือนนี้?" description="รายการนี้จะถูกลบถาวร แต่จะไม่กระทบเนื้อหาต้นทาง" onConfirm={async () => {
              const result = await deleteNotification(notification.id);
              if (result.success) { setNotifications((items) => items.filter((item) => item.id !== notification.id)); if (!notification.is_read) setUnreadCount((count) => Math.max(0, count - 1)); router.refresh(); }
              return result;
            }} />
          </article>;
        })}
      </section> : <section className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] py-20 text-center"><BellOff className="mx-auto mb-4 text-[var(--app-text-muted)]" aria-hidden="true" size={36} /><h2 className="text-xl font-bold">ยังไม่มีการแจ้งเตือน</h2><p className="mb-6 mt-2 text-gray-500 dark:text-gray-400">เมื่อมีคนตอบหรือถูกใจกระทู้ของคุณ รายการจะปรากฏที่นี่</p><Link href="/" className="inline-flex rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-red-700">สำรวจกระทู้</Link></section>}

      {totalPages > 1 ? <nav aria-label="หน้าการแจ้งเตือน" className="mt-6 flex items-center justify-center gap-3"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={`/notifications?page=${Math.max(1, page - 1)}`} className={`rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[var(--app-surface-subtle)]'}`}>ก่อนหน้า</Link><span className="text-sm text-[var(--app-text-muted)]">หน้า {page} จาก {totalPages}</span><Link aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} href={`/notifications?page=${Math.min(totalPages, page + 1)}`} className={`rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-[var(--app-surface-subtle)]'}`}>ถัดไป</Link></nav> : null}
    </>
  );
}
