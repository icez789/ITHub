'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function Editor({ defaultValue = '', className = "h-64 mb-12" }) {
  const [value, setValue] = useState(defaultValue);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image'], // ✨ เพิ่ม 'image' ตรงนี้ เพื่อให้มีปุ่มอัปรูป
      ['clean']
    ],
  };

  return (
    <div className="bg-white text-black"> {/* บังคับ text-black เพื่อให้พิมพ์เห็นในโหมดมืด */}
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={setValue} 
        modules={modules}
        className={className} // ใช้ className ที่ส่งมา (จะได้ปรับความสูงได้)
      />
      <input type="hidden" name="content" value={value} />
    </div>
  );
}