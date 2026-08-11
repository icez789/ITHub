import Link from 'next/link';

export default function InfoPage({ eyebrow, title, intro, updatedAt, sections, children }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <header className="mb-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600 mb-3">{eyebrow}</p>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">{title}</h1>
        <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-300">{intro}</p>
        {updatedAt && <p className="mt-4 text-sm text-gray-400">ปรับปรุงล่าสุด: {updatedAt}</p>}
      </header>

      <div className="space-y-8">
        {sections.map((section, index) => (
          <section key={section.title} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {index + 1}. {section.title}
            </h2>
            {section.content && <p className="text-gray-600 dark:text-gray-300 leading-7 whitespace-pre-line">{section.content}</p>}
            {section.items && (
              <ul className="mt-3 space-y-2 list-disc pl-5 text-gray-600 dark:text-gray-300 leading-7">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
        {children}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="rounded-lg bg-red-600 text-white font-bold px-5 py-3 hover:bg-red-700 transition">กลับหน้าแรก</Link>
        <Link href="/help" className="rounded-lg border border-gray-300 dark:border-neutral-700 font-bold px-5 py-3 hover:bg-gray-50 dark:hover:bg-neutral-900 transition">ติดต่อเรา</Link>
      </div>
    </article>
  );
}
