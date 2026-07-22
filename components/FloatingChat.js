'use client';

import React, { useState, useRef, useEffect } from 'react';
import { chatWithBot } from '../lib/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      setMessages([{ role: 'bot', text: 'สวัสดีครับ! ITHub Bot 🤖 พร้อมช่วยเหลือ มีอะไรให้ผมรับใช้ครับ?' }]);
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
  const clearChat = () => {
    if(confirm('ต้องการล้างประวัติการสนทนาทั้งหมดหรือไม่?')) {
        const initMsg = [{ role: 'bot', text: 'รีเซ็ตระบบเรียบร้อย! มีอะไรให้ผมช่วยไหมครับ? 🤖' }];
        setMessages(initMsg);
        localStorage.setItem('ithub_bot_chat', JSON.stringify(initMsg));
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {isOpen && (
        <div className={`mb-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform origin-bottom-right ${
          isExpanded ? 'w-[90vw] md:w-[800px] h-[80vh]' : 'w-80 sm:w-96 h-[500px]' // 🚀 สลับคลาส CSS เพื่อยืด/หดหน้าจอ
        }`}>
          
          {/* Header */}
          <div className="bg-red-600 dark:bg-red-700 p-3 sm:p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-xl">🤖</span>
              ITHub Bot
            </div>
            
            <div className="flex items-center gap-1">
              {/* ปุ่มล้างแชท */}
              <button onClick={clearChat} title="ล้างแชท" className="hover:bg-red-800 p-2 rounded-lg transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              
              {/* ปุ่มขยายหน้าจอ */}
              <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "ย่อหน้าจอ" : "ขยายหน้าจอ"} className="hover:bg-red-800 p-2 rounded-lg transition hidden sm:block">
                {isExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                )}
              </button>

              {/* ปุ่มปิด */}
              <button onClick={() => setIsOpen(false)} title="ซ่อนแชท" className="hover:bg-red-800 p-2 rounded-lg transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          {/* พื้นที่แสดงข้อความ */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-neutral-950 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-red-600 text-white rounded-tr-none shadow-md' 
                    : 'bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-neutral-700 rounded-tl-none shadow-sm'
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
                              <code className="bg-gray-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-xs" {...props}>
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
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-200 dark:border-neutral-700">
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
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
            <form onSubmit={handleSend} className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความที่นี่..." 
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-neutral-900 rounded-full text-sm outline-none transition dark:text-white"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ปุ่มกดเปิดแชท */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.7)] transition-all transform hover:scale-110 flex items-center justify-center animate-bounce"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
        </button>
      )}
    </div>
  );
}