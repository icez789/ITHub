'use client';

import Link from 'next/link';
import { AlertTriangle, Home, LoaderCircle, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useTransition } from 'react';

export default function ResearchRouteError({ error, reset, title, description }) {
  const headingRef = useRef(null);
  const [retrying, startTransition] = useTransition();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="ithub-page-container mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center py-12">
      <section
        role="alert"
        aria-labelledby="research-route-error-heading"
        aria-describedby="research-route-error-description"
        className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center shadow-sm sm:p-8"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-danger)]" aria-hidden="true">
          <AlertTriangle size={23} />
        </span>
        <h1 ref={headingRef} id="research-route-error-heading" tabIndex={-1} className="mt-4 text-2xl font-bold text-[var(--app-text)] focus:outline-none">
          {title}
        </h1>
        <p id="research-route-error-description" className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--app-text-muted)]">
          {description}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            disabled={retrying}
            onClick={() => startTransition(() => reset())}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60"
          >
            {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} /> : <RotateCcw aria-hidden="true" size={17} />}
            {retrying ? 'กำลังลองใหม่' : 'ลองโหลดอีกครั้ง'}
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]">
            <Home aria-hidden="true" size={17} /> กลับหน้าแรก
          </Link>
        </div>
        {error?.digest ? <p className="mt-5 text-xs text-[var(--app-text-muted)]">รหัสข้อผิดพลาด: {error.digest}</p> : null}
      </section>
    </main>
  );
}
