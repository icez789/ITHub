import React from 'react';
import { Search, Home, Info, Layers, Phone, LogIn, Menu } from 'lucide-react'; // (Optional: ถ้าไม่ได้ลง lucide-react ให้ลบ icon ออกได้ครับ)

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* ================= SIDEBAR (ซ้าย - สีเทาเข้ม Tech) ================= */}
      <aside className="w-64 bg-gray-900 text-gray-400 flex flex-col hidden md:flex flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex flex-col gap-8">
          
          {/* หัวข้อ */}
          <div>
            <div className="bg-red-600 text-white px-4 py-1 mb-4 font-bold text-sm uppercase tracking-wider inline-block rounded-sm shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              TOPICS
            </div>
            <ul className="space-y-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <li key={item} className="flex items-center gap-3 p-2 hover:bg-gray-800 hover:text-red-500 rounded-md cursor-pointer transition-colors">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="font-medium">รายการที่ {item}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-gray-700" />

          {/* หมวดหมู่ */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Categories</h3>
            <ul className="space-y-2">
              {['Hardware', 'Software', 'Network', 'AI & Data'].map((item) => (
                <li key={item} className="flex items-center gap-3 p-2 hover:bg-gray-800 hover:text-white rounded-md cursor-pointer transition-colors group">
                  <div className="w-1.5 h-1.5 bg-gray-600 group-hover:bg-red-500 transition-colors"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="mt-auto p-6 border-t border-gray-800 flex flex-col gap-2">
          {['ข้อกำหนด', 'นโยบาย', 'กฎชุมชน'].map((text) => (
             <button key={text} className="text-sm text-left hover:text-white hover:translate-x-1 transition-all duration-200">
               • {text}
             </button>
          ))}
        </div>
      </aside>


      {/* ================= MAIN CONTENT (ขวา) ================= */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        
        {/* --- HEADER (บน) --- */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-6 shadow-sm z-10">
          {/* โลโก้ */}
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                IT
             </div>
             <span className="font-bold text-xl tracking-tight hidden sm:block">TECH<span className="text-red-600">BOARD</span></span>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <input 
              type="text" 
              placeholder="ค้นหาหัวข้อเทคโนโลยี..." 
              className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-full py-2 px-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
          </div>

          {/* Menu Buttons */}
          <nav className="flex gap-1">
            {['Home', 'About', 'Service', 'Contact'].map((menu) => (
              <button key={menu} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
                {menu}
              </button>
            ))}
            <button className="ml-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md font-medium shadow-md transition-all hover:shadow-red-500/30">
              Login
            </button>
          </nav>
        </header>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Highlight / Hero Section */}
          <section className="w-full h-72 rounded-2xl overflow-hidden relative mb-10 group shadow-xl">
            {/* Background Dark Tech */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"></div>
            {/* Decoration Line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent"></div>
            
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
              <span className="text-red-500 font-bold tracking-[0.2em] text-sm mb-2 animate-pulse">HOT TOPIC</span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                อัปเดตเทรนด์ <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">AI & Technology</span>
              </h1>
              <p className="text-gray-400 max-w-lg">ร่วมพูดคุย แลกเปลี่ยนความรู้ด้านไอที ฮาร์ดแวร์ และนวัตกรรมใหม่ๆ ได้ที่นี่</p>
            </div>
          </section>

          {/* Grid Content Cards */}
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-600 pl-4">กระทู้ล่าสุด</h2>
             <a href="#" className="text-red-600 hover:underline text-sm">ดูทั้งหมด &rarr;</a>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-500 hover:shadow-[0_4px_20px_rgba(220,38,38,0.15)] transition-all duration-300 cursor-pointer group relative overflow-hidden">
                {/* Tech Decorative Dot */}
                <div className="absolute top-3 right-3 w-2 h-2 bg-gray-300 rounded-full group-hover:bg-red-500 transition-colors"></div>
                
                <div className="h-24 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl group-hover:text-red-500 transition-colors">⚡</span>
                </div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-red-600 transition-colors mb-2">หัวข้อกระทู้ที่ {item}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">รายละเอียดสั้นๆ เกี่ยวกับเทคโนโลยี...</p>
              </div>
            ))}
          </section>

          {/* Footer */}
          <footer className="w-full border-t border-gray-200 py-8 text-center text-gray-500 text-sm">
            © 2025 <span className="font-bold text-red-600">IT TECHBOARD</span>. All rights reserved.
          </footer>

        </div>
      </main>
    </div>
  );
}