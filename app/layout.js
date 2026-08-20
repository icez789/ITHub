import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import GlobalClickEffect from "../components/GlobalClickEffect";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar"; 
import Sidebar from "../components/Sidebar"; 
import NextTopLoader from 'nextjs-toploader'; 
import FloatingChat from "../components/FloatingChat"; // ✅ 1. Import แชทบอทเข้ามา
import Footer from "../components/Footer";
import OnboardingProvider from "../components/OnboardingProvider";
import { Suspense } from "react";
import 'highlight.js/styles/atom-one-dark.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "ITHub",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen relative">
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-red-600 px-4 py-2 font-bold text-white shadow-lg transition-transform focus:translate-y-0">
          ข้ามไปยังเนื้อหา
        </a>
        
        <NextTopLoader 
          color="#dc2626"   
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}        
          crawl={true}
          showSpinner={false} 
          easing="ease"
          speed={200}
          shadow="0 0 10px #dc2626,0 0 5px #dc2626" 
        />

        <ThemeProvider>
          <OnboardingProvider>
           <GlobalClickEffect /> 
           <ToastProvider />
           
           <div className="flex min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300">
              
              <Suspense fallback={null}><Sidebar /></Suspense>

              <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-16">
                  
                  <Navbar />
                  
                  <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black p-0 focus:outline-none">
                      {children}
                      <Footer />
                  </div>

              </div>
           </div>

           <Suspense fallback={null}><BottomNav /></Suspense>

           {/* ✅ 2. ฝัง FloatingChat ไว้ตรงนี้ เพื่อให้ลอยอยู่เหนือทุกสิ่ง และเปลี่ยนสีตาม Theme ได้ */}
           <FloatingChat />

          </OnboardingProvider>

        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
