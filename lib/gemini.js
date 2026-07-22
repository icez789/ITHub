import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// สลับลำดับ: lite ขึ้นก่อนเพราะโควต้าฟรีเยอะกว่ามาก, flash ไว้เป็นตัวสำรอง (มีโควต้าน้อยมาก)
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

function isOverloaded(error) {
  return error?.status === 503 || /503|overloaded/i.test(error?.message || '');
}
function isQuotaOrRateLimited(error) {
  return error?.status === 429 || /429|quota|rate limit/i.test(error?.message || '');
}

async function withFallback(callModel) {
  let lastError;
  for (const modelName of MODELS) {
    // โควต้าหมด (429) ไม่มีประโยชน์ที่จะ retry โมเดลเดิมซ้ำ ข้ามไปโมเดลถัดไปทันที
    // โมเดลโอเวอร์โหลด (503) ค่อย retry สั้นๆ ก่อนขยับ
    const attempts = 2;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await callModel(modelName);
      } catch (error) {
        lastError = error;
        if (isQuotaOrRateLimited(error)) break; // ไปโมเดลถัดไปเลย ไม่ต้อง retry ซ้ำ
        if (!isOverloaded(error)) throw error; // error อื่นที่ไม่ใช่ capacity issue ไม่ต้อง fallback
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function askGemini(prompt) {
  try {
    return await withFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ขออภัยครับ ระบบ AI กำลังพักผ่อนอยู่ 🤖💤";
  }
}

export async function askGeminiChat(history, newMessage) {
  const systemInstruction = `คุณคือ "ITHub Bot 🤖" ผู้ช่วยอัจฉริยะประจำเว็บบอร์ด IT Hub
  แนวทางการตอบ: เป็นมิตร สั้น กระชับ คุยเหมือนเพื่อนโปรแกรมเมอร์
  เน้นให้ข้อมูลด้าน IT, เขียนโค้ด, ซอฟต์แวร์, ฮาร์ดแวร์
  ไม่ต้องเว้นบรรทัดห่างเกินไป`;

  let formattedHistory = history.map(msg => ({
    role: msg.role === 'bot' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));
  while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') formattedHistory.shift();
  let validHistory = [];
  let expectedRole = 'user';
  for (let msg of formattedHistory) {
    if (msg.role === expectedRole) {
      validHistory.push(msg);
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }
  if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') validHistory.pop();

  try {
    return await withFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      const chat = model.startChat({ history: validHistory });
      const result = await chat.sendMessage(newMessage);
      return result.response.text();
    });
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "ขออภัยครับ ระบบ AI กำลังพักผ่อนอยู่ 🤖💤";
  }
}