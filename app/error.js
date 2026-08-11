'use client';

import Link from 'next/link';

export default function ErrorPage({ error, reset }) {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-6 py-16">
      <section role="alert" className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-neutral-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950/50" aria-hidden="true">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">โหลดข้อมูลไม่สำเร็จ</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-600 dark:text-gray-300">
          การเชื่อมต่ออาจสะดุดชั่วคราว กรุณาลองใหม่อีกครั้ง หรือลองกลับมาที่หน้าแรก
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            ลองโหลดอีกครั้ง
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
          >
            กลับหน้าแรก
          </Link>
        </div>
        {error?.digest && (
          <p className="mt-5 text-xs text-gray-400">รหัสข้อผิดพลาด: {error.digest}</p>
        )}
      </section>
    </main>
  );
}
