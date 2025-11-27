import "./globals.css";
import ToastProvider from "../components/ToastProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import GlobalClickEffect from "../components/GlobalClickEffect"; // ✅ เปิด
import BottomNav from "../components/BottomNav"; // ✅ เปิด
import Navbar from "../components/Navbar"; 
import Sidebar from "../components/Sidebar"; // ✅ เปิด

export const metadata = {
  title: "IT Techboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 transition-colors duration-300 min-h-screen relative">
        <ThemeProvider>
           <GlobalClickEffect /> 
           <ToastProvider />
           
           <div className="flex min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300">
              
              <Sidebar /> {/* ✅ Sidebar กลับมาแล้ว */}

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