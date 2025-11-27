'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import hljs from 'highlight.js'; 
import 'highlight.js/styles/atom-one-dark.css'; 

if (typeof window !== 'undefined') {
  window.hljs = hljs;
}

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function Editor({ defaultValue = '', className = "h-64 mb-12" }) {
  const [value, setValue] = useState(defaultValue);

  const modules = {
    syntax: true,
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      ['code-block'], 
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <div className="w-full relative">
      {/* 👇 ส่วนสำคัญ: ฝัง CSS ลงไปตรงนี้เลย เพื่อบังคับเปลี่ยนสี Dropdown 👇 */}
      <style jsx global>{`
        /* 1. บังคับพื้นหลังของกล่องเมนู (Dropdown) ให้เป็นสีดำ */
        .dark .ql-snow .ql-picker-options {
           background-color: #1f1f1f !important;
           border-color: #404040 !important;
           box-shadow: 0 4px 6px rgba(0,0,0,0.5) !important;
        }
        
        /* 2. บังคับตัวหนังสือในเมนูให้เป็นสีเทา */
        .dark .ql-snow .ql-picker-item {
           color: #a3a3a3 !important;
        }
        
        /* 3. ตอนเอาเมาส์ชี้ หรือเลือกอยู่ ให้เป็นพื้นหลังแดง ตัวหนังสือขาว */
        .dark .ql-snow .ql-picker-item:hover,
        .dark .ql-snow .ql-picker-item.ql-selected {
           color: #ffffff !important;
           background-color: #ef4444 !important;
        }
        
        /* 4. แก้สีลูกศรและปุ่มเลือกด้านบน */
        .dark .ql-snow .ql-picker-label {
           color: #e5e5e5 !important;
        }
        .dark .ql-snow .ql-stroke {
           stroke: #e5e5e5 !important;
        }
        .dark .ql-snow .ql-fill {
           fill: #e5e5e5 !important;
        }
        .dark .ql-snow .ql-picker {
           color: #e5e5e5 !important;
        }
      `}</style>

      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={setValue} 
        modules={modules}
        className={className} 
      />
      <input type="hidden" name="content" value={value} />
    </div>
  );
}