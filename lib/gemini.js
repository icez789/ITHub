import { GoogleGenerativeAI } from '@google/generative-ai';

// ดึง Key จากไฟล์ .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function askGemini(prompt) {
  try {
    // 🚀 เปลี่ยนมาใช้โมเดลเจนใหม่ล่าสุด 3.5 Flash 
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    
    // ส่งคำถามไปหา AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ขออภัยครับ ระบบ AI กำลังพักผ่อนอยู่ 🤖💤";
  }
}