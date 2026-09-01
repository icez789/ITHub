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
            <label htmlFor="edit-topic-title" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หัวข้อกระทู้ <span className="text-red-500">*</span></label>
            <input id="edit-topic-title" name="title" type="text" required minLength={5} maxLength={160} defaultValue={topic.title} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-black dark:border-neutral-700 dark:text-white" />
        </div>

        <div>
            <label htmlFor="edit-topic-category" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">หมวดหมู่ <span className="text-red-500">*</span></label>
            <select id="edit-topic-category" name="category" required defaultValue={topic.category} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-black dark:border-neutral-700 dark:text-white cursor-pointer">
                <option value="Hardware">Hardware (อุปกรณ์คอมพิวเตอร์)</option>
                <option value="Software">Software (โปรแกรม & OS)</option>
                <option value="Network">Network (เครือข่าย & Internet)</option>
                <option value="AI & Data">AI & Data Science</option>
                <option value="General">General (พูดคุยทั่วไป)</option>
            </select>
        </div>

        <div>
            <label id="edit-topic-content-label" className="block text-gray-700 font-bold mb-2 dark:text-gray-200">รายละเอียด <span className="text-red-500">*</span></label>
            <div role="group" aria-labelledby="edit-topic-content-label" className="border border-gray-300 rounded-lg overflow-hidden dark:border-neutral-700">
                <Editor defaultValue={topic.content} /> 
            </div>
            {/* ✅ Tip: บอกวิธีลบรูปใน Editor ให้ User รู้ */}
            <p className="text-xs text-gray-400 mt-1">* หากต้องการลบรูปในเนื้อหา ให้คลิกที่รูปแล้วกดปุ่ม Backspace หรือ Delete</p>
        </div>

        {/* ✅ ส่วนจัดการรูปภาพ (ปรับปรุงใหม่) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
            <label className="block text-gray-700 font-bold mb-3 dark:text-gray-200">รูปภาพปกกระทู้</label>
            
            {imagePreview ? (
                // 🅰️ กรณีมีรูปโชว์อยู่
                <div className="flex flex-col gap-3">
                    <div className="relative inline-block w-fit group">
                        <Image src={imagePreview} alt="ตัวอย่างรูปภาพกระทู้" width={320} height={192} unoptimized className="h-48 w-auto rounded-lg border border-gray-300 object-cover bg-white" />
                        <button type="button" onClick={handleRemoveImage} aria-label="ลบรูปปกกระทู้" className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition-transform hover:scale-110" title="ลบรูปนี้">
                            <X aria-hidden="true" size={16} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label htmlFor="imageInput" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-600 dark:bg-black dark:text-gray-300">
                            <RefreshCw aria-hidden="true" size={16} /> เปลี่ยนรูปใหม่
                        </label>
                        <span className="text-xs text-gray-400">ไฟล์เดิมจะถูกแทนที่</span>
                    </div>
                </div>
            ) : (
                // 🅱️ กรณีไม่มีรูป (หรือถูกลบไปแล้ว)
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-yellow-500 transition-colors bg-white dark:bg-black dark:border-neutral-700">
                    <div className="text-gray-400 mb-3">ยังไม่มีรูปภาพปก</div>
                    <label htmlFor="imageInput" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-6 py-3 font-semibold text-yellow-700 transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
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
            <Link href={`/topic/${topic.id}`} className="flex-1 py-3 text-center border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition dark:text-gray-300 dark:border-neutral-600 dark:hover:bg-neutral-800">
                ยกเลิก
            </Link>
            <button type="submit" disabled={isSubmitting} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-lg bg-[var(--app-primary)] py-3 font-semibold text-white transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={18} /> : <Save aria-hidden="true" size={18} />} {isSubmitting ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
            </button>
        </div>
    </form>
  );
}
