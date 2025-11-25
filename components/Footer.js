import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8 dark:bg-black dark:border-neutral-800 transition-colors duration-300 mt-12">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* --- ส่วนบน: Grid 4 คอลัมน์ --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Col 1: Branding */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
               <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  IT
               </div>
               <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                 TECH<span className="text-red-600">BOARD</span>
               </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed dark:text-gray-400">
              ชุมชนแลกเปลี่ยนความรู้ด้านไอที ฮาร์ดแวร์ ซอฟต์แวร์ และนวัตกรรมใหม่ๆ สำหรับนักศึกษาและบุคคลทั่วไป
            </p>
            {/* Social Icons (ใช้ SVG ธรรมดาเพื่อความง่าย) */}
            <div className="flex gap-4 pt-2">
              {[
                { name: 'FB', color: 'hover:text-blue-600' },
                { name: 'TW', color: 'hover:text-sky-500' },
                { name: 'GH', color: 'hover:text-gray-900 dark:hover:text-white' }
              ].map((social) => (
                <a key={social.name} href="#" className={`text-gray-400 transition-colors ${social.color}`}>
                  <span className="font-bold">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: เมนูลัด */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 dark:text-white">เมนูลัด</h3>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/" className="hover:text-red-600 transition-colors">หน้าแรก</Link></li>
              <li><Link href="/popular" className="hover:text-red-600 transition-colors">กระทู้ยอดนิยม</Link></li>
              <li><Link href="/register" className="hover:text-red-600 transition-colors">สมัครสมาชิก</Link></li>
              <li><Link href="/login" className="hover:text-red-600 transition-colors">เข้าสู่ระบบ</Link></li>
            </ul>
          </div>

          {/* Col 3: หมวดหมู่ */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 dark:text-white">หมวดหมู่แนะนำ</h3>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/?category=Hardware" className="hover:text-red-600 transition-colors">Hardware</Link></li>
              <li><Link href="/?category=Software" className="hover:text-red-600 transition-colors">Software & Apps</Link></li>
              <li><Link href="/?category=AI" className="hover:text-red-600 transition-colors">AI & Data Science</Link></li>
              <li><Link href="/?category=Network" className="hover:text-red-600 transition-colors">Network & Security</Link></li>
            </ul>
          </div>

          {/* Col 4: ติดต่อ */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 dark:text-white">ติดต่อเรา</h3>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li className="flex items-start gap-3">
                <span>📍</span>
                <span>วิทยาลัยเทคนิคเชียงใหม่<br/>ถนนเวียงแก้ว ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่</span>
              </li>
              <li className="flex items-center gap-3">
                <span>📧</span>
                <span>contact@cmtc.ac.th</span>
              </li>
              <li className="flex items-center gap-3">
                <span>📞</span>
                <span>053-217-708</span>
              </li>
            </ul>
          </div>

        </div>

        {/* --- ส่วนล่าง: ลิขสิทธิ์ --- */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 dark:border-neutral-800">
          <p className="text-sm text-gray-400 text-center md:text-left">
            © 2025 <span className="font-bold text-red-600">IT TECHBOARD</span>. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  );
}