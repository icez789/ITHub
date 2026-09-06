import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Rss, UserRound } from 'lucide-react';
import { redirect } from 'next/navigation';
import FollowButton from '../../../components/FollowButton';
import { getCurrentUser } from '../../../lib/auth';
import { getFollowingOverview } from '../../../lib/discovery';

export const metadata = {
  title: 'สิ่งที่ติดตาม | ITHub',
  description: 'จัดการหมวดหมู่และผู้เขียนที่คุณติดตามใน ITHub',
};

export default async function FollowingPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=%2Fprofile%2Ffollowing');
  const params = await searchParams;
  const requestedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const overview = await getFollowingOverview(user.id, { page, pageSize });
  const totalPages = Math.max(1, Math.ceil(overview.totalAuthors / pageSize));
  if (page > totalPages) redirect(`/profile/following?page=${totalPages}`);

  return (
    <main className="ithub-page-container mx-auto max-w-5xl pb-24 pt-8 md:pb-12 md:pt-12">
      <Link href="/profile" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-accent-text)]">
        <ArrowLeft aria-hidden="true" size={17} /> กลับไปโปรไฟล์
      </Link>

      <header className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--app-accent-text)]">Personal discovery</p>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-[var(--app-text)] md:text-4xl"><Rss aria-hidden="true" /> สิ่งที่ติดตาม</h1>
        <p className="mt-2 max-w-2xl text-[var(--app-text-muted)]">รายการนี้เป็นข้อมูลส่วนตัว ใช้สำหรับจัดฟีดกำลังติดตามและคำแนะนำของคุณเท่านั้น</p>
      </header>

      <section className="ithub-card p-5 sm:p-6" aria-labelledby="followed-categories-heading">
        <h2 id="followed-categories-heading" className="text-xl font-bold text-[var(--app-text)]">หมวดหมู่</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">เลือกจากหมวดหลักของ ITHub ได้ตามต้องการ</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.categories.map((item) => (
            <div key={item.category} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3.5">
              <span className="font-semibold text-[var(--app-text)]">{item.category}</span>
              <FollowButton kind="category" target={item.category} label={`หมวด ${item.category}`} initialFollowing={item.following} isAuthenticated compact />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 ithub-card p-5 sm:p-6" aria-labelledby="followed-authors-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="followed-authors-heading" className="text-xl font-bold text-[var(--app-text)]">ผู้เขียน</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">ติดตามอยู่ {overview.totalAuthors.toLocaleString('th-TH')} คน</p>
          </div>
          <Link href="/?feed=following" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-accent-text)] hover:bg-[var(--app-primary-soft)]">เปิดฟีดกำลังติดตาม</Link>
        </div>

        {overview.authors.length ? (
          <div className="mt-5 divide-y divide-[var(--app-border)]">
            {overview.authors.map((author) => (
              <article key={author.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-subtle)]">
                  {author.avatar_url
                    ? <Image src={author.avatar_url} alt="" fill sizes="44px" className="object-cover" />
                    : <UserRound aria-hidden="true" size={20} className="text-[var(--app-text-muted)]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[var(--app-text)]">{author.username}</span>
                  <span className="block truncate text-sm text-[var(--app-text-muted)]">{author.bio || 'สมาชิกชุมชน ITHub'}</span>
                </span>
                <FollowButton kind="author" target={author.id} label={author.username} initialFollowing isAuthenticated compact />
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-subtle)] px-5 py-10 text-center">
            <UserRound aria-hidden="true" className="mx-auto text-[var(--app-text-muted)]" size={30} />
            <p className="mt-3 font-semibold text-[var(--app-text)]">ยังไม่ได้ติดตามผู้เขียน</p>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">คุณสามารถติดตามผู้เขียนจากหน้ารายละเอียดกระทู้</p>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="หน้ารายการผู้เขียนที่ติดตาม" className="mt-6 flex items-center justify-center gap-3 border-t border-[var(--app-border)] pt-5">
            <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={`/profile/following?page=${Math.max(1, page - 1)}`} className={`inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-semibold ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[var(--app-surface-subtle)]'}`}><ChevronLeft aria-hidden="true" size={16} /> ก่อนหน้า</Link>
            <span className="text-sm text-[var(--app-text-muted)]">{page} / {totalPages}</span>
            <Link aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} href={`/profile/following?page=${Math.min(totalPages, page + 1)}`} className={`inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-semibold ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-[var(--app-surface-subtle)]'}`}>ถัดไป <ChevronRight aria-hidden="true" size={16} /></Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
