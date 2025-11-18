'use client'; // ต้องเป็น Client Component

import { Toaster, toast } from 'react-hot-toast';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ToastProvider() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ดึงค่าจาก URL เช่น ?notify=login_success
    const notify = searchParams.get('notify');

    if (notify) {
      // 1. เช็กว่า notify คืออะไร แล้วโชว์ข้อความตามนั้น
      if (notify === 'login_success') toast.success('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับครับ 👋');
      if (notify === 'logout_success') toast.success('ออกจากระบบเรียบร้อย ไว้เจอกันใหม่นะ');
      if (notify === 'create_success') toast.success('สร้างกระทู้เรียบร้อย! 🎉');
      if (notify === 'delete_success') toast.success('ลบกระทู้แล้ว 🗑️');
      if (notify === 'edit_success') toast.success('บันทึกการแก้ไขแล้ว ✏️');
      if (notify === 'register_success') toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');

      // 2. ล้างค่า notify ออกจาก URL (เพื่อไม่ให้ refresh แล้วเด้งซ้ำ)
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('notify');
      router.replace(`${pathname}?${newParams.toString()}`);
    }
  }, [searchParams, router, pathname]);

  return (
    <Toaster 
      position="top-right" // ตำแหน่งมุมขวาบน
      toastOptions={{
        duration: 3000, // โชว์นาน 3 วินาที
        style: {
          background: '#333',
          color: '#fff',
        },
      }}
    />
  );
}