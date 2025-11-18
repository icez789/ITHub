'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TopicCard({ id, title, username, created_at, image_url, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.03, transition: { delay: 0 } }}
      whileTap={{ scale: 0.95 }}
      className="h-full"
    >
      <Link href={`/topic/${id}`}>
        {/* Light Mode: bg-white border-gray-200
           Dark Mode:  bg-neutral-900 border-neutral-800 (สีเทาเข้มมาก ตัดกับพื้นดำ)
        */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-red-500 hover:shadow-[0_4px_20px_rgba(220,38,38,0.15)] transition-colors duration-300 cursor-pointer group relative overflow-hidden h-full flex flex-col dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-red-500 dark:hover:shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="absolute top-3 right-3 w-2 h-2 bg-gray-300 rounded-full group-hover:bg-red-500 transition-colors z-10 dark:bg-neutral-700"></div>
          
          <div className="h-52 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors overflow-hidden relative dark:bg-black">
               {image_url ? (
                 <img src={image_url} alt="cover" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
               ) : (
                 <span className="text-5xl">⚡</span>
               )}
          </div>
          
          <h3 className="font-bold text-xl text-gray-800 group-hover:text-red-600 transition-colors mb-3 line-clamp-2 flex-1 leading-tight dark:text-gray-100">
            {title}
          </h3>
          
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