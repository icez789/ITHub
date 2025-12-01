import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import GlobalClickEffect from "../components/GlobalClickEffect";
import BottomNav from "../components/BottomNav";
import Navbar from "../components/Navbar"; 
import Sidebar from "../components/Sidebar"; 
import NextTopLoader from 'nextjs-toploader'; // ✅ 1. Import เข้ามา

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen relative">
        
        {/* ✅ 2. วางไว้ตรงนี้เลย (บนสุดใน body) */}
        <NextTopLoader 
          color="#dc2626"   // สีแดง (ตรงกับ theme เว็บ)
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}        // ความหนาของเส้น
          crawl={true}
          showSpinner={false} // ปิดวงกลมหมุนๆ (เอาแค่เส้นวิ่งๆ พอ ดูแพงกว่า)
          easing="ease"
          speed={200}
          shadow="0 0 10px #dc2626,0 0 5px #dc2626" // ใส่เงาให้เส้นดูเรืองแสงนิดๆ
        />

        <ThemeProvider>
           <GlobalClickEffect /> 
           <ToastProvider />
           
           <div className="flex min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300">
              
              <Sidebar />

              <main className="flex-1 flex flex-col h-screen overflow-hidden">
                  
                  <Navbar />
                  
                  <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black p-0">
                      {children}
                  </div>

              </main>
           </div>

           <BottomNav />

        </ThemeProvider>
      </body>
    </html>
  );
}