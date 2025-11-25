import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-sans text-gray-800 dark:bg-black dark:text-gray-100 transition-colors duration-300 p-4">
      
      {/* Animation 404 */}
      <div className="relative">
        <h1 className="text-9xl font-extrabold text-gray-200 dark:text-neutral-800 tracking-widest select-none animate-pulse">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-red-600 text-white px-4 py-1 rounded text-sm font-bold rotate-12 shadow-lg transform hover:rotate-0 transition-transform duration-300 cursor-default">
            Page Not Found
          </span>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4 text-center">
        อ้าว... หลงทางซะแล้ว! 🗺️
      </h2>
      
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
        หน้าที่คุณกำลังตามหาอาจถูกลบ เปลี่ยนชื่อ หรือไม่มีอยู่จริงในจักรวาลนี้
      </p>

      {/* ปุ่มกลับบ้าน (Bouncy) */}
      <Link 
        href="/"
        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg hover:shadow-red-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
      >
        🏠 กลับหน้าหลัก
      </Link>

      {/* Decoration พื้นหลัง */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
         <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

    </div>
  );
}