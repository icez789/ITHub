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
  connectTimeout: 10_000,
  
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

const transientConnectionCodes = new Set([
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
]);

function isTransientConnectionError(error) {
  return transientConnectionCodes.has(error?.code)
    || /ECONNRESET|connection.*(?:closed|lost)|socket hang up/i.test(error?.message || '');
}

function isReadOnlyStatement(sql) {
  const statement = typeof sql === 'string' ? sql : sql?.sql;
  return /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/i.test(statement || '');
}

async function retryTransient(operation, retries = 2) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt >= retries) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
}

const db = {
  query(sql, values) {
    const operation = () => pool.query(sql, values);
    return isReadOnlyStatement(sql) ? retryTransient(operation) : operation();
  },
  execute(sql, values) {
    const operation = () => pool.execute(sql, values);
    return isReadOnlyStatement(sql) ? retryTransient(operation) : operation();
  },
  getConnection() {
    return retryTransient(() => pool.getConnection());
  },
};

export default db;
