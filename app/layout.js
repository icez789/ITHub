import "./globals.css"; // 👈 บรรทัดนี้สำคัญมาก! ต้องมี

export const metadata = {
  title: "IT Webboard",
  description: "ชุมชนไอที วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}