import Link from 'next/link';

export default function InfoPage({ eyebrow, title, intro, updatedAt, sections, children }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <header className="mb-10">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--app-accent-text)]">{eyebrow}</p>
        <h1 className="mb-4 text-3xl font-black text-[var(--app-text)] md:text-5xl">{title}</h1>
        <p className="text-lg leading-relaxed text-[var(--app-text-muted)]">{intro}</p>
        {updatedAt && <p className="mt-4 text-sm text-[var(--app-text-muted)]">ปรับปรุงล่าสุด: {updatedAt}</p>}
      </header>

      <div className="space-y-8">
        {sections.map((section, index) => (
          <section key={section.title} className="ithub-card rounded-2xl p-6 shadow-sm md:p-8">
            <h2 className="mb-3 text-xl font-bold text-[var(--app-text)]">
              {index + 1}. {section.title}
            </h2>
            {section.content && <p className="whitespace-pre-line leading-7 text-[var(--app-text-muted)]">{section.content}</p>}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-[var(--app-text-muted)]">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
        {children}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="rounded-lg bg-[var(--app-primary)] px-5 py-3 font-bold text-[var(--app-primary-contrast)] transition hover:bg-[var(--app-primary-hover)]">กลับหน้าแรก</Link>
        <Link href="/help" className="rounded-lg border border-[var(--app-border)] px-5 py-3 font-bold transition hover:bg-[var(--app-surface-subtle)]">ติดต่อเรา</Link>
      </div>
    </article>
  );
}
