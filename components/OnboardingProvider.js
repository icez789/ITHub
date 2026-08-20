'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const ONBOARDING_STORAGE_KEY = 'ithub_onboarding_v1';

const steps = [
  {
    icon: '🔎',
    eyebrow: 'ค้นพบความรู้',
    title: 'ค้นหากระทู้ที่ตรงกับคุณ',
    description: 'เริ่มจากช่องค้นหา เมนูมาแรง หรือเลือกหมวดหมู่เพื่อเจอคำถามและบทความที่สนใจได้เร็วขึ้น',
    points: ['ค้นหาจากชื่อหรือเนื้อหากระทู้', 'เลือกดู Hardware, Software, Network, AI & Data และ General'],
  },
  {
    icon: '✍️',
    eyebrow: 'แบ่งปันและสอบถาม',
    title: 'สร้างกระทู้ให้ชุมชนช่วยกันตอบ',
    description: 'เข้าสู่ระบบแล้วกด “สร้างกระทู้” ระบุหัวข้อ หมวดหมู่ และรายละเอียดให้ชัดเจน พร้อมแนบภาพหรือสร้างโพลได้',
    points: ['ตั้งหัวข้อที่สื่อความหมายและเลือกหมวดหมู่ให้ตรง', 'ตรวจข้อมูลส่วนตัวและเนื้อหาก่อนเผยแพร่'],
  },
  {
    icon: '💬',
    eyebrow: 'มีส่วนร่วม',
    title: 'พูดคุย ถูกใจ และเก็บไว้อ่าน',
    description: 'ร่วมตอบคำถาม กดถูกใจกระทู้ บันทึกเรื่องที่สนใจ และติดตามการตอบกลับจากศูนย์แจ้งเตือน',
    points: ['เจ้าของกระทู้เลือกคำตอบที่ช่วยแก้ปัญหาได้', 'กระทู้ที่บันทึกไว้กลับมาดูได้จากหน้าโปรไฟล์'],
  },
  {
    icon: '🛡️',
    eyebrow: 'ใช้งานอย่างมั่นใจ',
    title: 'จัดการโปรไฟล์และดูแลชุมชนร่วมกัน',
    description: 'ปรับโปรไฟล์ ดูอันดับสมาชิก รายงานเนื้อหาที่ไม่เหมาะสม และใช้ ITHub Bot เป็นจุดเริ่มต้นในการค้นคว้า',
    points: ['อย่าโพสต์รหัสผ่านหรือข้อมูลส่วนตัวที่ละเอียดอ่อน', 'ตรวจสอบคำตอบจาก AI กับแหล่งข้อมูลทางการเสมอ'],
  },
];

const OnboardingContext = createContext(null);
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function saveStatus(status) {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, status);
  } catch {
    // Storage may be blocked by browser privacy settings. The dialog still
    // works for the current page without making the application fail.
  }
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

export default function OnboardingProvider({ children }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const openTour = useCallback((triggerElement = null) => {
    previousFocusRef.current = triggerElement instanceof HTMLElement
      ? triggerElement
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const finishTour = useCallback((status) => {
    saveStatus(status);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    let shouldOpen = true;
    try {
      shouldOpen = !window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    } catch {
      shouldOpen = true;
    }

    if (!shouldOpen) return undefined;
    const frame = window.requestAnimationFrame(() => openTour());
    return () => window.cancelAnimationFrame(frame);
  }, [openTour]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleDialogClose = () => {
    setIsOpen(false);
    const previousFocus = previousFocusRef.current;
    if (previousFocus?.isConnected) {
      window.requestAnimationFrame(() => previousFocus.focus());
    }
  };

  const handleDialogKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = [...dialog.querySelectorAll(focusableSelector)]
      .filter((element) => element.getClientRects().length > 0);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const contextValue = useMemo(() => ({ openTour }), [openTour]);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      <dialog
        ref={dialogRef}
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        className="onboarding-dialog m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-0 text-gray-900 shadow-2xl dark:bg-neutral-950 dark:text-white"
        onCancel={(event) => {
          event.preventDefault();
          finishTour('dismissed');
        }}
        onClose={handleDialogClose}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-neutral-800">
          <header className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-950 px-6 py-6 text-white sm:px-8">
            <button
              type="button"
              aria-label="ปิดคำแนะนำ"
              onClick={() => finishTour('dismissed')}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-2xl leading-none transition hover:bg-black/35"
            >
              <span aria-hidden="true">×</span>
            </button>
            <p className="pr-12 text-sm font-bold uppercase tracking-[0.18em] text-red-100">ยินดีต้อนรับสู่ ITHub</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-100" aria-live="polite">ขั้นตอน {currentStep + 1} จาก {steps.length}</p>
                <h2 id="onboarding-title" className="mt-1 text-2xl font-black sm:text-3xl">เริ่มใช้งานได้ในไม่กี่นาที</h2>
              </div>
              <span className="hidden text-5xl sm:block" aria-hidden="true">{step.icon}</span>
            </div>
            <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="ความคืบหน้าคำแนะนำ">
              {steps.map((item, index) => (
                <li key={item.title}>
                  <span
                    aria-current={index === currentStep ? 'step' : undefined}
                    className={`block h-1.5 rounded-full ${index <= currentStep ? 'bg-white' : 'bg-white/30'}`}
                  >
                    <span className="sr-only">ขั้นตอน {index + 1}: {item.title}</span>
                  </span>
                </li>
              ))}
            </ol>
          </header>

          <section className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-3xl dark:bg-red-950/40" aria-hidden="true">{step.icon}</span>
              <div>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{step.eyebrow}</p>
                <h3 className="mt-1 text-xl font-black sm:text-2xl">{step.title}</h3>
              </div>
            </div>
            <p id="onboarding-description" className="mt-5 leading-7 text-gray-600 dark:text-gray-300">{step.description}</p>
            <ul className="mt-5 space-y-3">
              {step.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
                  <span className="mt-1 text-red-600" aria-hidden="true">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-neutral-800 dark:bg-neutral-900/60">
            <button
              type="button"
              onClick={() => finishTour('dismissed')}
              className="rounded-xl px-4 py-3 text-sm font-bold text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              ข้ามคำแนะนำ
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}
                className="flex-1 rounded-xl border border-gray-300 px-5 py-3 font-bold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    finishTour('completed');
                  } else {
                    setCurrentStep((value) => Math.min(steps.length - 1, value + 1));
                  }
                }}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 sm:flex-none"
              >
                {isLastStep ? 'เริ่มใช้งาน' : 'ถัดไป'}
              </button>
            </div>
          </footer>
        </div>
      </dialog>
    </OnboardingContext.Provider>
  );
}
