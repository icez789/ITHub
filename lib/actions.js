'use server';

import { v2 as cloudinary } from 'cloudinary';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from './db';
import { askGemini, askGeminiChat } from './gemini';
import { clearUserSession, isAdmin, requireUser } from './auth';
import { sanitizeRichText, plainText } from './content';
import { pusherServer } from './pusher';
import { enforceRateLimit } from './rateLimit';
import { positiveInteger, requiredText, validImageFile } from './validation';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CATEGORIES = new Set(['Hardware', 'Software', 'Network', 'AI & Data', 'General']);

async function addXp(executor, userId, amount) {
  await executor.query(
    'UPDATE users SET xp = GREATEST(0, COALESCE(xp, 0) + ?) WHERE id = ?',
    [amount, userId],
  );
}

async function uploadImage(file, folder) {
  const validFile = validImageFile(file);
  if (!validFile) return null;
  const buffer = Buffer.from(await validFile.arrayBuffer());
  const dataUri = `data:${validFile.type};base64,${buffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  });
}

function validateTopicInput(formData) {
  const title = requiredText(formData.get('title'), 'title', { min: 5, max: 160 });
  const category = requiredText(formData.get('category'), 'category', { max: 40 });
  if (!CATEGORIES.has(category)) throw new Error('Invalid category');

  const content = sanitizeRichText(formData.get('content'));
  if (plainText(content).length < 5 || content.length > 50_000) throw new Error('Invalid content');
  return { title, category, content };
}

export async function incrementView(rawTopicId) {
  const topicId = positiveInteger(rawTopicId, 'topic id');
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get('user-agent') || '';
  const purpose = requestHeaders.get('purpose') || requestHeaders.get('sec-purpose') || '';
  if (/bot|crawler|spider|slurp|headlesschrome|lighthouse|preview/i.test(userAgent) || /prefetch/i.test(purpose)) return;
  const cookieStore = await cookies();
  const cookieName = `viewed_topic_${topicId}`;
  if (cookieStore.get(cookieName)) return;

  await db.query('UPDATE topics SET views = views + 1 WHERE id = ?', [topicId]);
  cookieStore.set(cookieName, 'true', {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function markNotificationsAsRead() {
  const user = await requireUser();
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]);
  revalidatePath('/notifications');
}

export async function logout() {
  await clearUserSession();
  redirect('/login?notify=logout_success');
}

export async function markAsSolution(rawCommentId, rawTopicId) {
  const user = await requireUser();
  const commentId = positiveInteger(rawCommentId, 'comment id');
  const topicId = positiveInteger(rawTopicId, 'topic id');
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [topics] = await connection.query('SELECT user_id FROM topics WHERE id = ? FOR UPDATE', [topicId]);
    if (!topics[0] || topics[0].user_id !== user.id) throw new Error('Forbidden');

    const [comments] = await connection.query(
      'SELECT user_id, is_solution FROM comments WHERE id = ? AND topic_id = ? FOR UPDATE',
      [commentId, topicId],
    );
    const selectedComment = comments[0];
    if (!selectedComment) throw new Error('Comment not found');

    const [existingSolutions] = await connection.query(
      'SELECT id, user_id FROM comments WHERE topic_id = ? AND is_solution = 1 FOR UPDATE',
      [topicId],
    );
    if (selectedComment.is_solution) {
      await connection.commit();
      return { success: true };
    }

    await connection.query('UPDATE comments SET is_solution = 0 WHERE topic_id = ?', [topicId]);
    await connection.query('UPDATE comments SET is_solution = 1 WHERE id = ? AND topic_id = ?', [commentId, topicId]);

    const previousSolution = existingSolutions[0];
    if (previousSolution?.user_id !== undefined && previousSolution.user_id !== user.id) {
      await addXp(connection, previousSolution.user_id, -20);
    }
    if (selectedComment.user_id !== user.id) {
      await addXp(connection, selectedComment.user_id, 20);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return { success: false, message: error.message };
  } finally {
    connection.release();
  }

  revalidatePath(`/topic/${topicId}`);
  return { success: true };
}

export async function votePoll(rawPollId, rawOptionId) {
  const user = await requireUser();
  const pollId = positiveInteger(rawPollId, 'poll id');
  const optionId = positiveInteger(rawOptionId, 'option id');
  await enforceRateLimit(`poll:${user.id}`, { limit: 30, windowMs: 60 * 1000 });
  const connection = await db.getConnection();
  let firstVote = false;

  try {
    await connection.beginTransaction();
    const [options] = await connection.query(
      'SELECT id FROM poll_options WHERE id = ? AND poll_id = ? FOR UPDATE',
      [optionId, pollId],
    );
    if (!options[0]) throw new Error('Invalid poll option');

    const [votes] = await connection.query(
      'SELECT id, option_id FROM poll_votes WHERE poll_id = ? AND user_id = ? FOR UPDATE',
      [pollId, user.id],
    );
    const vote = votes[0];
    if (vote?.option_id === optionId) {
      await connection.commit();
      return { success: false, message: 'คุณเลือกข้อนี้อยู่แล้ว' };
    }

    if (vote) {
      await connection.query('UPDATE poll_options SET vote_count = GREATEST(0, vote_count - 1) WHERE id = ?', [vote.option_id]);
      await connection.query('UPDATE poll_votes SET option_id = ? WHERE id = ?', [optionId, vote.id]);
    } else {
      firstVote = true;
      await connection.query(
        'INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES (?, ?, ?)',
        [pollId, user.id, optionId],
      );
    }
    await connection.query('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = ?', [optionId]);
    if (firstVote) await addXp(connection, user.id, 1);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Vote Error:', error);
    return { success: false, message: 'ไม่สามารถบันทึกการโหวตได้' };
  } finally {
    connection.release();
  }

  const [updatedOptions] = await db.query('SELECT * FROM poll_options WHERE poll_id = ? ORDER BY id ASC', [pollId]);
  try {
    await pusherServer.trigger(`poll-${pollId}`, 'update-poll', updatedOptions);
  } catch (error) {
    console.error('Pusher poll update failed:', error);
  }
  return { success: true, message: 'บันทึกการโหวตแล้ว' };
}

export async function createTopicWithPoll(formData) {
  const user = await requireUser();
  await enforceRateLimit(`create-topic:${user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });

  let input;
  let pollQuestion = '';
  let pollOptions = [];
  try {
    input = validateTopicInput(formData);
    pollQuestion = String(formData.get('pollQuestion') || '').trim();
    if (pollQuestion) {
      pollQuestion = requiredText(pollQuestion, 'poll question', { min: 3, max: 200 });
      const parsed = JSON.parse(String(formData.get('pollOptions') || '[]'));
      if (!Array.isArray(parsed)) throw new Error('Invalid poll options');
      pollOptions = [...new Set(parsed.map((option) => requiredText(option, 'poll option', { min: 1, max: 100 })))];
      if (pollOptions.length < 2 || pollOptions.length > 8) throw new Error('Poll requires 2-8 options');
    }
  } catch (error) {
    return { success: false, message: error.message };
  }

  let upload = null;
  try {
    upload = await uploadImage(formData.get('image'), 'ithub_topics');
  } catch {
    return { success: false, message: 'รูปภาพต้องเป็น JPG, PNG, WebP หรือ GIF และไม่เกิน 5MB' };
  }

  const connection = await db.getConnection();
  let newTopicId;
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO topics (title, category, content, user_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [input.title, input.category, input.content, user.id, upload?.secure_url || null],
    );
    newTopicId = result.insertId;

    if (pollQuestion) {
      const [pollResult] = await connection.query(
        'INSERT INTO polls (topic_id, question) VALUES (?, ?)',
        [newTopicId, pollQuestion],
      );
      for (const label of pollOptions) {
        await connection.query('INSERT INTO poll_options (poll_id, label) VALUES (?, ?)', [pollResult.insertId, label]);
      }
    }

    await addXp(connection, user.id, 10);
    await connection.query('UPDATE users SET post_count = COALESCE(post_count, 0) + 1 WHERE id = ?', [user.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (upload?.public_id) await cloudinary.uploader.destroy(upload.public_id).catch(() => {});
    console.error('Create Topic Error:', error);
    return { success: false, message: 'Server Error' };
  } finally {
    connection.release();
  }

  after(() => generateAiReply(newTopicId, input.title, plainText(input.content)).catch(console.error));
  return { success: true, topicId: newTopicId };
}

