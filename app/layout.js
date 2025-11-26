import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import GlobalClickEffect from "../components/GlobalClickEffect";
import BottomNav from "../components/BottomNav"; // 1. Import เมนูมือถือ

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen relative">
        <ThemeProvider>
           {/* เอฟเฟกต์คลิกกระจายทั่วหน้าจอ */}
           <GlobalClickEffect />
           
           {/* ระบบแจ้งเตือน */}
           <ToastProvider />
           
           {/* เนื้อหาหลักของเว็บ */}
           {children}

           {/* 2. วาง BottomNav ไว้ตรงนี้ (มันจะโชว์เฉพาะในมือถือ) */}
           <BottomNav />

        </ThemeProvider>
      </body>
    </html>
  );
}