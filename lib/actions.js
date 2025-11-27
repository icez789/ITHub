'use server';

import { cookies } from 'next/headers';
// 👇 แก้บรรทัดนี้ด้วยครับ (จาก ../lib/db เป็น ./db)
import db from './db'; 

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