import Link from 'next/link';
import React from 'react';
import { Home, MapPinOff } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="ithub-page-container mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center py-16 text-[var(--app-text)]">
      <section className="w-full rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <MapPinOff aria-hidden="true" size={30} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">404</p>
        <h1 className="mt-2 text-3xl font-bold">ไม่พบหน้าที่คุณต้องการ</h1>
        <p className="mx-auto mb-8 mt-3 max-w-md text-[var(--app-muted)]">
          หน้านี้อาจถูกลบ เปลี่ยนที่อยู่ หรือไม่มีอยู่ในระบบ ลองกลับไปสำรวจกระทู้จากหน้าแรก
        </p>
      <Link 
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
      >
        <Home aria-hidden="true" size={18} /> กลับหน้าแรก
      </Link>
      </section>
    </main>
  );
}
