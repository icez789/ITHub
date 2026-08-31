import db from '../../lib/db';
import Image from 'next/image';
import UserBadge from '../../components/UserBadge';
import { Crown, Medal, Trophy } from 'lucide-react';

const rankStyles = [
  { Icon: Crown, label: 'อันดับ 1', color: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' },
  { Icon: Medal, label: 'อันดับ 2', color: 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300' },
  { Icon: Medal, label: 'อันดับ 3', color: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300' },
];

function Avatar({ user, size = 64 }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-subtle)] font-bold text-[var(--app-text)]" style={{ width: size, height: size }}>
      {user.avatar_url ? <Image src={user.avatar_url} alt={`รูปโปรไฟล์ของ ${user.username}`} fill sizes={`${size}px`} className="object-cover" /> : user.username.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function LeaderboardPage() {
  const [users] = await db.query(
    'SELECT id, username, avatar_url, role, xp, post_count FROM users ORDER BY post_count DESC LIMIT 10',
  );
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <main className="ithub-page-container mx-auto max-w-5xl pb-24 pt-8 md:pb-12 md:pt-12">
      <header className="mb-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><Trophy aria-hidden="true" size={24} /></span>
        <h1 className="mt-4 text-3xl font-bold text-[var(--app-text)] sm:text-4xl">อันดับสมาชิก</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">สมาชิกที่ร่วมแบ่งปันความรู้มากที่สุดในชุมชน ITHub</p>
      </header>

      <section aria-labelledby="top-members-heading">
        <h2 id="top-members-heading" className="sr-only">สมาชิกสามอันดับแรก</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((user, index) => {
            const { Icon, label, color } = rankStyles[index];
            return (
              <article key={user.id} className="ithub-card flex items-center gap-4 p-5 md:flex-col md:text-center">
                <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${color}`}><Icon aria-hidden="true" size={14} /> {label}</div>
                <Avatar user={user} size={index === 0 ? 76 : 68} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold text-[var(--app-text)]">{user.username}</h3>
                  <div className="mt-1 flex justify-start md:justify-center"><UserBadge role={user.role} xp={user.xp} /></div>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-primary)]">{user.post_count.toLocaleString()} โพสต์</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]" aria-labelledby="more-members-heading">
        <div className="border-b border-[var(--app-border)] px-5 py-4"><h2 id="more-members-heading" className="font-bold text-[var(--app-text)]">อันดับถัดไป</h2></div>
        {rest.length > 0 ? (
          <ol className="divide-y divide-[var(--app-border)]">
            {rest.map((user, index) => (
              <li key={user.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-[var(--app-text-muted)]">{index + 4}</span>
                <Avatar user={user} size={38} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[var(--app-text)]">{user.username}</p><div className="mt-1"><UserBadge role={user.role} xp={user.xp} /></div></div>
                <span className="shrink-0 text-sm font-semibold text-[var(--app-primary)]">{user.post_count.toLocaleString()} <span className="hidden sm:inline">โพสต์</span></span>
              </li>
            ))}
          </ol>
        ) : <p className="p-8 text-center text-sm text-[var(--app-text-muted)]">ยังไม่มีข้อมูลอันดับเพิ่มเติม</p>}
      </section>
    </main>
  );
}
