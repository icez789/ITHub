'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function NotificationBell({ count, notifications }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* ปุ่มกระดิ่ง */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <span className="text-xl">🔔</span>
        {/* จุดแดง (ถ้ามีแจ้งเตือนใหม่) */}
        {count > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-black">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown รายการแจ้งเตือน */}
      {isOpen && (
        <>
          {/* Backdrop ใสๆ เพื่อให้กดที่อื่นแล้วปิด Dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 dark:bg-neutral-900 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800">
              <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">การแจ้งเตือน</h3>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((noti) => (
                  <Link 
                    key={noti.id} 
                    href={`/topic/${noti.topic_id}`} // กดแล้วไปที่กระทู้นั้น
                    className={`block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition dark:border-neutral-800 dark:hover:bg-neutral-800 ${noti.is_read ? 'opacity-60' : 'bg-red-50/30 dark:bg-red-900/10'}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex gap-3">
                       <div className="mt-1 text-lg">
                         {noti.type === 'like' ? '❤️' : '💬'}
                       </div>
                       <div>
                         <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{noti.message}</p>
                         <p className="text-xs text-gray-400 mt-1">{new Date(noti.created_at).toLocaleDateString('th-TH')}</p>
                       </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                   ไม่มีการแจ้งเตือนใหม่ 💤
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}