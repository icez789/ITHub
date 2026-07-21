import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  // ดึงค่าอย่างปลอดภัยจากไฟล์ .env
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME, 
  port: process.env.DB_PORT || 4000,
  
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  
  // ตั้งค่า Pool 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // 🚀 ฟีเจอร์ลับป้องกันเว็บล่ม (กันอาการ ECONNRESET)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export default pool;