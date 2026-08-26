'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, MessageCircle, PenLine, Search, ShieldCheck, X } from 'lucide-react';

export const ONBOARDING_STORAGE_KEY = 'ithub_onboarding_v1';

const steps = [
  { Icon: Search, eyebrow: 'ค้นพบความรู้', title: 'ค้นหากระทู้ที่ตรงกับคุณ', description: 'เริ่มจากช่องค้นหา เมนูมาแรง หรือเลือกหมวดหมู่เพื่อเจอคำถามและบทความที่สนใจได้เร็วขึ้น', points: ['ค้นหาจากชื่อหรือเนื้อหากระทู้', 'เลือกดู Hardware, Software, Network, AI & Data และ General'] },
  { Icon: PenLine, eyebrow: 'แบ่งปันและสอบถาม', title: 'สร้างกระทู้ให้ชุมชนช่วยกันตอบ', description: 'เข้าสู่ระบบแล้วกด “สร้างกระทู้” ระบุหัวข้อ หมวดหมู่ และรายละเอียดให้ชัดเจน พร้อมแนบภาพหรือสร้างโพลได้', points: ['ตั้งหัวข้อที่สื่อความหมายและเลือกหมวดหมู่ให้ตรง', 'ตรวจข้อมูลส่วนตัวและเนื้อหาก่อนเผยแพร่'] },
  { Icon: MessageCircle, eyebrow: 'มีส่วนร่วม', title: 'พูดคุย ถูกใจ และเก็บไว้อ่าน', description: 'ร่วมตอบคำถาม กดถูกใจกระทู้ บันทึกเรื่องที่สนใจ และติดตามการตอบกลับจากศูนย์แจ้งเตือน', points: ['เจ้าของกระทู้เลือกคำตอบที่ช่วยแก้ปัญหาได้', 'กระทู้ที่บันทึกไว้กลับมาดูได้จากหน้าโปรไฟล์'] },
  { Icon: ShieldCheck, eyebrow: 'ใช้งานอย่างมั่นใจ', title: 'จัดการโปรไฟล์และดูแลชุมชนร่วมกัน', description: 'ปรับโปรไฟล์ ดูอันดับสมาชิก รายงานเนื้อหาที่ไม่เหมาะสม และใช้ ITHub Bot เป็นจุดเริ่มต้นในการค้นคว้า', points: ['อย่าโพสต์รหัสผ่านหรือข้อมูลส่วนตัวที่ละเอียดอ่อน', 'ตรวจสอบคำตอบจาก AI กับแหล่งข้อมูลทางการเสมอ'] },
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
    // The prompt remains usable when storage is blocked.
  }
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}

export default function OnboardingProvider({ children }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const openTour = useCallback((triggerElement = null) => {
    previousFocusRef.current = triggerElement instanceof HTMLElement ? triggerElement : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowWelcome(false);
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const finishTour = useCallback((status) => {
    saveStatus(status);
    setShowWelcome(false);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    let shouldShow = true;
    try {
      shouldShow = !window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    } catch {
      shouldShow = true;
    }
    if (!shouldShow) return undefined;
    const frame = window.requestAnimationFrame(() => setShowWelcome(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const handleDialogClose = () => {
    setIsOpen(false);
    if (previousFocusRef.current?.isConnected) window.requestAnimationFrame(() => previousFocusRef.current.focus());
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
    if (event.shiftKey && (document.activeElement === firstElement || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (document.activeElement === lastElement || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const contextValue = useMemo(() => ({ openTour }), [openTour]);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const StepIcon = step.Icon;

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      {showWelcome && (
        <aside aria-labelledby="welcome-title" className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 right-20 z-30 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-lg md:bottom-6 md:left-6 md:right-auto md:w-[360px]">
          <button type="button" aria-label="ปิดข้อความต้อนรับ" onClick={() => finishTour('dismissed')} className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"><X aria-hidden="true" size={17} /></button>
          <div className="flex gap-3 pr-7">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><BookOpen aria-hidden="true" size={20} /></span>
            <div>
              <h2 id="welcome-title" className="font-bold text-[var(--app-text)]">ยินดีต้อนรับสู่ ITHub</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">เริ่มสำรวจกระทู้ได้ทันที หรือเปิดคู่มือสั้นๆ เมื่อต้องการ</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => finishTour('completed')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)]">เริ่มสำรวจ</button>
            <button type="button" onClick={(event) => openTour(event.currentTarget)} className="rounded-lg bg-[var(--app-primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--app-primary-hover)]">เปิดคู่มือ</button>
          </div>
        </aside>
      )}

      <dialog ref={dialogRef} aria-labelledby="onboarding-title" aria-describedby="onboarding-description" className="onboarding-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-[var(--app-surface)] p-0 text-[var(--app-text)] shadow-2xl" onCancel={(event) => { event.preventDefault(); finishTour('dismissed'); }} onClose={handleDialogClose} onKeyDown={handleDialogKeyDown}>
        <div className="overflow-hidden rounded-2xl border border-[var(--app-border)]">
          <header className="relative border-b border-[var(--app-border)] bg-zinc-950 px-6 py-6 text-white">
            <button type="button" aria-label="ปิดคำแนะนำ" onClick={() => finishTour('dismissed')} className="absolute right-4 top-4 rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"><X aria-hidden="true" size={19} /></button>
            <p className="text-sm font-semibold text-red-300">คู่มือ ITHub</p>
            <h2 id="onboarding-title" className="mt-1 pr-10 text-2xl font-bold">เริ่มใช้งานได้ในไม่กี่นาที</h2>
            <p className="mt-3 text-sm text-zinc-300" aria-live="polite">ขั้นตอน {currentStep + 1} จาก {steps.length}</p>
            <ol className="mt-3 grid grid-cols-4 gap-2" aria-label="ความคืบหน้าคำแนะนำ">
              {steps.map((item, index) => <li key={item.title}><span aria-current={index === currentStep ? 'step' : undefined} className={`block h-1 rounded-full ${index <= currentStep ? 'bg-red-500' : 'bg-white/20'}`}><span className="sr-only">ขั้นตอน {index + 1}: {item.title}</span></span></li>)}
            </ol>
          </header>

          <section className="px-6 py-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><StepIcon aria-hidden="true" size={23} /></span>
              <div><p className="text-sm font-semibold text-[var(--app-primary)]">{step.eyebrow}</p><h3 className="mt-1 text-xl font-bold">{step.title}</h3></div>
            </div>
            <p id="onboarding-description" className="mt-5 leading-7 text-[var(--app-text-muted)]">{step.description}</p>
            <ul className="mt-5 space-y-3">{step.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-6"><Check aria-hidden="true" className="mt-1 shrink-0 text-emerald-600" size={15} /><span>{point}</span></li>)}</ul>
          </section>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-6 py-4">
            <button type="button" onClick={() => finishTour('dismissed')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]">ข้าม</button>
            <div className="flex gap-2">
              <button type="button" disabled={currentStep === 0} onClick={() => setCurrentStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft aria-hidden="true" size={16} /> ย้อนกลับ</button>
              <button type="button" onClick={() => isLastStep ? finishTour('completed') : setCurrentStep((value) => Math.min(steps.length - 1, value + 1))} className="inline-flex items-center gap-1 rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--app-primary-hover)]">{isLastStep ? 'เริ่มใช้งาน' : 'ถัดไป'} {!isLastStep && <ArrowRight aria-hidden="true" size={16} />}</button>
            </div>
          </footer>
        </div>
      </dialog>
    </OnboardingContext.Provider>
  );
}
