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
        <Link href={hrefFor(page - 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold hover:border-red-500 hover:text-red-600 dark:border-neutral-700">
          ← Previous
        </Link>
      ) : <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 dark:border-neutral-800">← Previous</span>}
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Page {page} / {totalPages}</span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold hover:border-red-500 hover:text-red-600 dark:border-neutral-700">
          Next →
        </Link>
      ) : <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 dark:border-neutral-800">Next →</span>}
    </nav>
  );
}
