import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  // 👇 ใส่ค่าจริงๆ จาก TiDB ลงไปตรงนี้เลย (อย่าลืมใส่ 'เครื่องหมายคำพูด' ครอบด้วย)
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', 
  user: 'SYsRfGUsg7qrWdS.root', 
  password: 'yLYEcY8i3ohKnSru', 
  database: 'test', 
  port: 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;