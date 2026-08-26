'use client';

import { Toaster, toast } from 'react-hot-toast';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// สร้าง Component ย่อยสำหรับจัดการ Logic
function ToastLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const notify = searchParams.get('notify');

    if (notify) {
      // หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่าหน้าเว็บโหลดเสร็จแล้วค่อยเด้ง
      setTimeout(() => {
        if (notify === 'login_success') toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ');
        if (notify === 'logout_success') toast.success('ออกจากระบบเรียบร้อย');
        if (notify === 'create_success') toast.success('สร้างกระทู้เรียบร้อย');
        if (notify === 'delete_success') toast.success('ลบข้อมูลสำเร็จ');
        if (notify === 'edit_success') toast.success('บันทึกการแก้ไขแล้ว');
        if (notify === 'register_success') toast.success('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
        
        // Error Notifications
        if (notify === 'banned') toast.error('บัญชีของคุณถูกระงับการใช้งาน', { style: { background: '#ef4444', color: '#fff' }, duration: 5000 });
        if (notify === 'login_failed') toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

        // ล้าง URL (แบบเงียบๆ ไม่ refresh หน้า)
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('notify');
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }, 100); // หน่วง 0.1 วิ
    }
  }, [searchParams, router, pathname]);

  return null; // ตัว Logic ไม่ต้องแสดงผลอะไร
}

// Main Component ที่ส่งออกไปใช้
export default function ToastProvider() {
  return (
    <>
      {/* ตัวแสดงผล Toast (กล่องข้อความ) */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      {/* Wrap Logic ด้วย Suspense เพื่อกัน Error ของ Next.js */}
      <Suspense fallback={null}>
        <ToastLogic />
      </Suspense>
    </>
  );
}
