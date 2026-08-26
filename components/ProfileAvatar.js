'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Settings } from 'lucide-react';

export default function ProfileAvatar({ user, updateAvatar, myTopicsCount }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md text-center border-t-4 border-gray-800 dark:bg-neutral-900 dark:border-neutral-700">
      
      {/* ส่วนรูปโปรไฟล์ */}
      <div className="relative w-32 h-32 mx-auto mb-4 group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center relative dark:border-neutral-700 dark:bg-neutral-800">
           {user.avatar_url ? (
             <Image src={user.avatar_url} alt={`รูปโปรไฟล์ของ ${user.username}`} fill sizes="128px" className="object-cover" />
           ) : (
             <span className="text-6xl font-bold text-gray-400">{user.username.charAt(0).toUpperCase()}</span>
           )}
        </div>
        
        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-sm font-bold z-10">
           เปลี่ยนรูป
           <form action={updateAvatar}>
               <input type="file" name="avatar" accept="image/*" className="hidden" onChange={(e) => e.target.form.requestSubmit()} />
           </form>
        </label>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.username}</h2>
      <p className="text-gray-500 text-sm mb-4 dark:text-gray-400">{user.email}</p>
      
      {/* ส่วน Bio */}
      {user.bio && (
        <div className="mb-6 text-gray-600 italic text-sm p-3 rounded-lg border border-gray-100 
                        bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300 
                        break-words whitespace-pre-wrap">
          <span aria-hidden="true">“</span>{user.bio}<span aria-hidden="true">”</span>
        </div>
      )}

      {/* กลุ่มปุ่ม Action */}
      <div className="flex flex-col gap-3 mb-6">
          {/* ปุ่มแก้ไข */}
          <Link href="/profile/edit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)]">
            <Settings aria-hidden="true" size={17} /> แก้ไขข้อมูลส่วนตัว
          </Link>

          {/* ปุ่มดูรายการที่บันทึก (Saved Topics) */}
          <Link href="/profile/saved" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <Bookmark aria-hidden="true" size={17} /> รายการที่บันทึกไว้
          </Link>
      </div>
      
      {/* ส่วนสถิติ */}
      <div className="text-left bg-gray-50 p-4 rounded-lg text-sm space-y-2 dark:bg-black dark:border dark:border-neutral-800">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">สถานะ:</span>
          <span className={`font-bold ${user.role === 'admin' ? 'text-red-600' : 'text-green-600'}`}>
            {user.role === 'admin' ? 'Admin (ผู้ดูแล)' : 'สมาชิกทั่วไป'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">วันที่สมัคร:</span>
          <span className="dark:text-gray-300">{new Date(user.created_at).toLocaleDateString('th-TH')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">กระทู้ทั้งหมด:</span>
          <span className="font-bold dark:text-gray-300">{myTopicsCount}</span>
        </div>
      </div>
    </div>
  );
}
