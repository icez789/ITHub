'use client';

import { Toaster, toast } from 'react-hot-toast';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// สร้าง Component ย่อยสำหรับจัดการ Logic
function ToastLogic() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const notify = searchParams.get('notify');

    const currentUrl = new URL(window.location.href);
    if (notify && currentUrl.pathname === pathname && currentUrl.searchParams.get('notify') === notify) {
        if (notify === 'login_success') toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ');
        if (notify === 'logout_success') toast.success('ออกจากระบบเรียบร้อย');
        if (notify === 'create_success') toast.success('สร้างกระทู้เรียบร้อย');
        if (notify === 'delete_success') toast.success('ลบข้อมูลสำเร็จ');
        if (notify === 'edit_success') toast.success('บันทึกการแก้ไขแล้ว');
        if (notify === 'register_success') toast.success('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
        
        // Error Notifications
        if (notify === 'banned') toast.error('บัญชีของคุณถูกระงับการใช้งาน', { style: { background: '#ef4444', color: '#fff' }, duration: 5000 });
        if (notify === 'login_failed') toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

        // Notification cleanup is URL-only: do not start a competing navigation.
        currentUrl.searchParams.delete('notify');
        window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
  }, [searchParams, pathname]);

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
