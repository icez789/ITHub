import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Clock3,
  Flame,
  Heart,
  MessageSquareText,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import db from '../lib/db';
import { plainText } from '../lib/content';
import TopicCard from '../components/TopicCard';

const allowedCategories = new Set(['Hardware', 'Software', 'Network', 'AI & Data', 'General']);

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || '').trim().slice(0, 100);
  const requestedCategory = String(params?.category || '');
  const category = allowedCategories.has(requestedCategory) ? requestedCategory : '';
  const parsedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10_000) : 1;
  const pageSize = 9;
  const offset = (page - 1) * pageSize;
  const requestedSort = params?.sort || 'latest';
  const sort = ['latest', 'popular', 'likes'].includes(requestedSort) ? requestedSort : 'latest';

  const buildLink = (newSort, newPage) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (category) query.set('category', category);
    query.set('sort', newSort || sort);
    if (newPage > 1) query.set('page', newPage);
    return `/?${query.toString()}`;
  };

  const conditions = [];
  const sqlParams = [];
  if (search) {
    conditions.push('(INSTR(topics.title, ?) > 0 OR INSTR(COALESCE(topics.content, \'\'), ?) > 0)');
    sqlParams.push(search, search);
  }
  if (category) {
    conditions.push('topics.category = ?');
    sqlParams.push(category);
  }
  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = search ? 'topics.created_at DESC' : 'topics.is_pinned DESC, topics.created_at DESC';
  if (sort === 'popular') orderBy = 'topics.views DESC, topics.created_at DESC';
  if (sort === 'likes') orderBy = 'like_count DESC, topics.created_at DESC';

  const countSql = `SELECT COUNT(*) as total FROM topics ${whereClause}`;
  const topicsSql = `
    SELECT
      topics.id,
      topics.title,
      topics.category,
      topics.content,
      topics.image_url,
      topics.views,
      topics.is_pinned,
      topics.is_locked,
      topics.created_at,
      users.username,
      (SELECT COUNT(*) FROM comments WHERE comments.topic_id = topics.id) AS comment_count,
      (SELECT COUNT(*) FROM likes WHERE likes.topic_id = topics.id) AS like_count
    FROM topics
    LEFT JOIN users ON topics.user_id = users.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [countResult, topicsResult, siteStatsResult, popularCategoriesResult] = await Promise.all([
    db.query(countSql, sqlParams),
    db.query(topicsSql, [...sqlParams, pageSize, offset]),
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM topics) AS total_topics,
        (SELECT COUNT(*) FROM users WHERE is_banned = 0) AS total_members,
        (SELECT COUNT(*) FROM users WHERE is_banned = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS new_members
    `),
    db.query(`
      SELECT category, COUNT(*) AS topic_count
      FROM topics
      WHERE category IN ('Hardware', 'Software', 'Network', 'AI & Data', 'General')
      GROUP BY category
      ORDER BY topic_count DESC, category ASC
      LIMIT 5
    `),
  ]);

  const totalTopics = Number(countResult[0][0].total);
  const totalPages = Math.ceil(totalTopics / pageSize);
  const topics = topicsResult[0];
  const siteStats = siteStatsResult[0][0] || {};
  const popularCategories = popularCategoriesResult[0] || [];
  const numberFormat = new Intl.NumberFormat('th-TH');
  const showHero = !search && !category && page === 1 && sort === 'latest';

  const sortOptions = [
    { value: 'latest', label: 'ล่าสุด', icon: Clock3 },
    { value: 'popular', label: 'ยอดนิยม', icon: Flame },
    { value: 'likes', label: 'ถูกใจมาก', icon: Heart },
  ];

  return (
    <div className="ithub-page-container py-5 pb-24 sm:py-6 md:pb-8 lg:py-8">
      {showHero && (
        <section className="relative mb-6 flex min-h-[156px] overflow-hidden rounded-3xl border border-red-950/50 bg-gradient-to-br from-zinc-950 via-red-950 to-red-800 px-5 py-5 text-white shadow-sm sm:h-[180px] sm:px-7 lg:px-9">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.45) 0.8px, transparent 0.8px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
            <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-red-200">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              ITHub Community
            </p>
            <h1 className="max-w-2xl text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              ถาม แบ่งปัน และเติบโตไปกับชุมชนไอที
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm text-zinc-300 sm:block">
              พื้นที่สำหรับค้นหาคำตอบ แลกเปลี่ยนประสบการณ์ และช่วยกันแก้ปัญหาด้านเทคโนโลยี
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <a href="#topic-feed" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
                สำรวจกระทู้
              </a>
              <Link href="/create" className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                <Plus aria-hidden="true" className="h-4 w-4" />
                สร้างกระทู้
              </Link>
            </div>
          </div>

          <div className="relative z-10 hidden w-60 shrink-0 grid-cols-2 content-center gap-3 lg:grid">
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{numberFormat.format(Number(siteStats.total_topics || 0))}</p>
              <p className="text-xs text-zinc-300">กระทู้ทั้งหมด</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{numberFormat.format(Number(siteStats.total_members || 0))}</p>
              <p className="text-xs text-zinc-300">สมาชิกชุมชน</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
        <main className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-red-600 dark:text-red-400">Community feed</p>
              <h2 className="text-xl font-bold text-zinc-950 sm:text-2xl dark:text-zinc-50">
                {search ? `ผลการค้นหา “${search}”` : category ? `หมวดหมู่ ${category}` : 'กระทู้จากชุมชน'}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">หน้า {page} · {numberFormat.format(totalTopics)} กระทู้</p>
            </div>

            <div className="flex w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1 sm:w-auto" aria-label="เรียงลำดับกระทู้">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isActive = sort === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildLink(option.value, 1)}
                    scroll={false}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:px-3 ${isActive ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <section id="topic-feed" data-tour="topic-list" aria-label="รายการกระทู้" className="scroll-mt-4 space-y-3">
            {topics.length > 0 ? topics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                id={topic.id}
                title={topic.title}
                category={topic.category}
                excerpt={plainText(topic.content, 220)}
                username={topic.username}
                createdAt={topic.created_at}
                imageUrl={topic.image_url}
                views={topic.views}
                commentCount={topic.comment_count}
                likeCount={topic.like_count}
                isPinned={Boolean(topic.is_pinned)}
                isLocked={Boolean(topic.is_locked)}
                index={index}
              />
            )) : (
              <div className="ithub-card py-16 text-center">
                <MessageSquareText aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">ยังไม่พบกระทู้ที่ตรงกับเงื่อนไข</p>
                <Link href="/" className="mt-2 inline-block text-sm font-semibold text-red-600 hover:underline dark:text-red-400">ดูทุกกระทู้</Link>
              </div>
            )}
          </section>

          {totalPages > 1 && (
            <nav aria-label="เปลี่ยนหน้ารายการกระทู้" className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-5">
              {page > 1 ? (
                <Link href={buildLink(sort, page - 1)} scroll={false} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> ก่อนหน้า
                </Link>
              ) : <span />}
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={buildLink(sort, page + 1)} scroll={false} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  ถัดไป <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : <span />}
            </nav>
          )}
        </main>

        <aside className="hidden xl:block" aria-label="ข้อมูลชุมชน">
          <div className="sticky top-6 space-y-4">
            <section className="ithub-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <BarChart3 aria-hidden="true" className="h-5 w-5 text-red-600 dark:text-red-400" />
                ภาพรวมชุมชน
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">กระทู้ทั้งหมด</dt><dd className="font-bold">{numberFormat.format(Number(siteStats.total_topics || 0))}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">สมาชิก</dt><dd className="font-bold">{numberFormat.format(Number(siteStats.total_members || 0))}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">สมาชิกใหม่ 7 วัน</dt><dd className="font-bold text-emerald-600 dark:text-emerald-400">+{numberFormat.format(Number(siteStats.new_members || 0))}</dd></div>
              </dl>
            </section>

            <section className="ithub-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                <UsersRound aria-hidden="true" className="h-5 w-5 text-red-600 dark:text-red-400" />
                หมวดหมู่ที่กำลังคุยกัน
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularCategories.length > 0 ? popularCategories.map((item) => (
                  <Link key={item.category} href={{ pathname: '/', query: { category: item.category } }} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-red-50 hover:text-red-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/35 dark:hover:text-red-300">
                    {item.category} · {numberFormat.format(Number(item.topic_count))}
                  </Link>
                )) : <span className="text-sm text-zinc-500">ยังไม่มีข้อมูลหมวดหมู่</span>}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
