'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [text, setText] = useState(searchParams.get('search') || '');

  useEffect(() => {
    // ✨ Logic ใหม่: เช็คก่อนว่าค่าที่พิมพ์ กับ ค่าใน URL มันต่างกันจริงไหม?
    // ถ้าค่าเหมือนเดิม (เช่น เราแค่กด Sort แต่ไม่ได้พิมพ์ค้นหาใหม่) ก็ไม่ต้องทำอะไร
    const currentSearch = searchParams.get('search') || '';
    if (text === currentSearch) {
        return; 
    }

    const timer = setTimeout(() => {
      // ถ้าไม่ได้อยู่หน้าแรก และไม่ได้พิมพ์อะไร ก็ไม่ต้องทำอะไร
      if (!text && pathname !== '/') {
        return; 
      }

      const params = new URLSearchParams(searchParams.toString());
      
      if (text) {
        params.set('search', text);
      } else {
        params.delete('search');
      }
      
      // เมื่อมีการค้นหา ให้รีเซ็ตไปหน้า 1
      if (text !== currentSearch) {
          params.delete('page');
      }

      // 🚀 สั่งเปลี่ยน URL โดยเพิ่ม { scroll: false } เพื่อไม่ให้ดีดกลับขึ้นบน
      router.push(`/?${params.toString()}`, { scroll: false });

    }, 500);

    return () => clearTimeout(timer);
  }, [text, router, searchParams, pathname]);

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
