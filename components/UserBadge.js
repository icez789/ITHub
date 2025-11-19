import React from 'react';

export default function UserBadge({ role, postCount }) {
  // 1. ถ้าเป็น Admin ให้ยศ Crown ทันที
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200 ml-2" title="ผู้ดูแลระบบ">
        👑 Admin
      </span>
    );
  }

  // 2. ถ้าโพสต์เยอะ (5 ขึ้นไป) ได้ยศ Contributor
  if (postCount >= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-600 border border-blue-200 ml-2" title="นักเขียนขาประจำ">
        ✍️ Contributor
      </span>
    );
  }

  // 3. ถ้ายังน้อยอยู่ (Newbie)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 ml-2" title="สมาชิกใหม่">
      🌱 Newbie
    </span>
  );
}