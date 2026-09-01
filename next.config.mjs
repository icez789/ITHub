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
    const isProduction = process.env.VERCEL_ENV === 'production';
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://res.cloudinary.com https://api.dicebear.com",
      "connect-src 'self' https://*.pusher.com wss://*.pusher.com https://*.vercel-insights.com",
      'upgrade-insecure-requests',
    ].join('; ');
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
          value: contentSecurityPolicy,
        },
        ...(isProduction
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
          : []),
      ],
    }];
  },
};

export default nextConfig;
