import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import GlobalClickEffect from "../components/GlobalClickEffect"; // 1. Import เข้ามา

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen">
        <ThemeProvider>
           <GlobalClickEffect /> {/* 2. วางไว้ตรงนี้ (วางตรงไหนก็ได้ใน body) */}
           <ToastProvider />
           {children}
        </ThemeProvider>
      </body>
    </html>
  );
}