export async function updateTopic(formData) {
  const user = await requireUser();
  let input;
  let topicId;
  try {
    input = validateTopicInput(formData);
    topicId = positiveInteger(formData.get('topicId'), 'topic id');
  } catch (error) {
    return { success: false, message: error.message };
  }

  const [topics] = await db.query('SELECT user_id, image_url FROM topics WHERE id = ?', [topicId]);
  const topic = topics[0];
  if (!topic || (topic.user_id !== user.id && !isAdmin(user))) {
    return { success: false, message: 'คุณไม่มีสิทธิ์แก้ไขกระทู้นี้' };
  }

  let newImageUrl = formData.get('isImageRemoved') === 'true' ? null : topic.image_url;
  try {
    const upload = await uploadImage(formData.get('image'), 'ithub_topics');
    if (upload) newImageUrl = upload.secure_url;
  } catch {
    return { success: false, message: 'รูปภาพต้องเป็น JPG, PNG, WebP หรือ GIF และไม่เกิน 5MB' };
  }

  await db.query(
    'UPDATE topics SET title = ?, category = ?, content = ?, image_url = ? WHERE id = ?',
    [input.title, input.category, input.content, newImageUrl, topicId],
  );
  revalidatePath(`/topic/${topicId}`);
  return { success: true, topicId };
}

