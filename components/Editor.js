'use client'; // ต้องเป็น Client Component

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// 1. เปลี่ยนการเรียกใช้เป็น 'react-quill-new'
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css'; // เปลี่ยน CSS ด้วย

export default function Editor({ defaultValue = '' }) {
  const [value, setValue] = useState(defaultValue);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };

  return (
    <div className="bg-white">
      {/* ตัว Editor สำหรับพิมพ์ */}
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={setValue} 
        modules={modules}
        className="h-64 mb-12" 
      />

      {/* Input ล่องหน: เอาไว้ส่งค่าเข้า Server Action (name="content") */}
      <input type="hidden" name="content" value={value} />
    </div>
  );
}