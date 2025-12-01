/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // อนุญาตให้เข้าถึงจาก ngrok ได้
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app'], 
    },
  },
  // (ถ้ามี config อื่นๆ เดิมอยู่แล้ว ให้คงไว้เหมือนเดิมนะครับ)
};

export default nextConfig;