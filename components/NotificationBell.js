'use client';

import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import Link from 'next/link';
import { notificationChannelName } from '../lib/pusherChannels';
// 1. ✅ Import Server Action ที่เราเพิ่งสร้าง
import { markNotificationsAsRead } from '../lib/actions'; 
import { Bell, BellOff } from 'lucide-react';

export default function NotificationBell({ count: initialCount, notifications: initialNotifications, currentUserId }) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe only when realtime notification settings are available.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!currentUserId || !key || !cluster) return;
    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
      },
    });
    const channelName = notificationChannelName(currentUserId);
    const channel = pusher.subscribe(channelName);
    channel.bind('new-notification', (data) => {
      setNotifications((prev) => {
        const duplicate = data.id
          ? prev.some((notification) => Number(notification.id) === Number(data.id))
          : prev.some((notification) => notification.message === data.message && notification.link === data.link);
        if (duplicate) return prev;
        setUnreadCount((count) => count + 1);
        return [data, ...prev].slice(0, 10);
      });
    });
    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [currentUserId]);

  // 2. ✅ แก้ไขฟังก์ชันตอนกดกระดิ่ง
  const handleBellClick = async () => {
    // สลับสถานะเปิด/ปิด
    setIsOpen(!isOpen);

    // ถ้า "กำลังจะเปิด" และ "มีเลขแจ้งเตือนค้างอยู่"
    if (!isOpen && unreadCount > 0) {
      // 2.1 เคลียร์ตัวเลขหน้าเว็บทันที (UX ลื่นๆ)
      setUnreadCount(0);
      
      // 2.2 สั่ง Database ให้เคลียร์ค่าจริงๆ (Server Action)
      await markNotificationsAsRead();
    }
  };

  return (
     <div className="relative" data-tour="personal-nav">
        {/* 3. ✅ เปลี่ยน onClick ให้มาใช้ฟังก์ชันใหม่ของเรา */}
        <button type="button" onClick={handleBellClick} data-user-id={currentUserId || undefined} aria-label="เปิดการแจ้งเตือน" aria-expanded={isOpen} className="relative rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-primary)]">
           <Bell aria-hidden="true" size={21} />
           
           {unreadCount > 0 && (
             <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-red-600 px-1 text-[10px] font-bold text-white">
               {unreadCount > 9 ? '9+' : unreadCount}
             </span>
           )}
        </button>

        {isOpen && (
           <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200 z-50 dark:bg-neutral-900 dark:border-neutral-700">
              <div className="p-3 font-bold border-b bg-gray-50 text-gray-700 flex justify-between items-center dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200">
                  <span>การแจ้งเตือน</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                 {notifications.length > 0 ? (
                    notifications.map((n, i) => (
                       <Link key={n.id || `${n.created_at}-${i}`} href={n.link || (n.topic_id ? `/topic/${n.topic_id}` : '/notifications')} onClick={() => setIsOpen(false)} className="block p-4 hover:bg-gray-50 border-b last:border-0 transition-colors dark:hover:bg-neutral-800 dark:border-neutral-700">
                          <p className="text-sm text-gray-800 font-medium dark:text-gray-300 line-clamp-2">{n.message}</p>
                          <span className="text-xs text-gray-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                       </Link>
                    ))
                 ) : (
                    <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[var(--app-text-muted)]">
                        <BellOff aria-hidden="true" size={20} />
                        <span>ไม่มีการแจ้งเตือนใหม่</span>
                    </div>
                 )}
              </div>
              <Link href="/notifications" onClick={() => setIsOpen(false)} className="block p-3 text-center text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-t dark:border-neutral-700">
                ดูการแจ้งเตือนทั้งหมด
              </Link>
           </div>
        )}
     </div>
  );
}
