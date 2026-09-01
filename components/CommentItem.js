'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserBadge from './UserBadge';
import ReportButton from './ReportButton';
import { markAsSolution } from '../lib/actions';
import CommentComposer from './CommentComposer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, CheckCircle2, Reply, Trash2 } from 'lucide-react';
import DeleteButton from './DeleteButton';
import ConfirmDialog from './ConfirmDialog';

export default function CommentItem({ 
  comment, 
  currentUser, 
  isModerator,
  topicUserId, 
  deleteAction, 
  replyAction, 
  reportAction,
  isTopicLocked = false,
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
    isModerator
  );

  const handleMarkAsSolution = async () => {
    const result = await markAsSolution(comment.id, comment.topic_id);
    if (result.success) router.refresh();
    return result;
  };

  return (
    <div className="flex flex-col">
      <div className={`group relative flex gap-3 rounded-xl border p-4 transition-colors
          ${isSolved 
            ? 'border-emerald-300 border-l-4 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
            : 'border-[var(--app-border)] bg-[var(--app-surface)]'
          }
          ${comment.parent_id ? 'ml-4 sm:ml-8' : ''}
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
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        <CheckCircle2 aria-hidden="true" size={11} /> คำตอบที่ใช่
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
            {currentUser && !isTopicLocked && (
                <button 
                    type="button"
                    onClick={() => setIsReplying(!isReplying)}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--app-text-muted)] transition-colors hover:text-blue-600"
                >
                    <Reply aria-hidden="true" size={14} /> ตอบกลับ
                </button>
            )}

            {isOwnerOfTopic && !isSolved && (
                <ConfirmDialog trigger={<><Check aria-hidden="true" size={14} /> เลือกเป็นคำตอบ</>} triggerAriaLabel="เลือกความคิดเห็นนี้เป็นคำตอบ" triggerClassName="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30" title="เลือกความคิดเห็นนี้เป็นคำตอบ?" description="ระบบจะย้ายสถานะคำตอบที่ถูกต้องและปรับคะแนนผู้ตอบให้สอดคล้อง" confirmLabel="ยืนยันคำตอบ" pendingLabel="กำลังบันทึก…" onConfirm={handleMarkAsSolution} testId="confirm-solution-dialog" />
            )}
          </div>
        </div>

        {canDelete && (
          <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <DeleteButton
              action={deleteAction}
              id={comment.id}
              idName="commentId"
              ariaLabel="ลบความคิดเห็นนี้"
              title="ลบความคิดเห็นนี้?"
              description="ความคิดเห็นนี้จะถูกลบถาวร แต่คำตอบย่อยจะยังอยู่และถูกย้ายออกจากชุดคำตอบเดิม"
              successMessage="ลบความคิดเห็นแล้ว"
              className="rounded-md p-1 text-[var(--app-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              <Trash2 aria-hidden="true" size={16} />
            </DeleteButton>
          </div>
        )}
      </div>

      {isReplying && (
        <div className={`mt-2 mb-4 ${comment.parent_id ? 'ml-12 md:ml-16' : 'ml-12 md:ml-16'}`}>
            <CommentComposer action={replyAction} parentId={comment.id} compact onSuccess={() => setIsReplying(false)} />
        </div>
      )}

      {comment.children && comment.children.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
            {comment.children.map(child => (
                <CommentItem 
                    key={child.id} 
                    comment={child} 
                    currentUser={currentUser} 
                    isModerator={isModerator}
                    topicUserId={topicUserId}
                    deleteAction={deleteAction}
                    replyAction={replyAction}
                    reportAction={reportAction}
                    isTopicLocked={isTopicLocked}
                />
            ))}
        </div>
      )}
    </div>
  );
}