export async function updateAvatar(formData) {
  const user = await requireUser();
  let upload;
  try {
    upload = await uploadImage(formData.get('avatar'), 'ithub_avatars');
    if (!upload) return { success: false, message: 'กรุณาเลือกรูปภาพ' };
  } catch {
    return { success: false, message: 'รูปภาพต้องเป็น JPG, PNG, WebP หรือ GIF และไม่เกิน 5MB' };
  }

  await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [upload.secure_url, user.id]);
  revalidatePath('/profile');
  redirect('/profile?notify=edit_success');
}

async function generateAiReply(topicId, title, content) {
  const [botUsers] = await db.query('SELECT id FROM users WHERE username = ?', ['ITHub Bot 🤖']);
  if (!botUsers[0]) return;

  const prompt = `คุณคือ ITHub Bot ผู้ช่วยของเว็บบอร์ดไอที ตอบคำถามให้ตรงประเด็น เป็นมิตร กระชับ และระบุเมื่อข้อมูลไม่แน่นอน\nหัวข้อ: ${title}\nรายละเอียด: ${content}`;
  const reply = await askGemini(prompt);
  const disclaimer = '\n\n---\n*🤖 คำตอบนี้สร้างโดย AI โปรดตรวจสอบความถูกต้องก่อนนำไปใช้*';
  await db.query(
    'INSERT INTO comments (topic_id, user_id, content) VALUES (?, ?, ?)',
    [topicId, botUsers[0].id, `${reply}${disclaimer}`],
  );
  revalidatePath(`/topic/${topicId}`);
}

export async function chatWithBot(rawHistory, rawMessage) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await enforceRateLimit(`ai-chat:${ip}`, { limit: 15, windowMs: 10 * 60 * 1000 });

  const message = requiredText(rawMessage, 'message', { min: 1, max: 2_000 });
  const history = Array.isArray(rawHistory)
    ? rawHistory.slice(-20).map((item) => ({
        role: item?.role === 'bot' ? 'bot' : 'user',
        text: String(item?.text || '').slice(0, 2_000),
      }))
    : [];

  try {
    return await askGeminiChat(history, message);
  } catch (error) {
    console.error('Chatbot Error:', error);
    return 'ขออภัยครับ ระบบ AI ไม่พร้อมใช้งานชั่วคราว';
  }
}
