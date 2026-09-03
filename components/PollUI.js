'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { votePoll } from '../lib/actions';
import { toast } from 'react-hot-toast';
import { pusherClient } from '../lib/pusherClient'; // ✅ Import Pusher Client
import { BarChart3, CheckCircle2, Crown, Handshake, Pencil } from 'lucide-react';

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
    <div className="mb-8 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <BarChart3 className="text-[var(--app-accent-text)]" aria-hidden="true" size={22} />
            <h3 className="text-xl font-bold text-[var(--app-text)]">{poll.question}</h3>
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
                        ? 'border-[var(--app-primary)] ring-1 ring-[var(--app-focus-ring)]'
                        : 'border-[var(--app-border)] bg-[var(--app-surface)]'
                    }
                    ${isEditMode && !isSelected ? 'hover:border-[var(--app-primary)] hover:bg-[var(--app-surface-subtle)]' : ''}
                    ${!isEditMode ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out -z-10
                        ${isSelected 
                            ? 'bg-[var(--app-primary-soft)]'
                            : 'bg-[var(--app-surface-subtle)]'
                        }
                    `} 
                    style={{ width: `${percent}%` }}
                ></div>

                <div className="relative flex justify-between items-center">
                    <span className={`flex items-center gap-2 font-bold ${isSelected ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-text)]'}`}>
                        {isEditMode && (
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'border-[var(--app-primary)]' : 'border-[var(--app-border-strong)] group-hover:border-[var(--app-primary)]'}`}>
                                {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-[var(--app-primary)]"></div>}
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
                    
                    <span className={`font-mono text-sm font-bold ${isSelected ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)]'}`}>
                        {opt.vote_count} ({percent}%)
                    </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--app-border)] pt-5">
        <span className="text-sm font-medium text-[var(--app-text-muted)]">
            รวมทั้งหมด <span className="font-bold text-[var(--app-text)]">{totalVotes.toLocaleString()}</span> คะแนน
        </span>
        
        {isEditMode ? (
            <div className="flex gap-3 ml-auto">
                {userVote && (
                    <button 
                        onClick={() => {
                            setIsEditMode(false); 
                            setSelectedOption(userVote);
                        }}
                        className="rounded-lg bg-[var(--app-surface-subtle)] px-4 py-2 text-sm font-bold text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
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
                            : 'bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)] hover:shadow-md'
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
                    className="flex items-center gap-2 rounded-lg border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-1.5 text-sm font-bold text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-primary)] hover:text-[var(--app-accent-text)]"
                >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                    เปลี่ยนคำตอบ
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
