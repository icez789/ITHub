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
    'SELECT id, title, category, views, created_at FROM topics WHERE user_id = ? ORDER BY created_at DESC',
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
        <div className="mb-8 flex flex-col items-center justify-between border-b border-[var(--app-border)] pb-6 md:flex-row">
            <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-[var(--app-text)]">
                    โปรไฟล์ของฉัน
                    {/* แสดงยศข้างชื่อ */}
                    <UserBadge role={fullUserData.role} xp={fullUserData.xp} />
                </h1>
                <p className="mt-2 text-[var(--app-text-muted)]">จัดการข้อมูลส่วนตัวและดูสถิติของคุณ</p>
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
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--app-text)]">
                    <Trophy aria-hidden="true" size={19} /> สถิติสมาชิก
                </h3>
                
                <div className="mb-4">
                    <div className="mb-1 flex justify-between text-xs font-bold text-[var(--app-text-muted)]">
                        <span>XP ปัจจุบัน</span>
                        <span>{fullUserData.xp} / {nextRankXP} XP</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
                        <div 
                            className="h-full bg-[var(--app-primary)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
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
            <h3 className="mb-4 flex items-center gap-2 border-b border-[var(--app-border)] pb-2 text-xl font-bold text-[var(--app-text)]">
              <FileText aria-hidden="true" size={20} /> กระทู้ล่าสุดของคุณ
            </h3>

            <div className="space-y-4">
              {myTopics.length > 0 ? (
                myTopics.map((topic) => (
                  <div key={topic.id} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm transition-colors hover:border-[var(--app-primary)] sm:flex-row sm:items-center">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-accent-text)]">
                            {topic.category}
                          </span>
                          <span className="text-xs text-[var(--app-text-muted)]">
                            {new Date(topic.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <Link href={`/topic/${topic.id}`} className="line-clamp-1 text-lg font-bold text-[var(--app-text)] transition-colors hover:text-[var(--app-accent-text)]">
                          {topic.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--app-text-muted)]">
                            <span className="flex items-center gap-1"><Eye aria-hidden="true" size={14} /> {topic.views}</span>
                            {/* ถ้าอยากโชว์คอมเมนต์ต้อง join table เพิ่ม แต่เอาแค่นี้ก่อนก็สวยแล้ว */}
                        </div>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link href={`/topic/${topic.id}`} className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-4 py-2 text-center text-sm font-medium text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-elevated)] sm:flex-none">
                          ดู
                        </Link>
                        <Link href={`/edit/${topic.id}`} className="flex-1 rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] px-4 py-2 text-center text-sm font-medium text-[var(--app-accent-text)] transition hover:bg-[var(--app-surface-elevated)] sm:flex-none">
                          แก้ไข
                        </Link>
                     </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-12 text-center">
                  <Inbox className="mx-auto mb-4 text-[var(--app-text-muted)]" aria-hidden="true" size={34} />
                  <p className="mb-6 text-lg text-[var(--app-text-muted)]">คุณยังไม่เคยตั้งกระทู้เลย...</p>
                  <Link href="/create" className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-primary)] px-6 py-3 font-bold text-[var(--app-primary-contrast)] transition hover:bg-[var(--app-primary-hover)]">
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
