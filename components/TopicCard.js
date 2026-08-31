import Link from 'next/link';
import Image from 'next/image';
import { Eye, Heart, MessageCircle, UserRound } from 'lucide-react';

export default function TopicCard({
  id,
  title,
  category,
  excerpt,
  username,
  createdAt,
  imageUrl,
  views = 0,
  commentCount = 0,
  likeCount = 0,
  index = 0,
}) {
  const formattedDate = new Date(createdAt).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className="group" data-tour="topic-card">
      <Link
        href={`/topic/${id}`}
        data-tour="topic-link"
        className="ithub-card flex min-w-0 gap-3 p-3.5 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 sm:gap-4 sm:p-4"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/35 dark:text-red-300">
              {category}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{formattedDate}</span>
          </div>

          <h3 className="line-clamp-2 text-base font-bold leading-snug text-zinc-950 transition-colors group-hover:text-red-700 sm:text-lg dark:text-zinc-50 dark:group-hover:text-red-300">
            {title}
          </h3>

          {excerpt && (
            <p className="mt-1.5 hidden line-clamp-2 text-sm leading-6 text-zinc-600 sm:block dark:text-zinc-400">
              {excerpt}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-36 truncate">{username || 'ไม่ระบุผู้เขียน'}</span>
            </span>
            <span className="flex items-center gap-3" aria-label={`${views} ครั้ง, ${commentCount} ความคิดเห็น, ${likeCount} ถูกใจ`}>
              <span className="flex items-center gap-1"><Eye aria-hidden="true" className="h-3.5 w-3.5" />{Number(views).toLocaleString('th-TH')}</span>
              <span className="flex items-center gap-1"><MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />{Number(commentCount).toLocaleString('th-TH')}</span>
              <span className="flex items-center gap-1"><Heart aria-hidden="true" className="h-3.5 w-3.5" />{Number(likeCount).toLocaleString('th-TH')}</span>
            </span>
          </div>
        </div>

        {imageUrl && (
          <div className="relative h-[66px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-24 sm:w-36 dark:bg-zinc-800">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 639px) 88px, 144px"
              preload={index === 0}
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
        )}
      </Link>
    </article>
  );
}
