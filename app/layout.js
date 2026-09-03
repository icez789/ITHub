import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar"; 
import Sidebar from "../components/Sidebar"; 
import NextTopLoader from 'nextjs-toploader'; 
import FloatingChat from "../components/FloatingChat";
import Footer from "../components/Footer";
import OnboardingProvider from "../components/OnboardingProvider";
import { Suspense } from "react";
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import 'highlight.js/styles/atom-one-dark.css';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { themeInitializationScript } from '../lib/theme';

const ithubFont = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-ithub-sans',
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata = {
  title: "ITHub",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning className={ithubFont.variable} data-mode="system" data-palette="classic" data-theme-ready="false">
      <body className="min-h-screen bg-[var(--app-background)] text-[var(--app-text)] transition-colors duration-200">
        <Script id="ithub-theme-init" strategy="beforeInteractive">{themeInitializationScript}</Script>
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-[var(--app-primary)] px-4 py-2 font-bold text-[var(--app-primary-contrast)] shadow-lg transition-transform focus:translate-y-0">
          ข้ามไปยังเนื้อหา
        </a>
        
        <NextTopLoader 
          color="var(--app-primary)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}        
          crawl={true}
          showSpinner={false} 
          easing="ease"
          speed={200}
        />

        <ThemeProvider>
          <OnboardingProvider>
           <ToastProvider />

           <div className="flex h-screen min-h-screen flex-col bg-[var(--app-background)] transition-colors duration-200">
             <Navbar />

             <div className="flex min-h-0 flex-1">
               <Suspense fallback={null}><Sidebar /></Suspense>

               <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto bg-[var(--app-background)] focus:outline-none">
                 {children}
                 <Footer />
               </div>
             </div>
           </div>

           <Suspense fallback={null}><BottomNav /></Suspense>
           <FloatingChat />
          </OnboardingProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
