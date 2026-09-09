'use client';

import ResearchRouteError from '../../../components/ResearchRouteError';

export default function ResearchAnalyticsError({ error, reset }) {
  return (
    <ResearchRouteError
      error={error}
      reset={reset}
      title="โหลด Dashboard ข้อมูลวิจัยไม่สำเร็จ"
      description="ยังไม่มีการเปลี่ยนข้อมูลจากหน้าจอนี้ กรุณาลองโหลดใหม่ หากปัญหายังคงอยู่ให้ตรวจการเชื่อมต่อฐานข้อมูลและสิทธิ์ผู้ดูแล"
    />
  );
}
