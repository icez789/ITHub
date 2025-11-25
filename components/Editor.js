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
    // ✨ แก้ไข: ลบ bg-white text-black ออก ให้เหลือแค่ div เปล่าๆ
    // เพื่อให้ CSS ใน globals.css ทำงานแทน
    <div className="w-full">
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