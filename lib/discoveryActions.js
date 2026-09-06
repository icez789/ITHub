'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from './auth';
import { enforceRateLimit } from './rateLimit';
import { positiveInteger } from './validation';
import { isDiscoveryCategory, parseBoolean } from './discoveryShared';
import {
  saveNotificationPreferences,
  setAuthorFollowRecord,
  setCategoryFollowRecord,
} from './discovery';

export async function setCategoryFollow(rawCategory, rawFollowing) {
  try {
    const user = await requireUser();
    await enforceRateLimit(`follow:${user.id}`, { limit: 60, windowMs: 60 * 1000 });
    const category = String(rawCategory || '');
    if (!isDiscoveryCategory(category)) throw new Error('Invalid category');
    const following = parseBoolean(rawFollowing);
    await setCategoryFollowRecord(user.id, category, following);
    revalidatePath('/');
    revalidatePath('/profile/following');
    return { success: true, following, message: following ? `ติดตาม ${category} แล้ว` : `เลิกติดตาม ${category} แล้ว` };
  } catch {
    console.error('Category follow failed');
    return { success: false, message: 'เปลี่ยนการติดตามหมวดไม่สำเร็จ กรุณาลองใหม่' };
  }
}

export async function setAuthorFollow(rawAuthorId, rawFollowing) {
  try {
    const user = await requireUser();
    await enforceRateLimit(`follow:${user.id}`, { limit: 60, windowMs: 60 * 1000 });
    const authorId = positiveInteger(rawAuthorId, 'author id');
    if (authorId === Number(user.id)) return { success: false, message: 'คุณไม่สามารถติดตามบัญชีตนเองได้' };
    const following = parseBoolean(rawFollowing);
    const result = await setAuthorFollowRecord(user.id, authorId, following);
    if (result.status === 'unavailable') {
      return { success: false, message: 'ไม่พบบัญชีผู้เขียนหรือบัญชีนี้ไม่พร้อมใช้งาน' };
    }
    if (result.status === 'limit') {
      return { success: false, message: 'ติดตามผู้เขียนได้สูงสุด 200 คน' };
    }
    revalidatePath('/');
    revalidatePath('/profile/following');
    return { success: true, following, message: following ? 'ติดตามผู้เขียนแล้ว' : 'เลิกติดตามผู้เขียนแล้ว' };
  } catch {
    const message = 'เปลี่ยนการติดตามผู้เขียนไม่สำเร็จ กรุณาลองใหม่';
    console.error('Author follow failed');
    return { success: false, message };
  }
}

export async function updateNotificationPreferences(_previousState, formData) {
  try {
    const user = await requireUser();
    await enforceRateLimit(`notification-preferences:${user.id}`, { limit: 20, windowMs: 60 * 1000 });
    const preferences = {
      comments_enabled: formData.has('comments_enabled') ? 1 : 0,
      likes_enabled: formData.has('likes_enabled') ? 1 : 0,
      solutions_enabled: formData.has('solutions_enabled') ? 1 : 0,
      followed_categories_enabled: formData.has('followed_categories_enabled') ? 1 : 0,
      followed_authors_enabled: formData.has('followed_authors_enabled') ? 1 : 0,
    };
    await saveNotificationPreferences(user.id, preferences);
    revalidatePath('/notifications');
    return { success: true, message: 'บันทึกการตั้งค่าการแจ้งเตือนแล้ว' };
  } catch {
    console.error('Notification preference update failed');
    return { success: false, message: 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่' };
  }
}
