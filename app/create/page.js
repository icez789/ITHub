'use client'; // ✅ เปลี่ยนเป็น Client Component เพื่อใช้ State

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTopicWithPoll } from '../../lib/actions'; // เดี๋ยวเราไปสร้างฟังก์ชันนี้กัน
import Editor from '../../components/Editor'; 
import { toast } from 'react-hot-toast';
import { BarChart3, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react';

export default function CreateTopicPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State สำหรับจัดการโพล
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']); // เริ่มต้น 2 ตัวเลือก

  // ฟังก์ชันจัดการตัวเลือกโพล
  const handleOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addOption = () => {
    if (pollOptions.length < 8) setPollOptions([...pollOptions, '']);
  };

  const removeOption = (index) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  // ฟังก์ชัน Submit Form
  const handleSubmit = async (formData) => {
    const content = String(formData.get('content') || '');
    const plainContent = new DOMParser().parseFromString(content, 'text/html').body.textContent?.trim() || '';
    if (plainContent.length < 5) {
      toast.error('กรุณาใส่รายละเอียดอย่างน้อย 5 ตัวอักษร');
      return;
    }

    // เพิ่มข้อมูลโพลเข้าไปใน formData (ถ้ามี)
    if (hasPoll) {
        if (!pollQuestion.trim()) {
            toast.error('กรุณากรอกคำถามโพล');
            return;
        }
        // กรองตัวเลือกที่ว่างออก
        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            toast.error('ต้องมีตัวเลือกโพลอย่างน้อย 2 ข้อ');
            return;
        }

        formData.append('pollQuestion', pollQuestion);
        formData.append('pollOptions', JSON.stringify(validOptions)); // ส่งเป็น JSON array
    }

    // เรียก Server Action
    setIsSubmitting(true);
    let result;
    try {
      result = await createTopicWithPoll(formData);
    } catch {
      setIsSubmitting(false);
      toast.error('ส่งกระทู้ไม่สำเร็จ การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง');
      return;
    }

    if (result.success) {
        toast.success('ตั้งกระทู้สำเร็จ (+10 XP)');
        router.push(`/topic/${result.topicId}`);
    } else {
        setIsSubmitting(false);
        toast.error(result.message || 'ตั้งกระทู้ไม่สำเร็จ');
    }
  };

  return (
    <main className="ithub-page-container mx-auto max-w-3xl pb-24 pt-8 md:pb-12 md:pt-12">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-[var(--app-text)]">
          <Plus className="text-[var(--app-accent-text)]" aria-hidden="true" size={25} /> ตั้งกระทู้ใหม่
        </h1>
        
        <form action={handleSubmit} className="flex flex-col gap-6">
          
          <div>
            <label htmlFor="topic-title" className="mb-2 block font-bold text-[var(--app-text)]">หัวข้อกระทู้ <span className="text-[var(--app-danger)]">*</span></label>
            <input id="topic-title" name="title" type="text" required minLength={5} maxLength={160} placeholder="เช่น สอบถามเรื่องการประกอบคอม..." className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
          </div>

          <div>
            <label htmlFor="topic-category" className="mb-2 block font-bold text-[var(--app-text)]">หมวดหมู่ <span className="text-[var(--app-danger)]">*</span></label>
            <select id="topic-category" name="category" required className="w-full cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]">
              <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
              <option value="Software">Software (โปรแกรม & OS)</option>
              <option value="Network">Network (เครือข่าย & Internet)</option>
              <option value="AI & Data">AI & Data Science</option>
              <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
          </div>

          <div>
            <label id="topic-content-label" className="mb-2 block font-bold text-[var(--app-text)]">รายละเอียด <span className="text-[var(--app-danger)]">*</span></label>
            <div role="group" aria-labelledby="topic-content-label" className="overflow-hidden rounded-lg border border-[var(--app-border)]">
               <Editor /> 
            </div>
          </div>

          <div>
            <label htmlFor="topic-image" className="mb-2 block font-bold text-[var(--app-text)]">รูปภาพประกอบ (ถ้ามี)</label>
            <input id="topic-image" name="image" type="file" accept="image/*" className="w-full cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-2 text-sm text-[var(--app-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--app-primary-soft)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--app-accent-text)] hover:file:bg-[var(--app-surface-elevated)]" />
          </div>

          {/* ✅ ส่วนเพิ่มโพล (Poll Toggle) */}
          <div className="border-t border-[var(--app-border)] pt-6">
             <div className="flex items-center justify-between mb-4">
                <label className="flex cursor-pointer items-center gap-2 font-bold text-[var(--app-text)]">
                    <input 
                        type="checkbox" 
                        checked={hasPoll} 
                        onChange={(e) => setHasPoll(e.target.checked)} 
                        className="h-5 w-5 rounded [accent-color:var(--app-primary)] focus:ring-[var(--app-focus-ring)]"
                    />
                    <BarChart3 className="text-[var(--app-accent-text)]" aria-hidden="true" size={19} /> เพิ่มโพลสำรวจ
                </label>
             </div>

             {hasPoll && (
                 <div className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4 motion-reduce:animate-none">
                    <div className="mb-4">
                        <label htmlFor="poll-question" className="mb-1 block text-sm font-bold text-[var(--app-text)]">คำถามโพล</label>
                        <input 
                            id="poll-question"
                            type="text" 
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="เช่น คุณชอบ Framework ตัวไหน?" 
                            className="w-full rounded border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[var(--app-text)]">ตัวเลือกคำตอบ</label>
                        {pollOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    aria-label={`ตัวเลือกโพลที่ ${idx + 1}`}
                                    type="text" 
                                    value={opt}
                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                    placeholder={`ตัวเลือกที่ ${idx + 1}`}
                                    className="flex-1 rounded border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                                />
                                {pollOptions.length > 2 && (
                                    <button type="button" aria-label={`ลบตัวเลือกโพลที่ ${idx + 1}`} onClick={() => removeOption(idx)} className="rounded-md px-2 text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 aria-hidden="true" size={17} /></button>
                                )}
                            </div>
                        ))}
                    </div>

                    {pollOptions.length < 8 && (
                        <button type="button" onClick={addOption} className="mt-3 flex items-center gap-1 text-sm font-bold text-[var(--app-accent-text)] hover:text-[var(--app-primary-hover)]">
                            <Plus aria-hidden="true" size={16} /> เพิ่มตัวเลือก
                        </button>
                    )}
                 </div>
             )}
          </div>

          <button type="submit" disabled={isSubmitting} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--app-primary)] py-4 font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> กำลังโพสต์...</> : <><Send aria-hidden="true" size={18} /> โพสต์กระทู้</>}
          </button>
        </form>
      </div>
    </main>
  );
}
