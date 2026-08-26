import React from 'react';
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileAvatar from '../../components/ProfileAvatar'; 
import UserBadge from '../../components/UserBadge'; // ✅ 1. เพิ่ม UserBadge
import { getCurrentUser } from '../../lib/auth';
import { updateAvatar } from '../../lib/actions';
import { Eye, FileText, Inbox, Plus, Trophy } from 'lucide-react';

export default async function ProfilePage() {
  const userSession = await getCurrentUser();
  if (!userSession) redirect('/login');

  // ดึงข้อมูล User (รวม XP)
  const [users] = await db.query(
    'SELECT id, username, email, role, avatar_url, bio, post_count, xp, created_at FROM users WHERE id = ?', 
    [userSession.id]
  );
  const fullUserData = users[0];

  if (!fullUserData) redirect('/login');

  // ดึงกระทู้ที่ตั้ง
  const [myTopics] = await db.query(
    'SELECT * FROM topics WHERE user_id = ? ORDER BY created_at DESC', 
    [userSession.id]
  );

  // ✅ 2. ดึงจำนวน Solved (คำตอบที่ถูกต้อง)
  const [solvedCountResult] = await db.query(
    'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND is_solution = 1',
    [userSession.id]
  );
  const solvedCount = solvedCountResult[0].count;

  // ✅ 3. คำนวณ Level Progress
  let nextRankXP = 50;
  let currentRankXP = 0;
  
  if (fullUserData.xp >= 500) {
      currentRankXP = 500;
      nextRankXP = 1000;
  } else if (fullUserData.xp >= 200) {
      currentRankXP = 200;
      nextRankXP = 500;
  } else if (fullUserData.xp >= 50) {
      currentRankXP = 50;
      nextRankXP = 200;
  }

  // คำนวณ % หลอด (กันเกิน 100%)
  const xpProgress = Math.min(100, Math.max(0, ((fullUserData.xp - currentRankXP) / (nextRankXP - currentRankXP)) * 100));

  return (
    <main className="ithub-page-container mx-auto max-w-5xl pb-24 pt-8 md:pb-12 md:pt-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-6 border-gray-200 dark:border-neutral-800">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    โปรไฟล์ของฉัน
                    {/* แสดงยศข้างชื่อ */}
                    <UserBadge role={fullUserData.role} xp={fullUserData.xp} />
                </h1>
                <p className="text-gray-500 mt-2 dark:text-gray-400">จัดการข้อมูลส่วนตัวและดูสถิติของคุณ</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Stats */}
          <div className="md:col-span-1 space-y-6">
            <ProfileAvatar 
              user={fullUserData} 
              updateAvatar={updateAvatar} 
              myTopicsCount={myTopics.length} 
            />

            {/* ✅ 4. Stats Card (XP & Solved) */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy aria-hidden="true" size={19} /> สถิติสมาชิก
                </h3>
                
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">
                        <span>XP ปัจจุบัน</span>
                        <span>{fullUserData.xp} / {nextRankXP} XP</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000 ease-out" 
                            style={{ width: `${xpProgress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/50 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{solvedCount}</div>
                        <div className="text-[10px] font-bold text-green-800 dark:text-green-300">คำตอบที่ถูกเลือก</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{myTopics.length}</div>
                        <div className="text-[10px] font-bold text-blue-800 dark:text-blue-300">กระทู้</div>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Column: Topics List */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-gray-200 border-b pb-2 border-gray-100 dark:border-neutral-800">
              <FileText aria-hidden="true" size={20} /> กระทู้ล่าสุดของคุณ
            </h3>

            <div className="space-y-4">
              {myTopics.length > 0 ? (
                myTopics.map((topic) => (
                  <div key={topic.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-red-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-red-900/50">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50">
                            {topic.category}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(topic.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <Link href={`/topic/${topic.id}`} className="text-lg font-bold text-gray-800 hover:text-red-600 transition-colors line-clamp-1 dark:text-gray-100 dark:hover:text-red-400">
                          {topic.title}
                        </Link>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye aria-hidden="true" size={14} /> {topic.views}</span>
                            {/* ถ้าอยากโชว์คอมเมนต์ต้อง join table เพิ่ม แต่เอาแค่นี้ก่อนก็สวยแล้ว */}
                        </div>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link href={`/topic/${topic.id}`} className="flex-1 sm:flex-none text-center px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium transition border border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-700">
                          ดู
                        </Link>
                        <Link href={`/edit/${topic.id}`} className="flex-1 sm:flex-none text-center px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium transition border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/40">
                          แก้ไข
                        </Link>
                     </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-xl text-center border border-dashed border-gray-300 dark:bg-neutral-900 dark:border-neutral-800">
                  <Inbox className="mx-auto mb-4 text-[var(--app-text-muted)]" aria-hidden="true" size={34} />
                  <p className="text-gray-400 text-lg mb-6">คุณยังไม่เคยตั้งกระทู้เลย...</p>
                  <Link href="/create" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition inline-flex items-center gap-2 font-bold shadow-md shadow-red-500/20 dark:bg-red-700 dark:hover:bg-red-600">
                    <Plus aria-hidden="true" size={18} /> เริ่มตั้งกระทู้แรก
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

    </main>
  );
}
