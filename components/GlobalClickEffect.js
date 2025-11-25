'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalClickEffect() {
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    const handleClick = (e) => {
      const newClick = {
        x: e.pageX, 
        y: e.pageY,
        id: Date.now(),
      };
      setClicks((prev) => [...prev, newClick]);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (clicks.length > 0) {
      const timer = setTimeout(() => {
        setClicks((prev) => prev.slice(1));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [clicks]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden h-full w-full">
      <AnimatePresence>
        {clicks.map((click) => (
          <motion.span
            key={click.id}
            initial={{ opacity: 0.8, scale: 0 }}
            animate={{ opacity: 0, scale: 2.5 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            
            // ✨ จุดที่แก้ไข: ใช้ Tailwind Class แทน Inline Style
            // Light Mode: border-red-600 (ขอบแดง)
            // Dark Mode:  dark:border-white (ขอบขาว) + dark:shadow (เงาฟุ้งๆ สีขาว)
            className="absolute rounded-full border-2 border-red-600 dark:border-white dark:shadow-[0_0_15px_rgba(255,255,255,0.6)]"
            
            style={{
              top: click.y - 25,
              left: click.x - 25,
              width: 50,
              height: 50,
              // เอาสีออกจากตรงนี้แล้ว ให้ Tailwind จัดการแทน
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}