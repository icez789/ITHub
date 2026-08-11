'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// 1. ✅ ใส่ค่า Default ป้องกันอาการจอแดง (Undefined Error)
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}, 
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // โหลดค่าเดิมจาก LocalStorage
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      const frame = requestAnimationFrame(() => setTheme(storedTheme));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // บันทึกค่าและเปลี่ยน Class ที่ HTML tag
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 2. ✅ เพิ่มตัวเช็คความปลอดภัย (Safety Check)
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme ต้องถูกเรียกใช้ภายใต้ ThemeProvider เท่านั้นครับ!');
  }
  return context;
};
