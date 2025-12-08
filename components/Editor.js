'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import hljs from 'highlight.js'; 
import 'highlight.js/styles/atom-one-dark.css'; 

// ตั้งค่า hljs ให้ window (จำเป็นสำหรับ Quill)
if (typeof window !== 'undefined') {
  window.hljs = hljs;
}

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

// ✅ ย้าย modules ออกมาข้างนอก
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

export default function Editor({ defaultValue = '', className = "h-64 mb-12" }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="w-full relative">
      <style jsx global>{`
        /* =========================================
           🛠️ แก้ไขสี Dropdown (Language / Header) 
           ========================================= */

        /* ----------------------------------
           🌓 1. Dark Mode (โหมดมืด)
           ---------------------------------- */
        
        /* พื้นหลังของกล่องเมนูที่เด้งออกมา */
        .dark .ql-snow .ql-picker-options {
           background-color: #1f1f1f !important;
           border: 1px solid #404040 !important;
           box-shadow: 0 4px 6px rgba(0,0,0,0.5) !important;
        }

        /* ตัวหนังสือในรายการ (ที่มองไม่เห็นก่อนหน้านี้) */
        .dark .ql-snow .ql-picker-item {
           color: #d4d4d4 !important; /* สีเทาสว่าง อ่านง่ายบนพื้นดำ */
        }

        /* ตอนเอาเมาส์ชี้ (Hover) หรือตัวที่เลือกอยู่ */
        .dark .ql-snow .ql-picker-item:hover,
        .dark .ql-snow .ql-picker-item.ql-selected {
           color: #ffffff !important;      /* ตัวหนังสือขาว */
           background-color: #ef4444 !important; /* พื้นหลังแดง (ตามธีมเว็บ) */
        }

        /* ข้อความ Label ด้านบน (คำว่า Plain, Normal) */
        .dark .ql-snow .ql-picker-label {
           color: #e5e5e5 !important;
        }
        
        /* ไอคอนลูกศร Dropdown ในโหมดมืด */
        .dark .ql-snow .ql-picker-label::before {
           color: #e5e5e5 !important; 
        }
        .dark .ql-snow .ql-stroke {
           stroke: #e5e5e5 !important;
        }
        .dark .ql-snow .ql-fill {
           fill: #e5e5e5 !important;
        }

        /* ----------------------------------
           ☀️ 2. Light Mode (โหมดสว่าง) 
           ---------------------------------- */
        
        /* พื้นหลังต้องเป็นสีขาว */
        .ql-snow .ql-picker-options {
           background-color: #ffffff !important;
           border-color: #e5e7eb !important;
           box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
        }

        /* ตัวหนังสือต้องเป็นสีดำ (กันมันเป็นสีขาวแล้วจม) */
        .ql-snow .ql-picker-item {
           color: #374151 !important; /* สีเทาเข้ม */
        }

        /* Hover ในโหมดสว่าง */
        .ql-snow .ql-picker-item:hover,
        .ql-snow .ql-picker-item.ql-selected {
           color: #ffffff !important;
           background-color: #dc2626 !important; /* พื้นหลังแดงเข้ม */
        }

        /* ----------------------------------
           🎨 3. ปรับแต่ง Toolbar ทั่วไป
           ---------------------------------- */
        .dark .ql-toolbar {
            border-color: #404040 !important;
            background-color: #171717; /* สีพื้นหลัง Toolbar */
        }
        
        /* ทำให้ไอคอนเครื่องมือสว่างขึ้นใน Dark Mode */
        .dark .ql-snow .ql-toolbar button svg {
            filter: invert(1) brightness(0.9);
        }
        
        /* ไอคอนตอน Active หรือ Hover */
        .dark .ql-snow .ql-toolbar button:hover svg, 
        .dark .ql-snow .ql-toolbar button.ql-active svg {
            filter: none !important; 
            stroke: #ef4444 !important; /* สีแดง */
        }

        /* กล่องเขียนข้อความ */
        .dark .ql-container.ql-snow {
            border-color: #404040 !important;
            background-color: #0a0a0a; /* สีพื้นหลังพื้นที่เขียน */
            color: #e5e5e5; /* สีตัวหนังสือตอนพิมพ์ */
        }
        
        /* Placeholder (คำว่า "Compose an epic...") */
        .dark .ql-editor.ql-blank::before {
            color: #6b7280 !important;
            font-style: normal;
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