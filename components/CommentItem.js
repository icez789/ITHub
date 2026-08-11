'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserBadge from './UserBadge';
import ReportButton from './ReportButton';
import { markAsSolution } from '../lib/actions';
import Editor from './Editor'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// SweetAlert2
import Swal from 'sweetalert2';

export default function CommentItem({ 
  comment, 
  currentUser, 
  isAdmin, 
  topicUserId, 
  deleteAction, 
  replyAction, 
  reportAction 
}) {
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);

  const isOwnerOfTopic = currentUser?.id === topicUserId; 
  const isSolved = comment.is_solution === 1; 
  
  // 🚀 เช็คว่าเป็นบอทหรือไม่
  const isBot = comment.username === 'ITHub Bot 🤖';

  const canDelete = currentUser && (
    currentUser.id === comment.user_id || 
    currentUser.id === topicUserId || 
    isAdmin
  );

  const handleMarkAsSolution = () => {
    Swal.fire({
        title: 'ยืนยันการเลือกคำตอบ?',
        text: "คุณต้องการเลือกความคิดเห็นนี้เป็นคำตอบที่ถูกต้องใช่หรือไม่?",
        icon: 'question', 
        showCancelButton: true,
        confirmButtonColor: '#16a34a', 
        cancelButtonColor: '#d33',     
        confirmButtonText: 'ใช่, เลือกเลย!',
        cancelButtonText: 'ยกเลิก',
        background: document.documentElement.classList.contains('dark') ? '#1f1f1f' : '#ffffff', 
        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000', 
    }).then(async (result) => {
        if (result.isConfirmed) {
            await markAsSolution(comment.id, comment.topic_id);
            router.refresh();
            
            Swal.fire({
                title: 'เรียบร้อย!',
                text: 'เลือกคำตอบสำเร็จแล้ว (+20 XP)',
                icon: 'success',
                confirmButtonColor: '#16a34a',
                timer: 1500, 
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1f1f1f' : '#ffffff',
                color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
            });
        }
    });
  };

  return (
    <div className="flex flex-col">
      <div className={`p-4 rounded-xl border shadow-sm flex gap-4 group relative transition-all duration-500
          ${isSolved 
            ? 'bg-green-50 border-green-500 ring-1 ring-green-500 dark:bg-green-900/20 dark:border-green-500' 
            : 'bg-white border-gray-200 dark:bg-neutral-900 dark:border-neutral-800'
          }
          ${comment.parent_id ? 'ml-8 md:ml-12 border-l-4 border-l-gray-300 dark:border-l-neutral-700' : ''}
      `}>
        
        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold border 
            ${isSolved 
                ? 'bg-green-100 text-green-700 border-green-500 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-red-600 border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-red-400'
            }`}>
          {(comment.username || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
             <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 dark:text-gray-200">{comment.username || 'ผู้เยี่ยมชม'}</span>
                
                <UserBadge role={comment.role} xp={comment.xp} />
                
                {isSolved && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300">
                        ✅ คำตอบที่ใช่
                    </span>
                )}
                
                {comment.parent_id && <span className="text-xs text-gray-400">ตอบกลับความคิดเห็น</span>}
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleString('th-TH')}</span>
                
                {currentUser && currentUser.id !== comment.user_id && (
                   <ReportButton targetId={comment.id} type="comment" reportAction={reportAction} />
                )}
             </div>
          </div>
          
          {/* 🚀 แยกการเรนเดอร์ระหว่างบอท (Markdown) กับคนปกติ (HTML) */}
          {isBot ? (
            <div className="markdown-body text-gray-800 dark:text-gray-200 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', margin: '0.5rem 0' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-gray-200 dark:bg-neutral-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {comment.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div 
              className="text-gray-700 whitespace-pre-wrap leading-relaxed dark:text-gray-300 prose max-w-none dark:prose-invert text-sm" 
              dangerouslySetInnerHTML={{ __html: comment.content }} 
            />
          )}

          <div className="mt-3 flex gap-3 items-center flex-wrap">
            {currentUser && (
                <button 
                    type="button"
                    onClick={() => setIsReplying(!isReplying)}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                    💬 ตอบกลับ
                </button>
            )}

            {isOwnerOfTopic && !isSolved && (
                <button 
                    type="button"
                    onClick={handleMarkAsSolution} 
                    className="text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded transition-colors border border-green-200 dark:border-green-800 dark:hover:bg-green-900/30 ml-auto"
                >
                    ✅ เลือกเป็นคำตอบ
                </button>
            )}
          </div>
        </div>

        {canDelete && (
          <form action={async (formData) => {
              await deleteAction(formData);
          }} className="absolute top-4 right-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
             <input type="hidden" name="commentId" value={comment.id} />
             <button type="submit" aria-label="ลบคอมเมนต์นี้" className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors dark:hover:bg-neutral-800" title="ลบคอมเมนต์นี้">🗑️</button>
          </form>
        )}
      </div>

      {isReplying && (
        <div className={`mt-2 mb-4 ${comment.parent_id ? 'ml-12 md:ml-16' : 'ml-12 md:ml-16'}`}>
            <form action={async (formData) => {
                await replyAction(formData);
                setIsReplying(false);
            }} className="flex gap-2 items-start">
                <div className="flex-1 bg-white dark:bg-black rounded-lg border border-gray-300 dark:border-neutral-700 overflow-hidden">
                    <Editor className="h-24 bg-white dark:bg-black text-black dark:text-white" />
                    <input type="hidden" name="parentId" value={comment.id} />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-md transition-all dark:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap mt-1">
                    ส่ง
                </button>
            </form>
        </div>
      )}

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
                    reportAction={reportAction} 
                />
            ))}
        </div>
      )}
    </div>
  );
}
