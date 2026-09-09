'use client';

import ResearchRouteError from '../../components/ResearchRouteError';

export default function FeedbackError({ error, reset }) {
  return (
    <ResearchRouteError
      error={error}
      reset={reset}
      title="โหลดแบบประเมินและ Feedback ไม่สำเร็จ"
      description="ข้อมูลที่ยังไม่ได้ยืนยันส่งจะไม่ถูกบันทึก กรุณาตรวจการเชื่อมต่อแล้วลองโหลดหน้านี้อีกครั้ง"
    />
  );
}
