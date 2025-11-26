'use server';

import { cookies } from 'next/headers';
import db from '../lib/db'; // เรียกใช้ DB

export async function incrementView(topicId) {
  const cookieStore = await cookies();
  const cookieName = `viewed_topic_${topicId}`;
  
  // เช็กว่ามีคุกกี้ชื่อนี้ไหม (แปลว่าเคยดูแล้ว)
  const hasViewed = cookieStore.get(cookieName);

  if (!hasViewed) {
    // 1. ถ้ายังไม่เคยดู -> บวกยอดวิวใน DB
    await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [topicId]);

    // 2. ฝังคุกกี้ไว้ 24 ชม. (เพื่อจำว่าดูแล้ว)
    cookieStore.set(cookieName, 'true', {
      maxAge: 60 * 60 * 24, // 1 วัน
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }
}