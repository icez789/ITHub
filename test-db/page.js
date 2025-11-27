import React from 'react';
import db from '../../lib/db';

// ปิดการเก็บ Cache เพื่อให้ทดสอบได้ Real-time
export const dynamic = 'force-dynamic';

export default async function TestDBPage() {
  let message = '';
  let status = '';
  let errorDetail = '';
  let envInfo = {};

  try {
    // 1. ลองดึงข้อมูลจากตาราง users (เอามาแค่ 1 คนพอ)
    const [rows] = await db.query('SELECT count(*) as count FROM users');
    
    status = '✅ เชื่อมต่อสำเร็จ!';
    message = `เจอผู้ใช้งานทั้งหมด ${rows[0].count} คนในระบบ`;
    
  } catch (error) {
    status = '❌ เชื่อมต่อล้มเหลว';
    message = error.message; // ข้อความ Error สั้นๆ
    errorDetail = JSON.stringify(error, null, 2); // รายละเอียด Error เต็มๆ
  }

  // เช็กค่า Environment (แบบเซ็นเซอร์รหัสผ่าน)
  envInfo = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
  };

  return (
    <div className="p-10 font-sans max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 ทดสอบการเชื่อมต่อ Database</h1>
      
      <div className={`p-6 rounded-xl border-2 ${status.includes('สำเร็จ') ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <h2 className="text-xl font-bold mb-2">{status}</h2>
        <p className="text-lg">{message}</p>
      </div>

      {errorDetail && (
        <div className="mt-6">
          <h3 className="font-bold text-red-600 mb-2">รายละเอียด Error:</h3>
          <pre className="bg-black text-white p-4 rounded-lg overflow-x-auto text-sm">
            {errorDetail}
          </pre>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-bold mb-2">ค่า Environment Variables ที่ Vercel เห็น:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm border border-gray-300">
          {JSON.stringify(envInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
}