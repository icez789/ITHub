import { ImageResponse } from 'next/og';

// ตั้งค่าขนาดรูป (32x32 คือมาตรฐาน Favicon)
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// สร้างรูปภาพจากโค้ด (JFX)
export default function Icon() {
  return new ImageResponse(
    (
      // Image container
      <div
        style={{
          fontSize: 18,
          background: 'linear-gradient(to bottom right, #dc2626, #7f1d1d)', // ไล่สีแดง
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '6px', // มุมมนนิดๆ
          fontWeight: 800,
          fontFamily: 'sans-serif',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        IT
      </div>
    ),
    {
      ...size,
    }
  );
}