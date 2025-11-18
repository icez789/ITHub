import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* แก้ไข: dark:bg-black (ดำสนิท) และ dark:text-gray-100 (ตัวหนังสือขาว) */}
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen">
        <ThemeProvider>
           <ToastProvider />
           {children}
        </ThemeProvider>
      </body>
    </html>
  );
}