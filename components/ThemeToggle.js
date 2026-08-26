'use client';

import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      title="สลับโหมดมืด/สว่าง"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" className="h-4.5 w-4.5" /> : <Moon aria-hidden="true" className="h-4.5 w-4.5" />}
    </button>
  );
}
