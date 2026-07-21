'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'; 
import { revalidatePath } from 'next/cache'; 
import db from './db'; 
import fs from 'node:fs/promises';
import path from 'node:path';
import { pusherServer } from './pusher'; 
import { askGemini } from './gemini'; // เพิ่มบรรทัดนี้

// --- 1. ฟังก์ชันเพิ่มยอดวิว ---
export async function incrementView(topicId) {
  const cookieStore = await cookies();
  const cookieName = `viewed_topic_${topicId}`;
  
  const hasViewed = cookieStore.get(cookieName);

  if (!hasViewed) {
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

// --- 2. ฟังก์ชันเคลียร์แจ้งเตือน ---
export async function markNotificationsAsRead(userId) {
  if (!userId) return;
  
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
}

// --- 3. ฟังก์ชันออกจากระบบ ---
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user_session'); 
  redirect('/login'); 
}

// --- 4. ฟังก์ชันเพิ่ม XP ---
export async function increaseXp(userId, amount) {
  if (!userId) return;
  try {
    await db.query('UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?', [amount, userId]);
  } catch (error) {
    console.error("XP Error:", error);
  }
}

// --- 5. ฟังก์ชันเลือกคำตอบที่ถูกต้อง ---
export async function markAsSolution(commentId, topicId, currentUserId) {
  const [topics] = await db.query('SELECT user_id FROM topics WHERE id = ?', [topicId]);
  const topic = topics[0];

  if (!topic || topic.user_id !== currentUserId) {
    return { success: false, message: 'Not authorized' };
  }

  const [comments] = await db.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);
  const luckyWinnerId = comments[0]?.user_id;

  await db.query('UPDATE comments SET is_solution = 0 WHERE topic_id = ?', [topicId]);
  await db.query('UPDATE comments SET is_solution = 1 WHERE id = ?', [commentId]);
  
  if (luckyWinnerId && luckyWinnerId !== currentUserId) {
      await increaseXp(luckyWinnerId, 20); 
  }

  revalidatePath(`/topic/${topicId}`);
  return { success: true };
}

// --- 6. ฟังก์ชันโหวตโพล ---
export async function votePoll(pollId, optionId, userId) {
  if (!userId) return { success: false, message: 'กรุณาเข้าสู่ระบบ' };

  try {
    const [existingVote] = await db.query(
      'SELECT id, option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?', 
      [pollId, userId]
    );

    if (existingVote.length > 0) {
      const oldOptionId = existingVote[0].option_id;
      if (oldOptionId === optionId) return { success: false, message: 'คุณเลือกข้อนี้อยู่แล้วครับ' };

      await db.query('UPDATE poll_options SET vote_count = vote_count - 1 WHERE id = ?', [oldOptionId]);
      await db.query('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?', [optionId]);
      await db.query('UPDATE poll_votes SET option_id = ? WHERE id = ?', [optionId, existingVote[0].id]);
    } else {
      await db.query('INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES (?, ?, ?)', [pollId, userId, optionId]);
      await db.query('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?', [optionId]);
      await increaseXp(userId, 1);
    }

    const [updatedOptions] = await db.query('SELECT * FROM poll_options WHERE poll_id = ? ORDER BY id ASC', [pollId]);
    await pusherServer.trigger(`poll-${pollId}`, 'update-poll', updatedOptions);

    return { success: true, message: 'บันทึกการโหวตแล้ว' };

  } catch (error) {
    console.error("Vote Error:", error);
    return { success: false, message: 'เกิดข้อผิดพลาด' };
  }
}

// --- 7. ฟังก์ชันสร้างกระทู้ (พร้อมโพล) ---
export async function createTopicWithPoll(formData) {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session) return { success: false, message: 'Unauthorized' };
  
  let user;
  try { user = JSON.parse(session.value); } catch (e) { return { success: false, message: 'Session Invalid' }; }

  const title = formData.get('title');
  const category = formData.get('category');
  const content = formData.get('content');
  const imageFile = formData.get('image');
  const pollQuestion = formData.get('pollQuestion');
  const pollOptionsJson = formData.get('pollOptions');

  let imageUrl = null;

  if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + '_' + imageFile.name.replaceAll(" ", "_");
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      try { await fs.mkdir(uploadDir, { recursive: true }); } catch (e) {}
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      imageUrl = `/uploads/${fileName}`;
  }

  try {
      const [result] = await db.query(
        'INSERT INTO topics (title, category, content, user_id, image_url) VALUES (?, ?, ?, ?, ?)', 
        [title, category, content, user.id, imageUrl]
      );
      const newTopicId = result.insertId;

      if (pollQuestion && pollOptionsJson) {
          const [pollResult] = await db.query('INSERT INTO polls (topic_id, question) VALUES (?, ?)', [newTopicId, pollQuestion]);
          const options = JSON.parse(pollOptionsJson);
          for (const optLabel of options) {
              await db.query('INSERT INTO poll_options (poll_id, label) VALUES (?, ?)', [pollResult.insertId, optLabel]);
          }
      }

      await increaseXp(user.id, 10);
      await db.query('UPDATE users SET post_count = post_count + 1 WHERE id = ?', [user.id]);
      // 🤖 แทรกโค้ดตรงนี้: เรียก AI ให้มาตอบกระทู้ (ใช้ .catch เพื่อให้มันทำงานเบื้องหลัง ไม่ต้องบล็อกหน้าเว็บ)
      generateAiReply(newTopicId, title, content).catch(console.error);
      return { success: true, topicId: newTopicId };

  } catch (error) {
      console.error("Create Topic Error:", error);
      return { success: false, message: 'Server Error' };
  }
}

