'use client';

import React, { useState, useRef, useEffect } from 'react';
import { chatWithBot } from '../lib/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, Maximize2, MessageCircle, Minimize2, Send, Trash2, X } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const INITIAL_MESSAGES = [{ role: 'bot', text: 'สวัสดีครับ! ITHub Bot 🤖 พร้อมช่วยเหลือ มีอะไรให้ผมรับใช้ครับ?' }];

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 🚀 เพิ่ม State สำหรับขยายหน้าต่าง
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 🚀 1. ตอนเปิดเว็บ ให้ดึงประวัติแชทเก่าจาก LocalStorage มาโชว์
  useEffect(() => {
    const savedChat = localStorage.getItem('ithub_bot_chat');
    try {
      const parsed = savedChat ? JSON.parse(savedChat) : INITIAL_MESSAGES;
      setMessages(Array.isArray(parsed) ? parsed : INITIAL_MESSAGES);
    } catch {
      localStorage.removeItem('ithub_bot_chat');
      setMessages(INITIAL_MESSAGES);
    }
  }, []);

  // 🚀 2. ทุกครั้งที่มีข้อความใหม่ ให้เซฟทับลง LocalStorage ทันที
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ithub_bot_chat', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    // ก๊อปปี้ประวัติเก่าเก็บไว้ส่งให้ AI
    const currentHistory = [...messages]; 

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // 🚀 โยนประวัติเก่า + ข้อความใหม่ไปหลังบ้าน
      const reply = await chatWithBot(currentHistory, userMsg);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'ขออภัยครับ ระบบมีปัญหาขัดข้อง 😅' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 ฟังก์ชันล้างแชท (เคลียร์ความจำ)
  const clearChat = async () => {
    const initMsg = [{ role: 'bot', text: 'รีเซ็ตระบบเรียบร้อย! มีอะไรให้ผมช่วยไหมครับ? 🤖' }];
    setMessages(initMsg);
    localStorage.setItem('ithub_bot_chat', JSON.stringify(initMsg));
    return { success: true, message: 'ล้างประวัติ ITHub Bot แล้ว' };
  };

  return (
    <div data-tour="ai-chat" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end md:bottom-6 md:right-20">
      
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="ithub-chat-title"
          className={`mb-2 flex origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl transition-all duration-200 ${
            isExpanded ? 'w-[calc(100vw-2rem)] md:w-[800px] h-[calc(100vh-7rem)] md:h-[80vh]' : 'w-[calc(100vw-2rem)] max-w-96 h-[min(500px,calc(100vh-7rem))]'
          }`}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between bg-[var(--app-primary)] p-3 text-[var(--app-primary-contrast)] sm:p-4">
            <div id="ithub-chat-title" className="flex items-center gap-2 font-bold">
              <Bot aria-hidden="true" className="h-5 w-5" />
              ITHub Bot
            </div>
            
            <div className="flex items-center gap-1">
              {/* ปุ่มล้างแชท */}
              <ConfirmDialog
                trigger={<Trash2 aria-hidden="true" className="h-4 w-4" />}
                triggerAriaLabel="ล้างประวัติแชท"
                triggerClassName="rounded-lg p-2 transition hover:bg-black/15"
                title="ล้างประวัติ ITHub Bot?"
                description="ข้อความทั้งหมดที่บันทึกไว้ในเบราว์เซอร์นี้จะถูกลบถาวร และเริ่มการสนทนาใหม่"
                confirmLabel="ยืนยันการล้าง"
                pendingLabel="กำลังล้าง…"
                onConfirm={clearChat}
              />
              
              {/* ปุ่มขยายหน้าจอ */}
              <button type="button" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "ย่อหน้าจอ" : "ขยายหน้าจอ"} aria-label={isExpanded ? "ย่อหน้าต่างแชท" : "ขยายหน้าต่างแชท"} className="hidden rounded-lg p-2 transition hover:bg-black/15 sm:block">
                {isExpanded ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
              </button>

              {/* ปุ่มปิด */}
              <button type="button" onClick={() => setIsOpen(false)} title="ซ่อนแชท" aria-label="ปิดหน้าต่างแชท" className="rounded-lg p-2 transition hover:bg-black/15">
                <X aria-hidden="true" className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* พื้นที่แสดงข้อความ */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--app-background)] p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[var(--app-primary)] text-[var(--app-primary-contrast)] rounded-tr-none shadow-md'
                    : 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] rounded-tl-none shadow-sm'
                }`}>
                  {msg.role === 'user' ? (
                    // ข้อความของ user แสดงเป็น plain text ธรรมดา ปลอดภัยกว่า ไม่ต้อง parse markdown
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    // ข้อความ bot แปลง markdown จริงๆ
                    <div className="markdown-body [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold">
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
                              <code className="rounded bg-[var(--app-surface-subtle)] px-1 py-0.5 text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-none border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* กล่องพิมพ์ข้อความ */}
          <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความที่นี่..." 
                aria-label="ข้อความถึง ITHub Bot"
                className="flex-1 rounded-full border border-transparent bg-[var(--app-surface-subtle)] px-4 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:bg-[var(--app-surface)]"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                aria-label="ส่งข้อความ"
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-[var(--app-primary)] p-2.5 text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:opacity-50"
              >
                <Send aria-hidden="true" className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ปุ่มกดเปิดแชท */}
      {!isOpen && (
        <button 
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="เปิด ITHub Bot"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-accent-text)] shadow-md transition-colors hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
        >
          <MessageCircle aria-hidden="true" className="h-5 w-5" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
