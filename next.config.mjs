/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // ✅ 1. เพิ่มลิมิตขนาดข้อมูลเป็น 10MB (แก้ปัญหาแปะรูปใน Editor แล้วพัง)
      bodySizeLimit: '6mb',

      // ✅ 2. อนุญาตให้เข้าถึงจาก ngrok ได้ (ของเดิมที่ลูกพี่มี)
      allowedOrigins: (process.env.SERVER_ACTION_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
  },
  allowedDevOrigins: ['127.0.0.1'],

  // (Optional) อันนี้เผื่อไว้ ถ้าอนาคตลูกพี่ดึงรูปจากเว็บอื่นมาแสดง จะได้ไม่ติด Error
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};

export default nextConfig;
