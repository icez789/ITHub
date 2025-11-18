import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    // แก้ไข: 
    // 1. z-40 (ให้อยู่ใต้ Navbar)
    // 2. pt-24 (ดันเนื้อหาลงมา 6rem เพื่อให้พ้นความสูงของ Navbar)
    <aside className="fixed top-0 left-0 z-40 h-full w-2 hover:w-64 bg-gray-900 text-gray-400 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden group hidden md:block pt-24">
      
      {/* แถบสีแดง */}
      <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-50 group-hover:opacity-0 transition-opacity duration-300"></div>

      {/* เนื้อหาข้างใน */}
      <div className="w-64 h-full flex flex-col p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
        
        {/* หัวข้อ */}
        <div>
          <div className="bg-red-600 text-white px-4 py-1 mb-4 font-bold text-sm uppercase tracking-wider inline-block rounded-sm shadow-[0_0_10px_rgba(220,38,38,0.5)] whitespace-nowrap">
            MENU
          </div>
          <Link href="/" className="flex items-center gap-3 p-2 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer transition-colors group/item">
             <div className="w-2 h-2 bg-white rounded-full group-hover/item:bg-red-500 transition-colors flex-shrink-0"></div>
             <span className="font-bold text-white whitespace-nowrap">ดูทั้งหมด (All Topics)</span>
          </Link>
        </div>

        <hr className="border-gray-700 my-6" />

        {/* หมวดหมู่ */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider whitespace-nowrap">Categories</h3>
          <ul className="space-y-2">
            {['Hardware', 'Software', 'Network', 'AI & Data', 'General'].map((item) => (
              <Link 
                key={item} 
                href={`/?category=${item}`} 
                className="flex items-center gap-3 p-2 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 bg-gray-600 group-hover/item:bg-red-500 transition-colors flex-shrink-0"></div>
                <span className="whitespace-nowrap">{item}</span>
              </Link>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-800 flex flex-col gap-2">
          {['ข้อกำหนด', 'นโยบาย', 'กฎชุมชน'].map((text) => (
             <button key={text} className="text-sm text-left hover:text-white hover:translate-x-1 transition-all duration-200 whitespace-nowrap">
               • {text}
             </button>
          ))}
        </div>
      </div>
    </aside>
  );
}