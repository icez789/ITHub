import { BarChart3 } from 'lucide-react';

export default function ResearchAnalyticsLoading() {
  return (
    <main className="ithub-page-container mx-auto max-w-6xl pb-24 pt-8 text-[var(--app-text)] md:pb-12 md:pt-12" aria-busy="true">
      <div className="flex items-center gap-3 border-b border-[var(--app-border)] pb-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]"><BarChart3 aria-hidden="true" size={21} /></span>
        <div>
          <h1 className="text-2xl font-bold">กำลังโหลด Research Analytics</h1>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">กำลังคำนวณข้อมูลแบบ aggregate และตรวจ privacy threshold</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] motion-reduce:animate-none" />)}
      </div>
      <p role="status" className="sr-only">กำลังโหลดข้อมูล</p>
    </main>
  );
}
