'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function BouncyLink({ href, children, className, ...props }) {
  return (
    // แก้ไข: ลบ prop ผิดๆ ออก เหลือแค่ href
    <Link href={href}>
      <motion.div
        // เพิ่ม cursor-pointer และ inline-block เพื่อให้กดได้เต็มพื้นที่
        className={`inline-block cursor-pointer ${className || ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...props}
      >
        {children}
      </motion.div>
    </Link>
  );
}