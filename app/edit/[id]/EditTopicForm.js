'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTopic } from '../../../lib/actions';
import Editor from '../../../components/Editor';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { ImagePlus, LoaderCircle, RefreshCw, Save, X } from 'lucide-react';

export default function EditTopicForm({ topic }) {
  const router = useRouter();
  
  const [imagePreview, setImagePreview] = useState(topic.image_url); 
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file)); 
      setIsImageRemoved(false); 
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null); 
    setIsImageRemoved(true); 
    // เคลียร์ค่า input
    const fileInput = document.getElementById('imageInput');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (formData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    formData.set('isImageRemoved', isImageRemoved);
    let result;
    try {
      result = await updateTopic(formData);
    } catch (error) {
      console.error('Topic update failed:', error);
      toast.error('แก้ไขกระทู้ไม่สำเร็จ กรุณาลองใหม่');
      setIsSubmitting(false);
      return;
    }

    if (result.success) {
        toast.success('แก้ไขกระทู้เรียบร้อย');
        router.push(`/topic/${result.topicId}`);
        router.refresh();
    } else {
        toast.error(result.message || 'แก้ไขกระทู้ไม่สำเร็จ');
        setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
        <input type="hidden" name="topicId" value={topic.id} />

        <div>
            <label htmlFor="edit-topic-title" className="mb-2 block font-bold text-[var(--app-text)]">หัวข้อกระทู้ <span className="text-[var(--app-danger)]">*</span></label>
            <input id="edit-topic-title" name="title" type="text" required minLength={5} maxLength={160} defaultValue={topic.title} className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]" />
        </div>

        <div>
            <label htmlFor="edit-topic-category" className="mb-2 block font-bold text-[var(--app-text)]">หมวดหมู่ <span className="text-[var(--app-danger)]">*</span></label>
            <select id="edit-topic-category" name="category" required defaultValue={topic.category} className="w-full cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3 text-[var(--app-text)] focus:border-[var(--app-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus-ring)]">
                <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
                <option value="Software">Software (โปรแกรม & OS)</option>
                <option value="Network">Network (เครือข่าย & Internet)</option>
                <option value="AI & Data">AI & Data Science</option>
                <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
        </div>

        <div>
            <label id="edit-topic-content-label" className="mb-2 block font-bold text-[var(--app-text)]">รายละเอียด <span className="text-[var(--app-danger)]">*</span></label>
            <div role="group" aria-labelledby="edit-topic-content-label" className="overflow-hidden rounded-lg border border-[var(--app-border)]">
                <Editor defaultValue={topic.content} /> 
            </div>
            {/* ✅ Tip: บอกวิธีลบรูปใน Editor ให้ User รู้ */}
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">* หากต้องการลบรูปในเนื้อหา ให้คลิกที่รูปแล้วกดปุ่ม Backspace หรือ Delete</p>
        </div>

        {/* ✅ ส่วนจัดการรูปภาพ (ปรับปรุงใหม่) */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-4">
            <label className="mb-3 block font-bold text-[var(--app-text)]">รูปภาพปกกระทู้</label>
            
            {imagePreview ? (
                // 🅰️ กรณีมีรูปโชว์อยู่
                <div className="flex flex-col gap-3">
                    <div className="relative inline-block w-fit group">
                        <Image src={imagePreview} alt="ตัวอย่างรูปภาพกระทู้" width={320} height={192} unoptimized className="h-48 w-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] object-cover" />
                        <button type="button" onClick={handleRemoveImage} aria-label="ลบรูปปกกระทู้" className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition-transform hover:scale-110" title="ลบรูปนี้">
                            <X aria-hidden="true" size={16} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label htmlFor="imageInput" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-elevated)]">
                            <RefreshCw aria-hidden="true" size={16} /> เปลี่ยนรูปใหม่
                        </label>
                        <span className="text-xs text-[var(--app-text-muted)]">ไฟล์เดิมจะถูกแทนที่</span>
                    </div>
                </div>
            ) : (
                // 🅱️ กรณีไม่มีรูป (หรือถูกลบไปแล้ว)
                <div className="rounded-lg border-2 border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-6 text-center transition-colors hover:border-[var(--app-primary)]">
                    <div className="mb-3 text-[var(--app-text-muted)]">ยังไม่มีรูปภาพปก</div>
                    <label htmlFor="imageInput" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] px-6 py-3 font-semibold text-[var(--app-accent-text)] transition-colors hover:bg-[var(--app-surface-elevated)]">
                        <ImagePlus aria-hidden="true" size={18} /> เพิ่มรูปภาพปก
                    </label>
                </div>
            )}

            {/* Input ซ่อนไว้ (ใช้ Label กดแทนเพื่อความสวยงาม) */}
            <input 
                id="imageInput"
                name="image" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="hidden" 
            />
        </div>

        <div className="flex gap-3 mt-4">
            <Link href={`/topic/${topic.id}`} className="flex-1 rounded-lg border border-[var(--app-border)] py-3 text-center font-bold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)]">
                ยกเลิก
            </Link>
            <button type="submit" disabled={isSubmitting} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-lg bg-[var(--app-primary)] py-3 font-semibold text-[var(--app-primary-contrast)] transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={18} /> : <Save aria-hidden="true" size={18} />} {isSubmitting ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
            </button>
        </div>
    </form>
  );
}
