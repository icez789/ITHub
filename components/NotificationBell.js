'use client';

import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import Link from 'next/link';
import { externalServiceEnabled } from '../lib/externalServicesCore';
import { notificationChannelName } from '../lib/pusherChannels';
// 1. ✅ Import Server Action ที่เราเพิ่งสร้าง
import { markNotificationsAsRead } from '../lib/actions'; 
import { AlertTriangle, BadgeCheck, Bell, BellOff, Heart, MessageCircle, Rss } from 'lucide-react';

const typeIcons = {
  comment: MessageCircle,
  like: Heart,
  report: AlertTriangle,
  solution: BadgeCheck,
  follow_topic: Rss,
};

export default function NotificationBell({ count: initialCount, notifications: initialNotifications, currentUserId }) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe only when realtime notification settings are available.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!currentUserId || !externalServiceEnabled(key, cluster)) return;
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
        <button type="button" onClick={handleBellClick} data-user-id={currentUserId || undefined} aria-label="เปิดการแจ้งเตือน" aria-expanded={isOpen} className="relative rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-accent-text)]">
           <Bell aria-hidden="true" size={21} />
           
           {unreadCount > 0 && (
             <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--app-surface)] bg-[var(--app-primary)] px-1 text-[10px] font-bold text-[var(--app-primary-contrast)]">
               {unreadCount > 9 ? '9+' : unreadCount}
             </span>
           )}
        </button>

        {isOpen && (
           <div className="ithub-elevated absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 font-bold text-[var(--app-text)]">
                  <span>การแจ้งเตือน</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                 {notifications.length > 0 ? (
                    notifications.map((n, i) => {
                      const Icon = typeIcons[n.type] || Bell;
                      return (
                        <Link key={n.id || `${n.created_at}-${i}`} href={n.link || (n.topic_id ? `/topic/${n.topic_id}` : '/notifications')} onClick={() => setIsOpen(false)} className="flex gap-3 border-b border-[var(--app-border)] p-4 transition-colors last:border-0 hover:bg-[var(--app-surface-subtle)]">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]"><Icon aria-hidden="true" size={16} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-medium text-[var(--app-text)]">{n.message}</span>
                            <span className="mt-1 block text-xs text-[var(--app-text-muted)]">{new Date(n.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                          </span>
                        </Link>
                      );
                    })
                 ) : (
                    <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[var(--app-text-muted)]">
                        <BellOff aria-hidden="true" size={20} />
                        <span>ไม่มีการแจ้งเตือนใหม่</span>
                    </div>
                 )}
              </div>
              <Link href="/notifications" onClick={() => setIsOpen(false)} className="block border-t border-[var(--app-border)] p-3 text-center text-sm font-bold text-[var(--app-accent-text)] hover:bg-[var(--app-primary-soft)]">
                ดูการแจ้งเตือนทั้งหมด
              </Link>
           </div>
        )}
     </div>
  );
}
