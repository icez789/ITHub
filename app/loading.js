import React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans dark:bg-black transition-colors duration-300">
      
      {/* Sidebar Skeleton (แถบซ้าย) */}
      <div className="hidden md:block fixed top-0 left-0 z-40 h-full w-16 bg-white dark:bg-black border-r border-gray-200 dark:border-neutral-800"></div>

      <main className="flex-1 flex flex-col h-screen overflow-hidden ml-0 md:ml-2">
        
        {/* Navbar Skeleton (แถบบน) */}
        <div className="h-20 bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800 w-full shrink-0 flex items-center justify-between px-6">
           <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 rounded-lg animate-pulse"></div>
           <div className="h-10 w-96 bg-gray-200 dark:bg-neutral-800 rounded-full animate-pulse hidden md:block"></div>
           <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 rounded-lg animate-pulse"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pl-6 md:pl-8">
          
          {/* Banner Skeleton (กล่องใหญ่) */}
          <div className="w-full h-72 rounded-2xl bg-gray-200 dark:bg-neutral-900 animate-pulse mb-10"></div>

          {/* Filter Bar Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-neutral-900 rounded-md animate-pulse"></div>
            <div className="h-8 w-64 bg-gray-200 dark:bg-neutral-900 rounded-md animate-pulse hidden sm:block"></div>
          </div>

          {/* Cards Grid Skeleton (สร้างกล่องจำลอง 6 อัน) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-5 h-[400px] flex flex-col animate-pulse">
                
                {/* Image Placeholder */}
                <div className="h-52 bg-gray-200 dark:bg-neutral-800 rounded-lg mb-4 w-full"></div>
                
                {/* Title Placeholder */}
                <div className="h-6 bg-gray-200 dark:bg-neutral-800 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-neutral-800 rounded w-1/2 mb-auto"></div>

                {/* Footer Placeholder */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                   <div className="flex gap-2">
                     <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-neutral-800"></div>
                     <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-800 rounded"></div>
                   </div>
                   <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}