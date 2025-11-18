'use client'; // 👈 สำคัญมาก! บอกว่าเป็น Client Component

import React from 'react';
import Image from 'next/image'; // (Optional: ถ้าจะใช้ Image ของ Next.js)

export default function ProfileAvatar({ user, updateAvatar, myTopicsCount }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md text-center border-t-4 border-gray-800">
      
      {/* ส่วนแสดง Avatar */}
      <div className="relative w-32 h-32 mx-auto mb-4 group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center relative">
           {user.avatar_url ? (
             // ใช้ img ธรรมดาเพื่อความชัวร์เรื่อง Path
             <img 
               src={user.avatar_url} 
               alt="Avatar" 
               className="w-full h-full object-cover"
             />
           ) : (
             <span className="text-6xl font-bold text-gray-400">
               {user.username.charAt(0).toUpperCase()}
             </span>
           )}
        </div>
        
        {/* ปุ่มเปลี่ยนรูป */}
        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-sm font-bold z-10">
           เปลี่ยนรูป
           {/* Form สำหรับอัปโหลด */}
           <form action={updateAvatar}>
               <input 
                 type="file" 
                 name="avatar" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={(e) => e.target.form.requestSubmit()} // 👈 บรรทัดปัญหา ย้ายมาอยู่นี่แล้วใช้ได้เลย
               />
           </form>
        </label>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
      <p className="text-gray-500 text-sm mb-6">{user.email}</p>
      
      <div className="text-left bg-gray-50 p-4 rounded-lg text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">สถานะ:</span>
          <span className={`font-bold ${user.role === 'admin' ? 'text-red-600' : 'text-green-600'}`}>
            {user.role === 'admin' ? 'Admin (ผู้ดูแล)' : 'สมาชิกทั่วไป'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">วันที่สมัคร:</span>
          <span>{new Date(user.created_at).toLocaleDateString('th-TH')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">กระทู้ทั้งหมด:</span>
          <span className="font-bold">{myTopicsCount}</span>
        </div>
      </div>
    </div>
  );
}