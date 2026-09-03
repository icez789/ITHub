import Link from 'next/link';

export default function AdminPagination({ path, page, totalPages, query = '' }) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage) => ({
    pathname: path,
    query: {
      ...(query ? { q: query } : {}),
      ...(targetPage > 1 ? { page: targetPage } : {}),
    },
  });

  return (
    <nav aria-label="หน้าผลลัพธ์" className="mt-6 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-bold hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)]">
          ← Previous
        </Link>
      ) : <span className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-text-muted)] opacity-60">← Previous</span>}
      <span className="text-sm font-medium text-[var(--app-text-muted)]">Page {page} / {totalPages}</span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-bold hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)]">
          Next →
        </Link>
      ) : <span className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-text-muted)] opacity-60">Next →</span>}
    </nav>
  );
}
