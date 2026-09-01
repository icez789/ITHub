'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { votePoll } from '../lib/actions';
import { toast } from 'react-hot-toast';
import { pusherClient } from '../lib/pusherClient'; // ✅ Import Pusher Client
import { BarChart3, CheckCircle2, Crown, Handshake } from 'lucide-react';

export default function PollUI({ poll, options: initialOptions, userVote: initialUserVote, currentUser }) {
  const router = useRouter();
  
  const [options, setOptions] = useState(initialOptions);
  const [userVote, setUserVote] = useState(initialUserVote);
  
  const [selectedOption, setSelectedOption] = useState(initialUserVote || null);
  const [isVoting, setIsVoting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!initialUserVote); 

  // ✅ เพิ่ม useEffect สำหรับ Real-time
  useEffect(() => {
    // 1. สมัครรับข้อมูลจากช่อง poll-{pollId}
    const channel = pusherClient.subscribe(`poll-${poll.id}`);

    // 2. เมื่อมีอีเวนต์ 'update-poll' เข้ามา
    channel.bind('update-poll', (newOptions) => {
        // อัปเดต options ใหม่ทันที (กราฟจะขยับเอง)
        setOptions(newOptions);
    });

    // 3. Cleanup: เลิกรับข้อมูลเมื่อปิดหน้านี้
    return () => {
        pusherClient.unsubscribe(`poll-${poll.id}`);
    };
  }, [poll.id]);

  // Sync ค่าเริ่มต้น (เผื่อมีการนำทางไปมา)
  useEffect(() => {
    // ถ้าเราไม่ได้เป็นคนโหวตเอง (คือรับค่าจาก Realtime) ไม่ต้องไปยุ่งกับ userVote
    // ให้ userVote อัปเดตเฉพาะตอน initial load หรือ server action response เท่านั้น
  }, [initialOptions]);


  const totalVotes = options.reduce((acc, opt) => acc + opt.vote_count, 0);

  const handleSelect = (optionId) => {
    if (!isEditMode) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
        toast.error('กรุณาเข้าสู่ระบบก่อนโหวต');
        return;
    }
    if (!selectedOption) return;

    setIsVoting(true);

    // Optimistic UI (อัปเดตหน้าจอตัวเองก่อน เพื่อความลื่น)
    const newOptions = options.map(opt => {
        if (opt.id === selectedOption) {
            return { ...opt, vote_count: opt.vote_count + 1 };
        }
        if (opt.id === userVote) {
            return { ...opt, vote_count: Math.max(0, opt.vote_count - 1) };
        }
        return opt;
    });
    setOptions(newOptions);
    setUserVote(selectedOption);
    setIsEditMode(false); 

    const result = await votePoll(poll.id, selectedOption);

    setIsVoting(false);

    if (result.success) {
        // router.refresh(); // ❌ ไม่ต้อง refresh แล้ว เพราะเดี๋ยว Pusher จะส่งข้อมูลล่าสุดกลับมาให้เอง
        
        toast.success(result.message || 'บันทึกการโหวตแล้ว');
    } else {
        toast.error(result.message || 'บันทึกการโหวตไม่สำเร็จ');
        router.refresh(); // ถ้าพลาดค่อย refresh เอาค่าเดิมกลับมา
    }
  };

  // ... (ส่วน return JSX เหมือนเดิมเป๊ะ ไม่ต้องแก้) ...
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <BarChart3 className="text-red-600 dark:text-red-400" aria-hidden="true" size={22} />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{poll.question}</h3>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const percent = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const isSelected = selectedOption === opt.id;
          
          const maxVotes = Math.max(...options.map(o => o.vote_count));
          const winnersCount = options.filter(o => o.vote_count === maxVotes).length;
          const isWinner = opt.vote_count === maxVotes && totalVotes > 0;
          const isTie = isWinner && winnersCount > 1;

          return (
            <div key={opt.id} className="relative group">
              <button
                disabled={!isEditMode || isVoting}
                onClick={() => handleSelect(opt.id)}
                className={`w-full text-left relative overflow-hidden rounded-lg border-2 transition-all p-4 z-10
                    ${isSelected 
                        ? 'border-red-600 dark:border-red-500 ring-1 ring-red-500' 
                        : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                    }
                    ${isEditMode && !isSelected ? 'hover:border-red-400 dark:hover:border-red-500 hover:bg-gray-50 dark:hover:bg-neutral-800' : ''}
                    ${!isEditMode ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out -z-10
                        ${isSelected 
                            ? 'bg-red-600/15 dark:bg-red-500/30' 
                            : 'bg-gray-500/15 dark:bg-gray-500/30' 
                        }
                    `} 
                    style={{ width: `${percent}%` }}
                ></div>

                <div className="relative flex justify-between items-center">
                    <span className={`font-bold flex items-center gap-2 ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {isEditMode && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-red-600' : 'border-gray-400 group-hover:border-red-400'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>}
                            </div>
                        )}
                        
                        {opt.label}
                        
                        {!isEditMode && isWinner && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1 ${
                                isTie 
                                ? 'bg-gray-600 text-white dark:bg-gray-700' 
                                : 'bg-yellow-400 text-black'
                            }`}>
                                {isTie ? <><Handshake aria-hidden="true" size={13} /> เสมอ</> : <><Crown aria-hidden="true" size={13} /> นำอยู่</>}
                            </span>
                        )}
                    </span>
                    
                    <span className={`text-sm font-mono font-bold ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {opt.vote_count} ({percent}%)
                    </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between border-t border-gray-200 dark:border-neutral-800 pt-5 gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            รวมทั้งหมด <span className="font-bold text-gray-800 dark:text-gray-200">{totalVotes.toLocaleString()}</span> คะแนน
        </span>
        
        {isEditMode ? (
            <div className="flex gap-3 ml-auto">
                {userVote && (
                    <button 
                        onClick={() => {
                            setIsEditMode(false); 
                            setSelectedOption(userVote);
                        }}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg"
                    >
                        ยกเลิก
                    </button>
                )}
                <button
                    disabled={!selectedOption || isVoting || selectedOption === userVote}
                    onClick={handleSubmit}
                    className={`px-6 py-2 rounded-lg font-bold text-white text-sm shadow-sm transition-all
                        ${!selectedOption || selectedOption === userVote
                            ? 'bg-gray-400 cursor-not-allowed dark:bg-neutral-700 dark:text-gray-500' 
                            : 'bg-red-600 hover:bg-red-700 hover:shadow-md active:scale-95'
                        }
                    `}
                >
                    {isVoting ? 'กำลังบันทึก...' : (userVote ? 'ยืนยันการเปลี่ยน' : 'ยืนยันการโหวต')}
                </button>
            </div>
        ) : (
            <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle2 aria-hidden="true" size={16} /> คุณโหวตแล้ว
                </div>
                
                <button 
                    onClick={() => {
                        setIsEditMode(true);
                        setSelectedOption(userVote);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 border-gray-300 dark:border-neutral-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 transition-all bg-white dark:bg-neutral-900 hover:shadow-sm active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                    เปลี่ยนคำตอบ
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
