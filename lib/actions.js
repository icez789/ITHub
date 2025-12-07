'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'; // ✅ เพิ่มบรรทัดนี้เพื่อใช้ Redirect
import db from './db'; 

// --- 1. ฟังก์ชันเพิ่มยอดวิว (ของเดิม) ---
export async function incrementView(topicId) {
  const cookieStore = await cookies();
  const cookieName = `viewed_topic_${topicId}`;
  
  const hasViewed = cookieStore.get(cookieName);

  if (!hasViewed) {
    // ใช้ try-catch กัน error เผื่อ DB หลุด
    try {
        await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [topicId]);
        
        cookieStore.set(cookieName, 'true', {
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        });
    } catch (error) {
        console.error("Error incrementing view:", error);
    }
  }
}

// --- 2. ฟังก์ชันเคลียร์แจ้งเตือน (ของเดิม) ---
export async function markNotificationsAsRead(userId) {
  if (!userId) return;
  
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
}

// --- 3. ฟังก์ชันออกจากระบบ (✅ เพิ่มใหม่) ---
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user_session'); // ลบคุกกี้
  redirect('/login'); // ดีดกลับหน้า Login
}