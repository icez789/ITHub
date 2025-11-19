import "./globals.css";
import ToastProvider from "../components/ToastProvider"; // 👈 ต้อง import
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen">
        <ThemeProvider>
           <ToastProvider /> {/* 👈 ต้องวางไว้ตรงนี้ (เหนือ children) */}
           {children}
        </ThemeProvider>
      </body>
    </html>
  );
}