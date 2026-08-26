'use client';

import React, { useState } from 'react';
import { Check, Flag } from 'lucide-react';

export default function ReportButton({ targetId, type, reportAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (isSent) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Check aria-hidden="true" size={14} /> ส่งเรื่องแล้ว</span>;
  }

  return (
    <div className="relative inline-block">
      {/* ปุ่มกดรูปธง */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="แจ้งเนื้อหาไม่เหมาะสม"
        aria-expanded={isOpen}
        className="rounded-md p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        title="แจ้งเนื้อหาไม่เหมาะสม"
      >
        <Flag aria-hidden="true" size={16} />
      </button>

      {/* กล่องฟอร์ม (เด้งออกมาเมื่อกด) */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xl">
          <h4 className="text-sm font-bold mb-2 text-gray-800 dark:text-gray-200">แจ้งปัญหา</h4>
          <form action={async (formData) => {
              await reportAction(formData);
              setIsSent(true);
              setIsOpen(false);
          }}>
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="type" value={type} />
            
            <textarea 
              name="reason" 
              required 
              rows="3" 
              placeholder="ระบุเหตุผล..." 
              className="w-full text-sm p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:border-red-500 dark:bg-black dark:border-neutral-700 dark:text-white"
            ></textarea>
            
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
              >
                ส่งแจ้งเตือน
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
