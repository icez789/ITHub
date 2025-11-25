'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RippleButton({ children, className = '', onClick, rippleColor = 'rgba(255, 255, 255, 0.3)', ...props }) {
  const [ripples, setRipples] = useState([]);

  const createRipple = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const newRipple = { x, y, size, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    if (onClick) onClick(e);
  };

  useEffect(() => {
    if (ripples.length > 0) {
      const lastRipple = ripples[ripples.length - 1];
      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== lastRipple.id));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <motion.button
      className={`relative overflow-hidden transform transition-transform active:scale-95 ${className}`}
      onClick={createRipple}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              position: 'absolute', top: ripple.y, left: ripple.x,
              width: ripple.size, height: ripple.size,
              backgroundColor: rippleColor, borderRadius: '50%', pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}