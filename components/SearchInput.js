'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchInput({ className = 'hidden md:block flex-1 max-w-xl' }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get('search') || '';

  // A pathname change must create a fresh debounce controller. Shared layouts
  // stay mounted during client navigation, which otherwise lets an old search
  // timer send the user back after they have opened a topic.
  return (
    <SearchInputForRoute
      key={`${pathname}\n${currentSearch}`}
      pathname={pathname}
      queryString={searchParams.toString()}
      initialSearch={currentSearch}
      className={className}
    />
  );
}

function SearchInputForRoute({ pathname, queryString, initialSearch, className }) {
  const router = useRouter();
  const [text, setText] = useState(initialSearch);
  const debounceTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const handleChange = (event) => {
    const nextText = event.target.value;
    setText(nextText);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const params = pathname === '/'
        ? new URLSearchParams(queryString)
        : new URLSearchParams();

      if (nextText) {
        params.set('search', nextText);
      } else {
        params.delete('search');
      }
      params.delete('page');

      const query = params.toString();
      router.replace(query ? `/?${query}` : '/', { scroll: false });
    }, 500);
  };

  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={text}
        onInput={handleChange}
        aria-label="ค้นหากระทู้"
        placeholder="ค้นหาหัวข้อหรือเนื้อหากระทู้"
        className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] py-2 pl-10 pr-4 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-red-500 focus:bg-[var(--app-surface)] focus:ring-2 focus:ring-red-500/15 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}
