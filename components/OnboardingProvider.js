'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, Check, ChevronLeft, ChevronRight, Compass, Heart, MousePointer2, PenLine, Search, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export const ONBOARDING_STORAGE_KEY = 'ithub_onboarding_v2';

const TARGET_TIMEOUT_MS = 3500;
const SPOTLIGHT_MARGIN = 8;
const SPOTLIGHT_PADDING = 10;
const TOUR_SHADE_BACKDROP = 'blur(10px) saturate(0.6) brightness(0.72)';
const TOUR_SHADE_STYLE = {
  backgroundColor: 'rgba(3, 7, 18, 0.58)',
  backdropFilter: TOUR_SHADE_BACKDROP,
  WebkitBackdropFilter: TOUR_SHADE_BACKDROP,
};
const TOUR_SHADE_FALLBACK_STYLE = { backgroundColor: 'rgba(3, 7, 18, 0.82)' };
const SPOTLIGHT_GUARD_STYLE = {
  backgroundColor: 'transparent',
  boxShadow: [
    '0 0 0 3px rgba(255, 255, 255, 0.92)',
    '0 0 0 7px rgba(220, 38, 38, 0.76)',
    '0 0 34px 10px rgba(239, 68, 68, 0.42)',
  ].join(', '),
};

const steps = [
  {
    id: 'search', Icon: Search, eyebrow: 'ค้นพบคำตอบ', title: 'ค้นหากระทู้ที่ตรงกับคุณ',
    description: 'พิมพ์ชื่ออุปกรณ์ โปรแกรม หรือข้อความผิดพลาด ระบบจะค้นทั้งหัวข้อและเนื้อหากระทู้ให้ทันที',
    points: ['ค้นหาได้จากทุกหน้า', 'รองรับทั้งภาษาไทย ภาษาอังกฤษ และอักขระพิเศษ'],
    selectors: ['[data-tour="search"]'],
  },
  {
    id: 'explore', Icon: Compass, eyebrow: 'สำรวจชุมชน', title: 'เลือกดูกระทู้ที่น่าสนใจ',
    description: 'การ์ดแต่ละใบสรุปหมวดหมู่ ผู้เขียน และกิจกรรมจากชุมชน คุณสามารถเปิดอ่านรายละเอียดได้จากตรงนี้',
    points: ['เรียงตามล่าสุด ยอดนิยม หรือถูกใจมาก', 'กรองหมวด Hardware, Software, Network, AI & Data และ General'],
    selectors: ['[data-tour="topic-card"]', '[data-tour="topic-list"]'],
  },
  {
    id: 'create', Icon: PenLine, eyebrow: 'ถามและแบ่งปัน', title: 'เข้าสู่ระบบแล้วสร้างกระทู้',
    description: 'สมาชิกจะเห็นปุ่มสร้างกระทู้ ส่วนผู้เยี่ยมชมสามารถสมัครหรือเข้าสู่ระบบก่อนเริ่มแบ่งปันความรู้',
    points: ['แนบรูป ตัวอย่างโค้ด และสร้างโพลได้', 'ตรวจข้อมูลลับก่อนเผยแพร่เสมอ'],
    selectors: ['[data-tour="create-topic"]', '[data-tour="auth-action"]'],
  },
  {
    id: 'engage', Icon: Heart, eyebrow: 'มีส่วนร่วม', title: 'ถูกใจและบันทึกเก็บไว้',
    description: 'ใช้ปุ่มเหล่านี้เพื่อบอกว่ากระทู้มีประโยชน์หรือเก็บไว้อ่านภายหลัง ทัวร์นี้เป็นเพียงการสาธิตและจะไม่เปลี่ยนข้อมูลจริง',
    points: ['ต้องเข้าสู่ระบบก่อนใช้งาน', 'กระทู้ที่บันทึกจะอยู่ในหน้าโปรไฟล์'],
    selectors: ['[data-tour="engagement-actions"]'],
    fallbackSelectors: ['[data-tour="topic-card"]', '[data-tour="topic-list"]'],
  },
  {
    id: 'personal', Icon: UserRound, eyebrow: 'พื้นที่ของคุณ', title: 'โปรไฟล์และการแจ้งเตือน',
    description: 'กลับไปดูกระทู้ที่บันทึก แก้ไขโปรไฟล์ และติดตามการตอบกลับได้จากเมนูส่วนตัว ซึ่งจะปรับตำแหน่งตามขนาดหน้าจอ',
    points: ['เดสก์ท็อปใช้ Navbar หรือ Sidebar', 'มือถือใช้เมนูด้านล่าง'],
    selectors: ['[data-tour="personal-nav"]', '[data-tour="account-area"]'],
  },
  {
    id: 'ai-safety', Icon: Bot, eyebrow: 'ตัวช่วยและความปลอดภัย', title: 'ใช้ ITHub Bot อย่างเหมาะสม',
    description: 'ใช้บอทช่วยตั้งต้นการค้นคว้า และช่วยดูแลชุมชนด้วยการรายงานเนื้อหาที่ไม่เหมาะสม',
    points: ['อย่าส่งรหัสผ่าน คีย์ API หรือข้อมูลส่วนบุคคลให้ AI', 'ตรวจสอบคำตอบกับเอกสารทางการเสมอ'],
    selectors: ['[data-tour="ai-chat"]'],
  },
];

