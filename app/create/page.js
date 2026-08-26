'use client'; // ✅ เปลี่ยนเป็น Client Component เพื่อใช้ State

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTopicWithPoll } from '../../lib/actions'; // เดี๋ยวเราไปสร้างฟังก์ชันนี้กัน
import Editor from '../../components/Editor'; 
import Swal from 'sweetalert2';
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
      await Swal.fire({ icon: 'error', title: 'กรุณาใส่รายละเอียดอย่างน้อย 5 ตัวอักษร' });
      return;
    }

    // เพิ่มข้อมูลโพลเข้าไปใน formData (ถ้ามี)
    if (hasPoll) {
        if (!pollQuestion.trim()) {
            Swal.fire({ icon: 'error', title: 'กรุณากรอกคำถามโพล' });
            return;
        }
        // กรองตัวเลือกที่ว่างออก
        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            Swal.fire({ icon: 'error', title: 'ต้องมีตัวเลือกโพลอย่างน้อย 2 ข้อ' });
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
      await Swal.fire({ icon: 'error', title: 'ส่งกระทู้ไม่สำเร็จ', text: 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง' });
      return;
    }

    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'ตั้งกระทู้สำเร็จ!',
            text: 'ระบบกำลังพาคุณไปหน้ากระทู้ (+10 XP)',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            router.push(`/topic/${result.topicId}`);
        });
    } else {
        setIsSubmitting(false);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: result.message });
    }
  };

  return (
    <main className="ithub-page-container mx-auto max-w-3xl pb-24 pt-8 md:pb-12 md:pt-12">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 dark:text-white">
          <Plus className="text-red-600" aria-hidden="true" size={25} /> ตั้งกระทู้ใหม่
        </h1>
        
        <form action={handleSubmit} className="flex flex-col gap-6">
          
          <div>
            <label htmlFor="topic-title" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หัวข้อกระทู้ <span className="text-red-500">*</span></label>
            <input id="topic-title" name="title" type="text" required minLength={5} maxLength={160} placeholder="เช่น สอบถามเรื่องการประกอบคอม..." className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label htmlFor="topic-category" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หมวดหมู่ <span className="text-red-500">*</span></label>
            <select id="topic-category" name="category" required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-black dark:border-neutral-700 dark:text-white cursor-pointer">
              <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
              <option value="Software">Software (โปรแกรม & OS)</option>
              <option value="Network">Network (เครือข่าย & Internet)</option>
              <option value="AI & Data">AI & Data Science</option>
              <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
          </div>

          <div>
            <label id="topic-content-label" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รายละเอียด <span className="text-red-500">*</span></label>
            <div role="group" aria-labelledby="topic-content-label" className="border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700">
               <Editor /> 
            </div>
          </div>

          <div>
            <label htmlFor="topic-image" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รูปภาพประกอบ (ถ้ามี)</label>
            <input id="topic-image" name="image" type="file" accept="image/*" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:bg-black dark:border-neutral-700 dark:text-gray-300 dark:file:bg-red-900/30 dark:file:text-red-400 cursor-pointer" />
          </div>

          {/* ✅ ส่วนเพิ่มโพล (Poll Toggle) */}
          <div className="border-t border-gray-200 pt-6 dark:border-neutral-700">
             <div className="flex items-center justify-between mb-4">
                <label className="text-gray-800 font-bold dark:text-white flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={hasPoll} 
                        onChange={(e) => setHasPoll(e.target.checked)} 
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <BarChart3 className="text-red-600" aria-hidden="true" size={19} /> เพิ่มโพลสำรวจ
                </label>
             </div>

             {hasPoll && (
                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-4">
                        <label htmlFor="poll-question" className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">คำถามโพล</label>
                        <input 
                            id="poll-question"
                            type="text" 
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="เช่น คุณชอบ Framework ตัวไหน?" 
                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm dark:bg-black dark:border-neutral-600 dark:text-white"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">ตัวเลือกคำตอบ</label>
                        {pollOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    aria-label={`ตัวเลือกโพลที่ ${idx + 1}`}
                                    type="text" 
                                    value={opt}
                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                    placeholder={`ตัวเลือกที่ ${idx + 1}`}
                                    className="flex-1 bg-white border border-gray-300 rounded p-2 text-sm dark:bg-black dark:border-neutral-600 dark:text-white"
                                />
                                {pollOptions.length > 2 && (
                                    <button type="button" aria-label={`ลบตัวเลือกโพลที่ ${idx + 1}`} onClick={() => removeOption(idx)} className="rounded-md px-2 text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 aria-hidden="true" size={17} /></button>
                                )}
                            </div>
                        ))}
                    </div>

                    {pollOptions.length < 8 && (
                        <button type="button" onClick={addOption} className="mt-3 text-sm text-red-600 hover:text-red-700 font-bold flex items-center gap-1">
                            <Plus aria-hidden="true" size={16} /> เพิ่มตัวเลือก
                        </button>
                    )}
                 </div>
             )}
          </div>

          <button type="submit" disabled={isSubmitting} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--app-primary)] py-4 font-semibold text-white transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> กำลังโพสต์...</> : <><Send aria-hidden="true" size={18} /> โพสต์กระทู้</>}
          </button>
        </form>
      </div>
    </main>
  );
}
