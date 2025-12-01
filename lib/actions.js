'use server';

import { cookies } from 'next/headers';
import db from './db'; 

// --- 1. ฟังก์ชันเพิ่มยอดวิว (ของเดิม) ---
export async function incrementView(topicId) {
  const cookieStore = await cookies();
  const cookieName = `viewed_topic_${topicId}`;
  
  const hasViewed = cookieStore.get(cookieName);

  if (!hasViewed) {
    await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [topicId]);

    cookieStore.set(cookieName, 'true', {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }
}

// --- 2. ฟังก์ชันเคลียร์แจ้งเตือน (เพิ่มใหม่) ---
export async function markNotificationsAsRead(userId) {
  if (!userId) return;
  
  try {
    // อัปเดตสถานะการแจ้งเตือนทั้งหมดของ User นี้ให้เป็น "อ่านแล้ว" (1)
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
}