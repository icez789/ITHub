'use client';

import React, { useState } from 'react';

export default function ReportButton({ targetId, type, reportAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (isSent) {
    return <span className="text-xs text-green-500 font-bold">✓ ส่งเรื่องแล้ว</span>;
  }

  return (
    <div className="relative inline-block">
      {/* ปุ่มกดรูปธง */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
        title="แจ้งเนื้อหาไม่เหมาะสม"
      >
        🚩
      </button>

      {/* กล่องฟอร์ม (เด้งออกมาเมื่อกด) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 dark:bg-neutral-900 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-100">
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