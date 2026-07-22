import mysql from 'mysql2/promise';

const poolOptions = {
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME, 
  port: process.env.DB_PORT || 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // 🚀 ฟีเจอร์ลับป้องกันเว็บล่ม (กันอาการ ECONNRESET)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// 🚀 ท่าไม้ตายสำหรับ Next.js: ใช้ Global object เพื่อไม่ให้มันสร้าง Pool ใหม่เวลายึกยักเซฟไฟล์ (Hot Reload)
let pool;

if (process.env.NODE_ENV !== 'production') {
  if (!global.mysqlPool) {
    global.mysqlPool = mysql.createPool(poolOptions);
  }
  pool = global.mysqlPool;
} else {
  pool = mysql.createPool(poolOptions);
}

export default pool;