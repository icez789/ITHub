'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TopicCard({ id, title, username, created_at, image_url, index }) {
  return (
    <motion.div
      // 1. ตอนโผล่มา (Entrance Animation)
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }} // เปลี่ยนเป็น whileInView เพื่อให้เลื่อนลงมาเจอแล้วค่อยเด้ง
      viewport={{ once: true }}          // เล่นครั้งเดียวพอ
      transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
      
      // 2. ✨ ลูกเล่นตอนชี้ (Hover Effect) แบบ IT CMTC Style
      whileHover={{ 
        y: -10, // ลอยขึ้น 10px
        transition: { type: "spring", stiffness: 300, damping: 20 },
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" // เงาฟุ้งๆ
      }}
      
      whileTap={{ scale: 0.98 }} // ตอนกดให้ยุบลงนิดนึง
      
      className="h-full"
    >
      <Link href={`/topic/${id}`}>
        {/* เพิ่ม transition-all เพื่อให้สีขอบเปลี่ยนนุ่มนวล */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-full flex flex-col relative overflow-hidden group transition-all duration-300 
                        hover:border-red-500 dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-red-500">
          
          {/* แถบสีแดงด้านล่าง (จะโผล่มาตอน Hover) */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

          {/* Decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
          <div className="absolute top-3 right-3 w-2 h-2 bg-gray-300 rounded-full group-hover:bg-red-500 transition-colors z-10 dark:bg-neutral-700"></div>
          
          {/* รูปภาพ */}
          <div className="h-52 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400 overflow-hidden relative dark:bg-black">
               {image_url ? (
                 <img src={image_url} alt="cover" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
               ) : (
                 <span className="text-5xl group-hover:text-red-500 transition-colors">⚡</span>
               )}
          </div>
          
          {/* หัวข้อ */}
          <h3 className="font-bold text-xl text-gray-800 group-hover:text-red-600 transition-colors mb-3 line-clamp-2 flex-1 leading-tight dark:text-gray-100">
            {title}
          </h3>
          
          {/* Footer ของการ์ด */}
          <div className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center dark:border-neutral-800 dark:text-gray-400">
             <span className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-full dark:bg-black">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span>
               {username || 'ไม่ระบุตัวตน'}
             </span>
             <span>
               {new Date(created_at).toLocaleDateString('th-TH')}
             </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}