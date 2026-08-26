// app/admin/DeleteButton.js
'use client'; // 👈 บรรทัดนี้สำคัญมาก บอกว่าเป็น Client Component

import React from 'react';

export default function DeleteButton({ action, id, idName, reportId, className, children, ariaLabel = 'ลบข้อมูล' }) {
  return (
    <form action={action}>
      <input type="hidden" name={idName} value={id} />
      {reportId && <input type="hidden" name="reportId" value={reportId} />}
      
      <button 
        type="submit" 
        className={className}
        aria-label={ariaLabel}
        onClick={(e) => {
          // แจ้งเตือนยืนยันก่อนลบ
          if (!confirm('ยืนยันที่จะลบข้อมูลนี้? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
            e.preventDefault(); // กดยกเลิก ไม่ส่งค่าไปหลังบ้าน
          }
        }}
      >
        {children}
      </button>
    </form>
  );
}
