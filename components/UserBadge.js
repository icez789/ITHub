import React from 'react';

export default function UserBadge({ role, xp = 0 }) { // รับ xp แทน postCount
  
  // Admin ยศใหญ่สุดเสมอ
  if (role === 'admin' || role === 'super_admin') {
    return (
      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded border border-red-600 font-bold shadow-sm">
        🛡️ Admin
      </span>
    );
  }

  // คำนวณยศตาม XP
  let badgeLabel = '🌱 Newbie';
  let badgeColor = 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700';

  if (xp >= 500) {
    badgeLabel = '👑 Tech Lead';
    badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-600';
  } else if (xp >= 200) {
    badgeLabel = '🚀 Senior Dev';
    badgeColor = 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-600';
  } else if (xp >= 50) {
    badgeLabel = '💻 Junior Dev';
    badgeColor = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600';
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold shadow-sm ${badgeColor}`}>
      {badgeLabel} <span className="opacity-50 ml-1 text-[9px]">({xp} XP)</span>
    </span>
  );
}