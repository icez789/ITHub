import React from 'react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}