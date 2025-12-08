/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // ✅ 1. เพิ่มลิมิตขนาดข้อมูลเป็น 10MB (แก้ปัญหาแปะรูปใน Editor แล้วพัง)
      bodySizeLimit: '10mb',

      // ✅ 2. อนุญาตให้เข้าถึงจาก ngrok ได้ (ของเดิมที่ลูกพี่มี)
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app'], 
    },
  },

  // (Optional) อันนี้เผื่อไว้ ถ้าอนาคตลูกพี่ดึงรูปจากเว็บอื่นมาแสดง จะได้ไม่ติด Error
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;