import mysql from 'mysql2/promise';

// ตรวจสอบว่าเป็น Localhost หรือไม่
const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // ✨ ปรับปรุงการตั้งค่า SSL ให้รองรับ TiDB Cloud ดีขึ้น
  ssl: isLocal ? undefined : {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2' // เพิ่มบรรทัดนี้สำคัญมากสำหรับ Cloud DB บางเจ้า
  },
  
  // ⏳ เพิ่ม Timeout กันหลุด (60 วินาที)
  connectTimeout: 60000,
  
  // 🔌 ตั้งค่า Pool เพื่อประสิทธิภาพที่ดีบน Vercel
  waitForConnections: true,
  connectionLimit: 5, // จำกัดจำนวน connection ไม่ให้เยอะเกินไป (Vercel ชอบเปิดเยอะ)
  queueLimit: 0
});

export default db;