'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function SearchInput() {
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
    />
  );
}

function SearchInputForRoute({ pathname, queryString, initialSearch }) {
  const router = useRouter();
  const [text, setText] = useState(initialSearch);
  const hasUserEdited = useRef(false);

  useEffect(() => {
    if (!hasUserEdited.current || text === initialSearch) {
      hasUserEdited.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = pathname === '/'
        ? new URLSearchParams(queryString)
        : new URLSearchParams();

      if (text) {
        params.set('search', text);
      } else {
        params.delete('search');
      }
      params.delete('page');

      // Mark the edit as handled before navigation updates the shared layout.
      hasUserEdited.current = false;
      const query = params.toString();
      router.replace(query ? `/?${query}` : '/', { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [initialSearch, pathname, queryString, router, text]);

  return (
    <div className="flex-1 max-w-xl relative hidden md:block">
      <input
        type="search"
        value={text}
        onChange={(event) => {
          hasUserEdited.current = true;
          setText(event.target.value);
        }}
        aria-label="ค้นหากระทู้"
        placeholder="🔍 พิมพ์เพื่อค้นหาทันที..."
        className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-full py-2 px-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-100 dark:focus:bg-black dark:focus:border-red-600"
      />
    </div>
  );
}
