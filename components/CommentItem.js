'use client';

import React, { useState } from 'react';
import UserBadge from './UserBadge';
import Editor from './Editor'; // เราจะใช้ Editor ตัวเดิมตอบกลับก็ได้ หรือจะใช้ textarea ธรรมดาก็ได้ (ในที่นี้ขอใช้ textarea เพื่อความเบา)

export default function CommentItem({ comment, currentUser, isAdmin, topicUserId, deleteAction, replyAction }) {
  const [isReplying, setIsReplying] = useState(false);

  // เช็กสิทธิ์ลบ: เจ้าของเม้น OR เจ้าของกระทู้ OR แอดมิน
  const canDelete = currentUser && (
    currentUser.id === comment.user_id || 
    currentUser.id === topicUserId || 
    isAdmin
  );

  return (
    <div className="flex flex-col">
      <div className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 group relative dark:bg-neutral-900 dark:border-neutral-800 ${comment.parent_id ? 'ml-8 md:ml-12 border-l-4 border-l-gray-300 dark:border-l-neutral-700' : ''}`}>
        
        {/* Avatar */}
        <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-red-600 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-red-400">
          {(comment.username || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
             <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 dark:text-gray-200">{comment.username || 'ผู้เยี่ยมชม'}</span>
                <UserBadge role={comment.role} postCount={comment.post_count} />
                {comment.parent_id && <span className="text-xs text-gray-400">ตอบกลับความคิดเห็น</span>}
             </div>
             <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleString('th-TH')}</span>
          </div>
          
          {/* เนื้อหาคอมเมนต์ */}
          <div 
            className="text-gray-700 whitespace-pre-wrap leading-relaxed dark:text-gray-300 prose max-w-none dark:prose-invert text-sm" 
            dangerouslySetInnerHTML={{ __html: comment.content }} 
          />

          {/* ปุ่ม Action ด้านล่าง */}
          <div className="mt-3 flex gap-3 items-center">
            {currentUser && (
                <button 
                    onClick={() => setIsReplying(!isReplying)}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                    💬 ตอบกลับ
                </button>
            )}
          </div>
        </div>

        {/* ปุ่มลบ (มุมขวาบน) */}
        {canDelete && (
          <form action={deleteAction} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
             <input type="hidden" name="commentId" value={comment.id} />
             <button type="submit" className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors dark:hover:bg-neutral-800" title="ลบคอมเมนต์นี้">🗑️</button>
          </form>
        )}
      </div>

      {/* ฟอร์มตอบกลับ (แสดงเมื่อกดปุ่ม) */}
      {isReplying && (
        <div className={`mt-2 mb-4 ${comment.parent_id ? 'ml-12 md:ml-16' : 'ml-12 md:ml-16'}`}>
            <form action={(formData) => {
                replyAction(formData);
                setIsReplying(false); // ปิดฟอร์มเมื่อส่ง
            }} className="flex gap-2 items-start">
                <div className="flex-1">
                    <textarea 
                        name="content" 
                        required 
                        rows="2" 
                        placeholder={`ตอบกลับคุณ ${comment.username}...`} 
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-black dark:border-neutral-700 dark:text-white"
                    ></textarea>
                    <input type="hidden" name="parentId" value={comment.id} />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-md transition-all dark:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap">
                   ส่ง
                </button>
            </form>
        </div>
      )}

      {/* แสดงลูกๆ (Nested Comments) แบบ Recursive */}
      {comment.children && comment.children.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
            {comment.children.map(child => (
                <CommentItem 
                    key={child.id} 
                    comment={child} 
                    currentUser={currentUser} 
                    isAdmin={isAdmin} 
                    topicUserId={topicUserId}
                    deleteAction={deleteAction}
                    replyAction={replyAction}
                />
            ))}
        </div>
      )}
    </div>
  );
}