const OnboardingContext = createContext(null);
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function saveStatus(status) {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, status);
  } catch {
    // Privacy settings may block storage. The mounted tour still remains usable.
  }
}

function currentUrl() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function isVisibleTarget(element) {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 2 && rect.height > 2 && style.display !== 'none' && style.visibility !== 'hidden';
}

function findVisibleTarget(selectors) {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (isVisibleTarget(element)) return element;
    }
  }
  return null;
}

function waitForVisibleTarget(selectors, signal, timeout = TARGET_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let observer;
    let interval;
    let timeoutId;
    let settled = false;
    const finish = (element) => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timeoutId);
      signal.removeEventListener('abort', handleAbort);
      resolve(element);
    };
    const handleAbort = () => finish(null);
    const check = () => {
      const element = findVisibleTarget(selectors);
      if (element) finish(element);
    };
    if (signal.aborted) {
      finish(null);
      return;
    }
    signal.addEventListener('abort', handleAbort, { once: true });
    observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'hidden', 'style'], childList: true, subtree: true });
    interval = window.setInterval(check, 100);
    timeoutId = window.setTimeout(() => finish(null), timeout);
    window.requestAnimationFrame(check);
  });
}

async function waitForRoute(route, previousPage, signal) {
  const startedAt = window.performance.now();
  while (!signal.aborted && window.performance.now() - startedAt < TARGET_TIMEOUT_MS) {
    const currentPage = document.querySelector('#main-content > :first-child');
    if (currentUrl() === route && (!previousPage || currentPage !== previousPage)) return;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

function findTopicUrl() {
  const href = document.querySelector('[data-tour="topic-link"]')?.getAttribute('href') || '';
  return /^\/topic\/\d+$/.test(href) ? href : '';
}

function createSpotlightRect(element) {
  const rect = element.getBoundingClientRect();
  const left = Math.floor(Math.max(SPOTLIGHT_MARGIN, rect.left - SPOTLIGHT_PADDING));
  const top = Math.floor(Math.max(SPOTLIGHT_MARGIN, rect.top - SPOTLIGHT_PADDING));
  const right = Math.ceil(Math.min(window.innerWidth - SPOTLIGHT_MARGIN, rect.right + SPOTLIGHT_PADDING));
  const bottom = Math.ceil(Math.min(window.innerHeight - SPOTLIGHT_MARGIN, rect.bottom + SPOTLIGHT_PADDING));
  return { left, top, right, bottom, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

function supportsTourBackdropFilter() {
  if (typeof window === 'undefined' || !window.CSS?.supports) return false;
  return window.CSS.supports('backdrop-filter', 'blur(1px)') || window.CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
}

function getTooltipPosition(target, tooltip) {
  if (!tooltip.width || !tooltip.height) return null;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = viewportWidth < 640 ? 12 : 16;
  const gap = viewportWidth < 640 ? 14 : 18;
  const width = Math.min(tooltip.width, viewportWidth - margin * 2);
  const height = Math.min(tooltip.height, viewportHeight - margin * 2);
  const clampX = (value) => Math.min(Math.max(margin, value), viewportWidth - width - margin);
  const clampY = (value) => Math.min(Math.max(margin, value), viewportHeight - height - margin);
  if (!target) return { left: clampX((viewportWidth - width) / 2), top: clampY((viewportHeight - height) / 2), width };
  if (viewportWidth < 640) {
    const spaceAbove = target.top - gap - margin;
    const spaceBelow = viewportHeight - target.bottom - gap - margin;
    const placeAbove = spaceAbove >= height || spaceAbove > spaceBelow;
    return {
      left: margin,
      top: placeAbove ? Math.max(margin, target.top - height - gap) : Math.min(viewportHeight - height - margin, target.bottom + gap),
      width,
    };
  }
  if (viewportHeight - target.bottom >= height + gap) return { left: clampX(target.left + target.width / 2 - width / 2), top: target.bottom + gap, width };
  if (target.top >= height + gap) return { left: clampX(target.left + target.width / 2 - width / 2), top: target.top - height - gap, width };
  if (viewportWidth - target.right >= width + gap) return { left: target.right + gap, top: clampY(target.top + target.height / 2 - height / 2), width };
  return { left: Math.max(margin, target.left - width - gap), top: clampY(target.top + target.height / 2 - height / 2), width };
}

function OverlayPanels({ rect }) {
  const transition = { duration: 0.28, ease: 'easeOut' };
  const hasBackdropFilter = supportsTourBackdropFilter();
  const shadeStyle = hasBackdropFilter ? TOUR_SHADE_STYLE : TOUR_SHADE_FALLBACK_STYLE;
  const shadeMode = hasBackdropFilter ? 'blur' : 'fallback';
  if (!rect) return <div className="ithub-tour-shade pointer-events-auto fixed inset-0 z-[1]" data-tour-overlay="fallback" data-tour-shade-mode={shadeMode} style={shadeStyle} />;
  return (
    <>
      <motion.div className="ithub-tour-shade pointer-events-auto fixed left-0 right-0 top-0 z-[1]" data-tour-overlay="shade" data-tour-shade-mode={shadeMode} style={shadeStyle} animate={{ height: rect.top + 1 }} transition={transition} />
      <motion.div className="ithub-tour-shade pointer-events-auto fixed bottom-0 left-0 right-0 z-[1]" data-tour-overlay="shade" data-tour-shade-mode={shadeMode} style={shadeStyle} animate={{ top: rect.bottom - 1 }} transition={transition} />
      <motion.div className="ithub-tour-shade pointer-events-auto fixed left-0 z-[1]" data-tour-overlay="shade" data-tour-shade-mode={shadeMode} style={shadeStyle} animate={{ top: rect.top - 1, width: rect.left + 1, height: rect.height + 2 }} transition={transition} />
      <motion.div className="ithub-tour-shade pointer-events-auto fixed right-0 z-[1]" data-tour-overlay="shade" data-tour-shade-mode={shadeMode} style={shadeStyle} animate={{ top: rect.top - 1, left: rect.right - 1, height: rect.height + 2 }} transition={transition} />
    </>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}

export default function OnboardingProvider({ children }) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const appShellRef = useRef(null);
  const tooltipRef = useRef(null);
  const targetElementRef = useRef(null);
  const returnUrlRef = useRef('/');
  const returnScrollRef = useRef({ main: 0, x: 0, y: 0 });
  const triggerRef = useRef(null);
  const topicUrlRef = useRef('');
  const closingRef = useRef(false);
  const isMounted = useSyncExternalStore(subscribeToHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const openTour = useCallback((triggerElement = null) => {
    const mainContent = document.getElementById('main-content');
    returnUrlRef.current = currentUrl();
    returnScrollRef.current = { main: mainContent?.scrollTop || 0, x: window.scrollX, y: window.scrollY };
    triggerRef.current = triggerElement instanceof HTMLElement ? triggerElement : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    topicUrlRef.current = '';
    closingRef.current = false;
    setCurrentStep(0);
    setTargetRect(null);
    setIsFallback(false);
    setIsOpen(true);
  }, []);

  const restoreStartingContext = useCallback(async () => {
    const returnUrl = returnUrlRef.current || '/';
    if (currentUrl() !== returnUrl) router.replace(returnUrl, { scroll: false });
    const startedAt = window.performance.now();
    while (currentUrl() !== returnUrl && window.performance.now() - startedAt < TARGET_TIMEOUT_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = returnScrollRef.current.main;
    window.scrollTo(returnScrollRef.current.x, returnScrollRef.current.y);
    let focusTarget = triggerRef.current?.isConnected ? triggerRef.current : null;
    if (!focusTarget && triggerRef.current) focusTarget = document.querySelector('[data-onboarding-trigger="help-launcher"]');
    if (!focusTarget) focusTarget = mainContent;
    window.requestAnimationFrame(() => focusTarget?.focus());
  }, [router]);

  const finishTour = useCallback((status) => {
    if (closingRef.current) return;
    closingRef.current = true;
    saveStatus(status);
    setIsOpen(false);
    setTargetRect(null);
    targetElementRef.current = null;
    window.setTimeout(() => restoreStartingContext(), 0);
  }, [restoreStartingContext]);

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
    if (!isOpen) return undefined;
    const appShell = appShellRef.current;
    const mainContent = document.getElementById('main-content');
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainOverflow = mainContent?.style.overflow || '';
    if (appShell) appShell.inert = true;
    document.body.style.overflow = 'hidden';
    if (mainContent) mainContent.style.overflow = 'hidden';
    return () => {
      if (appShell) appShell.inert = false;
      document.body.style.overflow = previousBodyOverflow;
      if (mainContent) mainContent.style.overflow = previousMainOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    let resizeObserver;
    let measureFrame;
    let removeMeasureListeners = () => {};
    const locateStep = async () => {
      setIsLocating(true);
      setIsFallback(false);
      setTargetRect(null);
      targetElementRef.current = null;
      let desiredRoute = '/';
      if (currentStep >= 3) {
        if (!topicUrlRef.current) topicUrlRef.current = findTopicUrl();
        desiredRoute = topicUrlRef.current || '/';
      }
      if (currentUrl() !== desiredRoute) {
        const previousPage = document.querySelector('#main-content > :first-child');
        router.replace(desiredRoute, { scroll: false });
        await waitForRoute(desiredRoute, previousPage, controller.signal);
      }
      if (controller.signal.aborted) return;
      const step = steps[currentStep];
      let target = await waitForVisibleTarget(step.selectors, controller.signal);
      let fallback = false;
      if (!target && currentStep === 3 && topicUrlRef.current && !controller.signal.aborted) {
        topicUrlRef.current = '';
        router.replace('/', { scroll: false });
        target = await waitForVisibleTarget(step.fallbackSelectors || [], controller.signal);
        fallback = true;
      }
      if (controller.signal.aborted) return;
      if (!target) {
        setIsFallback(true);
        setIsLocating(false);
        return;
      }
      targetElementRef.current = target;
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' });
      if (!prefersReducedMotion) await new Promise((resolve) => window.setTimeout(resolve, 320));
      if (controller.signal.aborted) return;
      const commitMeasurement = () => {
        if (target.isConnected && isVisibleTarget(target)) setTargetRect(createSpotlightRect(target));
      };
      const measure = () => {
        window.cancelAnimationFrame(measureFrame);
        measureFrame = window.requestAnimationFrame(commitMeasurement);
      };
      commitMeasurement();
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(target);
      window.addEventListener('resize', measure);
      document.addEventListener('scroll', measure, { capture: true, passive: true });
      removeMeasureListeners = () => {
        window.cancelAnimationFrame(measureFrame);
        window.removeEventListener('resize', measure);
        document.removeEventListener('scroll', measure, true);
      };
      setIsFallback(fallback);
      setIsLocating(false);
    };
    locateStep();
    return () => {
      controller.abort();
      resizeObserver?.disconnect();
      removeMeasureListeners();
    };
  }, [currentStep, isOpen, prefersReducedMotion, router]);

  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return undefined;
    const tooltip = tooltipRef.current;
    const measure = () => {
      const rect = tooltip.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [currentStep, isFallback, isLocating, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = window.requestAnimationFrame(() => tooltipRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [currentStep, isOpen]);

  const goBack = useCallback(() => setCurrentStep((value) => Math.max(0, value - 1)), []);
  const goNext = useCallback(() => {
    if (currentStep === steps.length - 1) finishTour('completed');
    else setCurrentStep((value) => Math.min(steps.length - 1, value + 1));
  }, [currentStep, finishTour]);

  const handleTooltipKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishTour('dismissed');
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goBack();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
      return;
    }
    if (event.key !== 'Tab') return;
    const tooltip = tooltipRef.current;
    const focusableElements = [...(tooltip?.querySelectorAll(focusableSelector) || [])].filter((element) => element.getClientRects().length > 0);
    if (focusableElements.length === 0) {
      event.preventDefault();
      tooltip?.focus();
      return;
    }
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && (document.activeElement === firstElement || !tooltip.contains(document.activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (document.activeElement === lastElement || !tooltip.contains(document.activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const contextValue = useMemo(() => ({ openTour }), [openTour]);
  const step = steps[currentStep];
  const StepIcon = step.Icon;
  const tooltipPosition = isMounted ? getTooltipPosition(targetRect, tooltipSize) : null;
  const tooltipStyle = tooltipPosition ? { left: tooltipPosition.left, top: tooltipPosition.top, width: tooltipPosition.width } : { left: 12, top: 12 };
  const tour = isMounted ? createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div key="ithub-spotlight-tour" className="pointer-events-none fixed inset-0 z-[200]" data-tour-root="true" data-tour-step={step.id} data-tour-fallback={isFallback ? 'true' : 'false'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}>
          <OverlayPanels rect={targetRect} />
          {targetRect ? (
            <motion.div className="ithub-tour-spotlight-guard pointer-events-auto fixed z-[2] rounded-2xl border-2 border-red-500" aria-hidden="true" style={SPOTLIGHT_GUARD_STYLE} animate={{ left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height }} transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: 'easeOut' }} onPointerDown={(event) => event.preventDefault()} onClick={(event) => event.preventDefault()}>
              <motion.span className="absolute -right-3 -top-4 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg" animate={prefersReducedMotion ? undefined : { y: [0, -6, 0], rotate: [-6, 4, -6] }} transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}>
                <MousePointer2 aria-hidden="true" size={18} />
              </motion.span>
            </motion.div>
          ) : null}
          <motion.section ref={tooltipRef} role="dialog" aria-modal="true" aria-labelledby="ithub-tour-title" aria-describedby="ithub-tour-description" tabIndex={-1} className="pointer-events-auto fixed z-[3] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-sm overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl outline-none" style={tooltipStyle} onKeyDown={handleTooltipKeyDown} initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}>
            <header className="relative rounded-t-2xl border-b border-zinc-800 bg-zinc-950 px-4 py-4 text-white sm:px-5">
              <button type="button" aria-label="ปิดคำแนะนำ" onClick={() => finishTour('dismissed')} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"><X aria-hidden="true" size={18} /></button>
              <div className="flex items-start gap-3 pr-10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white"><StepIcon aria-hidden="true" size={20} /></span>
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">{step.eyebrow}</p><p className="mt-1 text-sm font-semibold text-zinc-300" aria-live="polite">ขั้นตอน {currentStep + 1} จาก {steps.length}</p></div>
              </div>
              <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="ความคืบหน้าคำแนะนำ">
                {steps.map((item, index) => <li key={item.id}><span className={`block h-1.5 rounded-full ${index <= currentStep ? 'bg-red-500' : 'bg-white/20'}`} aria-current={index === currentStep ? 'step' : undefined}><span className="sr-only">ขั้นตอน {index + 1}: {item.title}</span></span></li>)}
              </ol>
            </header>
            <div className="px-4 py-4 sm:px-5">
              {isLocating ? <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--app-surface-subtle)] px-3 py-2 text-sm text-[var(--app-text-muted)]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-red-600" aria-hidden="true" />กำลังพาไปยังจุดที่จะสอน...</div> : null}
              {isFallback ? <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="status">ตอนนี้ยังไม่พบส่วนนี้ คุณยังอ่านคำอธิบายและไปขั้นตอนถัดไปได้</div> : null}
              <h2 id="ithub-tour-title" className="text-xl font-bold">{step.title}</h2>
              <p id="ithub-tour-description" className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{step.description}</p>
              <ul className="mt-4 hidden space-y-2 sm:block">{step.points.map((point) => <li key={point} className="flex gap-2 text-sm leading-6"><Check className="mt-1 shrink-0 text-emerald-600" aria-hidden="true" size={15} /><span>{point}</span></li>)}</ul>
            </div>
            <footer className="flex items-center justify-between gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-3 py-3 sm:px-5">
              <button type="button" onClick={() => finishTour('dismissed')} className="rounded-lg px-2 py-2 text-xs font-semibold text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] sm:px-3 sm:text-sm">ข้าม</button>
              <div className="flex gap-1.5 sm:gap-2">
                <button type="button" disabled={currentStep === 0 || isLocating} onClick={goBack} className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft aria-hidden="true" size={16} /> ย้อนกลับ</button>
                <button type="button" disabled={isLocating} onClick={goNext} className="inline-flex items-center gap-1 rounded-lg bg-[var(--app-primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--app-primary-hover)] disabled:cursor-wait disabled:opacity-60 sm:px-4">{currentStep === steps.length - 1 ? 'เริ่มใช้งาน' : 'ถัดไป'}{currentStep < steps.length - 1 ? <ChevronRight aria-hidden="true" size={16} /> : null}</button>
              </div>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  ) : null;

  return <OnboardingContext.Provider value={contextValue}><div ref={appShellRef} className="contents" data-tour-app-shell="true">{children}</div>{tour}</OnboardingContext.Provider>;
}
