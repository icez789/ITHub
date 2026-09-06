import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Clock3,
  Compass,
  Flame,
  Heart,
  MessageSquareText,
  Plus,
  Rss,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import db from '../lib/db';
import { plainText } from '../lib/content';
import { getCurrentUser } from '../lib/auth';
import {
  getFollowCounts,
  getFollowState,
  getTopicFeed,
  getTrendingTopics,
} from '../lib/discovery';
import {
  DISCOVERY_FEEDS,
  DISCOVERY_SORTS,
  DISCOVERY_CATEGORIES,
  isDiscoveryCategory,
} from '../lib/discoveryShared';
import TopicCard from '../components/TopicCard';
import FollowButton from '../components/FollowButton';

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const search = String(params?.search || '').trim().slice(0, 100);
  const requestedCategory = String(params?.category || '');
  const category = isDiscoveryCategory(requestedCategory) ? requestedCategory : '';
  const parsedPage = Number.parseInt(params?.page || '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10_000) : 1;
  const pageSize = 9;
  const requestedSort = params?.sort || 'latest';
  const sort = DISCOVERY_SORTS.has(requestedSort) ? requestedSort : 'latest';
  const requestedFeed = String(params?.feed || '');
  const forYouEnabled = process.env.ITHUB_DISCOVERY_FOR_YOU_ENABLED === 'true';
  const feed = DISCOVERY_FEEDS.has(requestedFeed) && (requestedFeed !== 'for-you' || forYouEnabled)
    ? requestedFeed : 'community';
  const personalizedGuest = feed !== 'community' && !currentUser;

  const buildLink = (newSort, newPage) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (category) query.set('category', category);
    if (feed !== 'community') query.set('feed', feed);
    if (feed !== 'for-you') query.set('sort', newSort || sort);
    if (newPage > 1) query.set('page', newPage);
    return `/?${query.toString()}`;
  };

  const [feedResult, siteStatsResult, popularCategoriesResult, followState, followCounts] = await Promise.all([
    personalizedGuest
      ? Promise.resolve({ total: 0, topics: [] })
      : getTopicFeed({ feed, userId: currentUser?.id, search, category, sort, page, pageSize }),
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
    currentUser && category
      ? getFollowState(currentUser.id, { category })
      : Promise.resolve({ categoryFollowing: false, authorFollowing: false }),
    currentUser && feed !== 'community'
      ? getFollowCounts(currentUser.id)
      : Promise.resolve({ categories: 0, authors: 0, total: 0 }),
  ]);

  const totalTopics = feedResult.total;
  const totalPages = Math.ceil(totalTopics / pageSize);
  const topics = feedResult.topics;
  const siteStats = siteStatsResult[0][0] || {};
  const popularCategories = popularCategoriesResult[0] || [];
  const showTrending = feed === 'for-you' && Boolean(currentUser) && page === 1 && !search && !category;
  const trendingTopics = showTrending
    ? await getTrendingTopics({ excludeIds: topics.map((topic) => topic.id), userId: currentUser.id, limit: 3 })
    : [];
  const numberFormat = new Intl.NumberFormat('th-TH');
  const showHero = feed === 'community' && !search && !category && page === 1 && sort === 'latest';
  const currentHrefQuery = new URLSearchParams();
  if (feed !== 'community') currentHrefQuery.set('feed', feed);
  if (search) currentHrefQuery.set('search', search);
  if (category) currentHrefQuery.set('category', category);
  if (feed !== 'for-you' && sort !== 'latest') currentHrefQuery.set('sort', sort);
  if (page > 1) currentHrefQuery.set('page', String(page));
  const currentHref = `/${currentHrefQuery.size ? `?${currentHrefQuery}` : ''}`;
  const loginHref = `/login?next=${encodeURIComponent(currentHref)}`;

  const buildFeedLink = (nextFeed) => {
    const query = new URLSearchParams();
    if (nextFeed !== 'community') query.set('feed', nextFeed);
    if (search) query.set('search', search);
    if (category) query.set('category', category);
    if (nextFeed !== 'for-you' && sort !== 'latest') query.set('sort', sort);
    return query.size ? `/?${query}` : '/';
  };

  const sortOptions = [
    { value: 'latest', label: 'ล่าสุด', icon: Clock3 },
    { value: 'popular', label: 'ยอดนิยม', icon: Flame },
    { value: 'likes', label: 'ถูกใจมาก', icon: Heart },
  ];

  return (
    <div className="ithub-page-container py-5 pb-24 sm:py-6 md:pb-8 lg:py-8">
      {showHero && (
        <section className="ithub-hero relative mb-5 flex min-h-[146px] overflow-hidden rounded-3xl border border-black/15 px-5 py-4 text-white shadow-sm sm:h-[168px] sm:px-7 lg:px-9">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.45) 0.8px, transparent 0.8px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
            <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
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
              <a href="#topic-feed" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--app-primary)] transition-colors hover:bg-white/90">
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
          <nav aria-label="เลือกฟีด" className="mb-4 flex w-full gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1 sm:w-fit">
            {[
              { value: 'community', label: 'ล่าสุด', icon: Clock3 },
              { value: 'following', label: 'กำลังติดตาม', icon: Rss },
              { value: 'for-you', label: 'สำหรับคุณ', icon: Compass },
            ].filter((option) => option.value !== 'for-you' || forYouEnabled).map((option) => {
              const Icon = option.icon;
              const active = feed === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildFeedLink(option.value)}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:text-sm ${active ? 'bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]'}`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {option.label}
                </Link>
              );
            })}
          </nav>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent-text)]">
                {feed === 'following' ? 'Following feed' : feed === 'for-you' ? 'Personalized feed' : 'Community feed'}
              </p>
              <h2 className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">
                {search
                  ? `ผลการค้นหา “${search}”`
                  : category
                    ? `หมวดหมู่ ${category}`
                    : feed === 'following'
                      ? 'กระทู้จากสิ่งที่ติดตาม'
                      : feed === 'for-you'
                        ? 'คัดสรรสำหรับคุณ'
                        : 'กระทู้จากชุมชน'}
              </h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                {personalizedGuest ? 'เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล' : `หน้า ${page} · ${numberFormat.format(totalTopics)} กระทู้`}
              </p>
            </div>

            {feed !== 'for-you' ? <div className="flex w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1 sm:w-auto" aria-label="เรียงลำดับกระทู้">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isActive = sort === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildLink(option.value, 1)}
                    scroll={false}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:px-3 ${isActive ? 'bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]'}`}
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    {option.label}
                  </Link>
                );
              })}
            </div> : null}
            {currentUser && feed === 'following' ? (
              <Link href="/profile/following" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition-colors hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)] sm:text-sm">
                <UsersRound aria-hidden="true" className="h-4 w-4" /> จัดการสิ่งที่ติดตาม
              </Link>
            ) : null}
          </div>

          {(search || category) ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-sm">
              <span className="font-semibold text-[var(--app-text)]">กำลังกรอง:</span>
              {search ? <span className="rounded-lg bg-[var(--app-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--app-accent-text)]">คำค้น “{search}”</span> : null}
              {category ? <span className="rounded-lg bg-[var(--app-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)]">หมวด {category}</span> : null}
              {category ? (
                <FollowButton
                  key={category}
                  kind="category"
                  target={category}
                  label={`หมวด ${category}`}
                  initialFollowing={followState.categoryFollowing}
                  isAuthenticated={Boolean(currentUser)}
                  loginHref={loginHref}
                  compact
                />
              ) : null}
              <Link href="/" className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--app-accent-text)] hover:bg-[var(--app-primary-soft)]">ล้างตัวกรอง</Link>
            </div>
          ) : null}

          <section id="topic-feed" data-tour="topic-list" aria-label="รายการกระทู้" className="scroll-mt-4 space-y-3">
            {personalizedGuest ? (
              <div className="ithub-card px-5 py-12 text-center sm:px-8">
                <Compass aria-hidden="true" className="mx-auto h-9 w-9 text-[var(--app-accent-text)]" />
                <h3 className="mt-3 text-lg font-bold text-[var(--app-text)]">เข้าสู่ระบบเพื่อเปิดฟีดส่วนบุคคล</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--app-text-muted)]">ติดตามหมวดและผู้เขียนที่สนใจ แล้ว ITHub จะรวมกระทู้เหล่านั้นไว้ให้คุณโดยเฉพาะ</p>
                <Link href={loginHref} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--app-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--app-primary-contrast)] hover:bg-[var(--app-primary-hover)]">เข้าสู่ระบบ</Link>
              </div>
            ) : topics.length > 0 ? topics.map((topic, index) => (
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
                recommendationReason={feed === 'for-you' ? topic.recommendation_reason : null}
                index={index}
              />
            )) : feed !== 'community' && followCounts.total === 0 ? (
              <div className="ithub-card px-5 py-8 sm:px-7">
                <div className="mx-auto max-w-2xl text-center">
                  <Rss aria-hidden="true" className="mx-auto h-9 w-9 text-[var(--app-accent-text)]" />
                  <h3 className="mt-3 text-lg font-bold text-[var(--app-text)]">เริ่มจากเลือกหมวดที่คุณสนใจ</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">รายการติดตามเป็นข้อมูลส่วนตัว และคุณเปลี่ยนใจได้ทุกเมื่อ</p>
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  {DISCOVERY_CATEGORIES.map((item) => (
                    <FollowButton
                      key={item}
                      kind="category"
                      target={item}
                      label={`หมวด ${item}`}
                      initialFollowing={false}
                      isAuthenticated
                      compact
                    />
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <Link href="/profile/following" className="text-sm font-semibold text-[var(--app-accent-text)] hover:underline">จัดการสิ่งที่ติดตาม</Link>
                </div>
              </div>
            ) : (
              <div className="ithub-card py-16 text-center">
                <MessageSquareText aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-3 font-semibold text-[var(--app-text)]">ยังไม่พบกระทู้ที่ตรงกับเงื่อนไข</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">ลองลดคำค้นหา เลือกหมวดอื่น หรือกลับไปดูกระทู้ทั้งหมด</p>
                <Link href="/" className="mt-3 inline-block text-sm font-semibold text-[var(--app-accent-text)] hover:underline">ล้างตัวกรองและดูทุกกระทู้</Link>
              </div>
            )}
          </section>

          {showTrending && trendingTopics.length > 0 ? (
            <section className="mt-8 border-t border-[var(--app-border)] pt-7" aria-labelledby="trending-fallback-heading">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-text-muted)]">Community signal</p>
                <h2 id="trending-fallback-heading" className="mt-1 text-lg font-bold text-[var(--app-text)]">กำลังได้รับความนิยมในชุมชน</h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">ส่วนนี้เป็นกระทู้ยอดนิยมทั่วไป ไม่ใช่คำแนะนำส่วนบุคคล</p>
              </div>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <TopicCard
                    key={topic.id}
                    {...topic}
                    excerpt={plainText(topic.content, 180)}
                    imageUrl={topic.image_url}
                    createdAt={topic.created_at}
                    commentCount={topic.comment_count}
                    likeCount={topic.like_count}
                    isPinned={Boolean(topic.is_pinned)}
                    isLocked={Boolean(topic.is_locked)}
                    index={index}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {totalPages > 1 && (
            <nav aria-label="เปลี่ยนหน้ารายการกระทู้" className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-5">
              {page > 1 ? (
                <Link href={buildLink(sort, page - 1)} scroll={false} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--app-surface-subtle)]">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> ก่อนหน้า
                </Link>
              ) : <span />}
              <span className="text-sm font-medium text-[var(--app-text-muted)]">{page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={buildLink(sort, page + 1)} scroll={false} className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--app-surface-subtle)]">
                  ถัดไป <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : <span />}
            </nav>
          )}
        </main>

        <aside className="hidden xl:block" aria-label="ข้อมูลชุมชน">
          <div className="sticky top-6 space-y-4">
            <section className="ithub-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-[var(--app-text)]">
                <BarChart3 aria-hidden="true" className="h-5 w-5 text-[var(--app-accent-text)]" />
                ภาพรวมชุมชน
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-[var(--app-text-muted)]">กระทู้ทั้งหมด</dt><dd className="font-bold">{numberFormat.format(Number(siteStats.total_topics || 0))}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-[var(--app-text-muted)]">สมาชิก</dt><dd className="font-bold">{numberFormat.format(Number(siteStats.total_members || 0))}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">สมาชิกใหม่ 7 วัน</dt><dd className="font-bold text-emerald-600 dark:text-emerald-400">+{numberFormat.format(Number(siteStats.new_members || 0))}</dd></div>
              </dl>
            </section>

            <section className="ithub-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-[var(--app-text)]">
                <UsersRound aria-hidden="true" className="h-5 w-5 text-[var(--app-accent-text)]" />
                หมวดหมู่ที่กำลังคุยกัน
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularCategories.length > 0 ? popularCategories.map((item) => (
                  <Link key={item.category} href={{ pathname: '/', query: { category: item.category } }} className="rounded-lg bg-[var(--app-surface-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-accent-text)]">
                    {item.category} · {numberFormat.format(Number(item.topic_count))}
                  </Link>
                )) : <span className="text-sm text-[var(--app-text-muted)]">ยังไม่มีข้อมูลหมวดหมู่</span>}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
