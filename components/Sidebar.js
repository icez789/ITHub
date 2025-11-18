import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    // แก้ไข: 
    // Light Mode: bg-white border-r border-gray-200 text-gray-600
    // Dark Mode: dark:bg-black dark:border-neutral-800 dark:text-gray-400
    <aside className="fixed top-0 left-0 z-40 h-full w-2 hover:w-64 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden group hidden md:block pt-24 bg-white border-r border-gray-200 text-gray-600 dark:bg-black dark:border-neutral-800 dark:text-gray-400">
      
      <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-50 group-hover:opacity-0 transition-opacity duration-300"></div>

      <div className="w-64 h-full flex flex-col p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
        
        <div>
          <div className="bg-red-600 text-white px-4 py-1 mb-4 font-bold text-sm uppercase tracking-wider inline-block rounded-sm shadow-[0_0_10px_rgba(220,38,38,0.5)] whitespace-nowrap">
            MENU
          </div>
          {/* ปรับ Hover: สว่างเป็นเทาอ่อน / มืดเป็นเทาเข้ม */}
          <Link href="/" className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors group/item dark:hover:bg-neutral-900 dark:hover:text-white">
             <div className="w-2 h-2 bg-gray-800 rounded-full group-hover/item:bg-red-500 transition-colors flex-shrink-0 dark:bg-white"></div>
             <span className="font-bold whitespace-nowrap text-gray-800 dark:text-white">ดูทั้งหมด (All Topics)</span>
          </Link>
        </div>

        <hr className="border-gray-200 my-6 dark:border-neutral-800" />

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider whitespace-nowrap dark:text-neutral-500">Categories</h3>
          <ul className="space-y-2">
            {['Hardware', 'Software', 'Network', 'AI & Data', 'General'].map((item) => (
              <Link 
                key={item} 
                href={`/?category=${item}`} 
                className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors group/item dark:hover:bg-neutral-900 dark:hover:text-white"
              >
                <div className="w-1.5 h-1.5 bg-gray-400 group-hover/item:bg-red-500 transition-colors flex-shrink-0 dark:bg-neutral-600"></div>
                <span className="whitespace-nowrap">{item}</span>
              </Link>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-200 flex flex-col gap-2 dark:border-neutral-800">
          {['ข้อกำหนด', 'นโยบาย', 'กฎชุมชน'].map((text) => (
             <button key={text} className="text-sm text-left hover:text-red-600 hover:translate-x-1 transition-all duration-200 whitespace-nowrap dark:hover:text-white">
               • {text}
             </button>
          ))}
        </div>
      </div>
    </aside>
  );
}