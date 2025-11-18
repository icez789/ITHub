'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-yellow-400 dark:hover:bg-gray-700 transition-all shadow-sm border border-transparent dark:border-gray-700"
      title="สลับโหมดมืด/สว่าง"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}