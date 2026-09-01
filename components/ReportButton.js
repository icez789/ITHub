'use client';

import React, { useState } from 'react';
import { Check, Flag, LoaderCircle } from 'lucide-react';

export default function ReportButton({ targetId, type, reportAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);
    setError('');
    try {
      const result = await reportAction(new FormData(event.currentTarget));
      if (!result?.success) {
        setError(result?.message || 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      setIsSent(true);
      setIsOpen(false);
    } catch (submitError) {
      console.error('Report submission failed:', submitError);
      setError('ส่งรายงานไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsPending(false);
    }
  }

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
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="type" value={type} />
            
            <textarea 
              name="reason" 
              required 
              disabled={isPending}
              rows="3" 
              placeholder="ระบุเหตุผล..." 
              className="w-full text-sm p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:border-red-500 dark:bg-black dark:border-neutral-700 dark:text-white"
            ></textarea>
            
            {error ? <p role="alert" className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={isPending}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
              >
                <span className="inline-flex items-center gap-1.5">{isPending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={14} /> : null}{isPending ? 'กำลังส่ง…' : 'ส่งแจ้งเตือน'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
