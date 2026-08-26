import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="ithub-page-container flex min-h-[calc(100dvh-8rem)] items-center justify-center py-10 sm:py-14">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm" aria-labelledby="auth-title">
        <div className="border-b border-[var(--app-border)] bg-zinc-950 px-6 py-7 text-center text-white sm:px-8">
          <Link href="/" className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 font-bold" aria-label="กลับหน้าแรก ITHub">IT</Link>
          <h1 id="auth-title" className="mt-4 text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
        </div>
        <div className="px-6 py-7 sm:px-8">
          {children}
          <div className="mt-6 border-t border-[var(--app-border)] pt-5 text-center text-sm text-[var(--app-text-muted)]">{footer}</div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--app-text-muted)]"><ShieldCheck aria-hidden="true" size={14} /> ระบบจะไม่แสดงรหัสผ่านของคุณต่อสาธารณะ</p>
        </div>
      </section>
    </main>
  );
}
