import "./globals.css";
import ToastProvider from "../components/ToastProvider"; // 1. เรียกใช้ตัวที่เราเพิ่งสร้าง

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* 2. ใส่ ToastProvider ไว้ตรงนี้ (อยู่เหนือเนื้อหาทั้งหมด) */}
        <ToastProvider />
        
        {children}
      </body>
    </html>
  );
}