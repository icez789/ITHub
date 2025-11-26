'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ดึงค่าค้นหาเดิมจาก URL มาใส่ (ถ้ามี)
  const [text, setText] = useState(searchParams.get('search') || '');

  useEffect(() => {
    // ตั้งเวลาหน่วง (Debounce) 500ms
    const timer = setTimeout(() => {
      
      // สร้าง URL Parameters ใหม่ โดยเอาค่าเดิมมาด้วย (เช่น sort, category)
      const params = new URLSearchParams(searchParams.toString());
      
      if (text) {
        params.set('search', text);
      } else {
        params.delete('search'); // ถ้าลบจนหมด ให้เอา parameter ออก
      }
      
      // รีเซ็ตหน้าไปหน้า 1 เสมอเวลาค้นหาใหม่
      params.delete('page');

      // สั่งเปลี่ยน URL (Next.js จะโหลดหน้าใหม่ให้อัตโนมัติ)
      router.push(`/?${params.toString()}`);

    }, 500); // 0.5 วินาที

    return () => clearTimeout(timer);
  }, [text, router, searchParams]);

  return (
    <div className="flex-1 max-w-xl relative hidden md:block">
      <input 
        type="text" 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="🔍 พิมพ์เพื่อค้นหาทันที..." 
        className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-full py-2 px-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-100 dark:focus:bg-black dark:focus:border-red-600" 
      />
    </div>
  );
}