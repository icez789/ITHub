'use client';

import { useEffect } from 'react';
// 👇 แก้บรรทัดนี้ครับ (จาก ../app/actions เป็น ../lib/actions)
import { incrementView } from '../lib/actions'; 

export default function ViewCounter({ topicId }) {
  useEffect(() => {
    incrementView(topicId);
  }, [topicId]);

  return null;
}