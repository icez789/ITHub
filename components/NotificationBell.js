'use client';

import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import Link from 'next/link';
import { notificationChannelName } from '../lib/pusherChannels';
// 1. ✅ Import Server Action ที่เราเพิ่งสร้าง
import { markNotificationsAsRead } from '../lib/actions'; 

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
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [data, ...prev]);
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
     <div className="relative">
        {/* 3. ✅ เปลี่ยน onClick ให้มาใช้ฟังก์ชันใหม่ของเรา */}
        <button type="button" onClick={handleBellClick} data-user-id={currentUserId || undefined} aria-label="เปิดการแจ้งเตือน" aria-expanded={isOpen} className="relative p-2 text-gray-600 hover:text-red-600 transition-colors dark:text-gray-300 dark:hover:text-red-400">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
           
           {unreadCount > 0 && (
             <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-sm border-2 border-white dark:border-black">
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
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <span>🔕</span>
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
