'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Settings } from 'lucide-react';
import { roleLabel } from '../lib/roles';

export default function ProfileAvatar({ user, updateAvatar, myTopicsCount }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] border-t-4 border-t-[var(--app-primary)] bg-[var(--app-surface)] p-6 text-center shadow-md">
      
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
      
      <h2 className="text-2xl font-bold text-[var(--app-text)]">{user.username}</h2>
      <p className="mb-4 text-sm text-[var(--app-text-muted)]">{user.email}</p>
      
      {/* ส่วน Bio */}
      {user.bio && (
        <div className="mb-6 break-words whitespace-pre-wrap rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-sm italic text-[var(--app-text-muted)]">
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
          <Link href="/profile/saved" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] px-4 py-2 font-semibold text-[var(--app-accent-text)] transition-colors hover:border-[var(--app-border-strong)]">
            <Bookmark aria-hidden="true" size={17} /> รายการที่บันทึกไว้
          </Link>
      </div>
      
      {/* ส่วนสถิติ */}
      <div className="space-y-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--app-text-muted)]">สถานะ:</span>
          <span className={`font-bold ${
            user.role === 'super_admin' ? 'text-amber-600' :
            user.role === 'admin' ? 'text-red-600' :
            user.role === 'teacher' ? 'text-blue-600 dark:text-blue-400' :
            'text-green-600'
          }`}>
            {roleLabel(user.role)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--app-text-muted)]">วันที่สมัคร:</span>
          <span>{new Date(user.created_at).toLocaleDateString('th-TH')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--app-text-muted)]">กระทู้ทั้งหมด:</span>
          <span className="font-bold">{myTopicsCount}</span>
        </div>
      </div>
    </div>
  );
}