// --- 8. ✅ ฟังก์ชันแก้ไขกระทู้ (Update Topic) ---
export async function updateTopic(formData) {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session) return { success: false, message: 'Unauthorized' };
  
  let user;
  try { user = JSON.parse(session.value); } catch(e) {}

  const topicId = formData.get('topicId');
  const title = formData.get('title');
  const category = formData.get('category');
  const content = formData.get('content');
  const imageFile = formData.get('image');
  const isImageRemoved = formData.get('isImageRemoved') === 'true';

  try {
    const [topics] = await db.query('SELECT user_id, image_url FROM topics WHERE id = ?', [topicId]);
    
    if (topics.length === 0 || (topics[0].user_id !== user.id && user.role !== 'admin')) {
        return { success: false, message: 'คุณไม่มีสิทธิ์แก้ไขกระทู้นี้' };
    }

    let newImageUrl = topics[0].image_url;

    if (isImageRemoved) {
        newImageUrl = null;
    } 
    
    if (imageFile && imageFile.size > 0) {
        const fileName = Date.now() + '_' + imageFile.name.replaceAll(" ", "_");
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        try { await fs.mkdir(uploadDir, { recursive: true }); } catch (e) {}
        await fs.writeFile(path.join(uploadDir, fileName), buffer);
        newImageUrl = `/uploads/${fileName}`;
    }

    await db.query(
        'UPDATE topics SET title = ?, category = ?, content = ?, image_url = ? WHERE id = ?',
        [title, category, content, newImageUrl, topicId]
    );

    revalidatePath(`/topic/${topicId}`);
    return { success: true, topicId };

  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, message: 'Server Error' };
  }
}

// --- ฟังก์ชันลับ: ให้ AI ช่วยตอบกระทู้ ---
async function generateAiReply(topicId, title, content) {
  try {
    const [botUsers] = await db.query('SELECT id FROM users WHERE username = ?', ['ITHub Bot 🤖']);
    if (botUsers.length === 0) return;
    const botId = botUsers[0].id;

    // 1. ปรับ Prompt ให้บังคับการเว้นบรรทัดแบบกระชับ
    const prompt = `คุณคือ "ITHub Bot 🤖" AI ประจำเว็บบอร์ด IT Hub
    คำสั่งสำคัญ: "วิเคราะห์และตอบคำถามให้ตรงกับเนื้อหากระทู้ด้านล่างนี้"
    
    แนวทางการตอบ:
    - ตอบให้ตรงประเด็น เป็นกันเอง สั้นกระชับ
    - จัดย่อหน้าให้เป็นระเบียบและอ่านง่าย "ห้ามเว้นบรรทัดห่างกันเกินไป" (เว้นแค่ 1 บรรทัดเมื่อขึ้นย่อหน้าใหม่)
    - ห้ามพิมพ์แนะนำตัวยาวยืด 

    หัวข้อกระทู้: ${title}
    รายละเอียด: ${content}`;
    
    let replyContent = await askGemini(prompt);

    // 2. 🚀 ฝังข้อความ Disclaimer ต่อท้ายคำตอบของ AI เสมอ (ใช้ --- เพื่อตีเส้นแบ่ง)
    const disclaimer = `\n\n---\n*🤖 หมายเหตุ: ข้อมูลนี้ถูกประมวลผลโดย AI เพื่อเป็นแนวทางเบื้องต้นเท่านั้น อาจมีข้อผิดพลาด โปรดใช้วิจารณญาณและตรวจสอบความถูกต้องอีกครั้งครับ*`;
    
    // เอาคำตอบ AI มาต่อด้วยข้อความกำกับ
    const finalContent = replyContent + disclaimer;

    // 3. บันทึกคำตอบที่ผสมเสร็จแล้วลงฐานข้อมูล
    await db.query(
      'INSERT INTO comments (topic_id, user_id, content) VALUES (?, ?, ?)', 
      [topicId, botId, finalContent]
    );

    // อัปเดตหน้าเว็บ
    revalidatePath(`/topic/${topicId}`);

  } catch (error) {
    console.error("AI Reply Error:", error);
  }
}

// --- ฟังก์ชันคุยแชทส่วนตัวกับ Bot ---
export async function chatWithBot(message) {
  'use server';
  
  // นำเข้า askGemini ถ้ายังไม่ได้ import ไว้ที่หัวไฟล์
  const { askGemini } = require('./gemini'); 

  const prompt = `คุณคือ "ITHub Bot 🤖" ผู้ช่วยอัจฉริยะประจำเว็บบอร์ด IT Hub
  คำสั่ง: ตอบคำถามแบบ 1-on-1 (ตัวต่อตัว) กับผู้ใช้
  
  แนวทางการตอบ:
  - เป็นมิตร สั้น กระชับ คุยเหมือนเพื่อนโปรแกรมเมอร์
  - เน้นให้ข้อมูลด้าน IT, เขียนโค้ด, ซอฟต์แวร์, ฮาร์ดแวร์
  - ไม่ต้องเว้นบรรทัดห่างเกินไป

  คำถามจากผู้ใช้: ${message}`;

  try {
    const reply = await askGemini(prompt);
    return reply;
  } catch (error) {
    console.error("Chatbot Error:", error);
    return "ขออภัยครับ ตอนนี้ผมกำลังอัปเดตระบบตัวเองอยู่ เดี๋ยวมาตอบนะครับ 🤖💤";
  }
}
