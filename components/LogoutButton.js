'use client'; // 👈 สำคัญมาก บอกว่าเป็น Client Component

import { logout } from '../lib/actions.js';
import { useFormStatus } from 'react-dom';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => logout()} 
      className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-600 px-3 py-2 rounded-lg transition-all bg-white dark:bg-neutral-900 dark:text-gray-400 dark:border-neutral-700 dark:hover:text-red-500 dark:hover:border-red-500" 
      title="ออกจากระบบ"
    >
      <span className="sm:hidden">Exit</span>
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}