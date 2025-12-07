require('dotenv').config(); // ต้องลง npm install dotenv ก่อนนะ
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    });
    console.log("✅ เชื่อมต่อ TiDB สำเร็จ!");
    await connection.end();
  } catch (error) {
    console.error("❌ เชื่อมต่อล้มเหลว:", error.message);
  }
}

testConnection();