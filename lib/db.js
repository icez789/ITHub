import mysql from 'mysql2/promise';

// ตั้งค่าการเชื่อมต่อ
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',      // User มาตรฐานของ XAMPP
  password: '',      // Password มาตรฐานของ XAMPP (ปล่อยว่าง)
  database: 'it_webboard', // ชื่อ Database ที่เราเพิ่งสร้าง
});

export default db;