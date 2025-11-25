import mysql from 'mysql2/promise';

// ตรวจสอบว่ากำลังรันในเครื่อง (Localhost) หรือเปล่า?
const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // ✨ จุดที่แก้ไข: ถ้าเป็น Local ให้ปิด SSL (undefined), ถ้าเป็น Cloud ให้เปิด SSL
  ssl: isLocal ? undefined : { rejectUnauthorized: false }
});

export default db;