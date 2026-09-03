'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, RotateCcw, Sun, X } from 'lucide-react';
import { THEME_MODES, THEME_PALETTES } from '../lib/theme';
import { useTheme } from './ThemeProvider';

const modeIcons = { system: Monitor, light: Sun, dark: Moon };

function moveRadioFocus(event, options, currentValue, onChange) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = Math.max(0, options.findIndex((item) => item.id === currentValue));
  let nextIndex = currentIndex;
  if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = options.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % options.length;
  else nextIndex = (currentIndex - 1 + options.length) % options.length;
  onChange(options[nextIndex].id);
  event.currentTarget.querySelector(`[data-radio-value="${options[nextIndex].id}"]`)?.focus();
}

export default function ThemeToggle() {
  const { mode, resolvedMode, palette, setMode, setPalette, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId();
  const selectedPalette = THEME_PALETTES.find((item) => item.id === palette) || THEME_PALETTES[0];

  const closePicker = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector('[aria-checked="true"]')?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePicker();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled)')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      closePicker();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        data-testid="theme-toggle"
        aria-label={`ตั้งค่าธีม ขณะนี้ ${selectedPalette.label} โหมด${resolvedMode === 'dark' ? 'มืด' : 'สว่าง'}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'ithub-theme-picker' : undefined}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
        title="ตั้งค่าธีม"
      >
        <Palette aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[1px] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:bg-transparent sm:backdrop-blur-none" onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker(); }}>
          <section
            ref={panelRef}
            id="ithub-theme-picker"
            data-testid="theme-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ithub-elevated fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[min(78vh,42rem)] overflow-y-auto rounded-2xl border p-4 shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:w-[22rem] sm:max-h-[calc(100vh-6rem)]"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="font-bold text-[var(--app-text)]">ปรับบรรยากาศ ITHub</h2>
                <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">เลือกความสว่างและชุดสีที่อ่านสบายสำหรับคุณ</p>
              </div>
              <button type="button" onClick={() => closePicker()} aria-label="ปิดการตั้งค่าธีม" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </header>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">ความสว่าง</p>
              <div role="radiogroup" aria-label="เลือกความสว่าง" className="grid grid-cols-3 gap-2" onKeyDown={(event) => moveRadioFocus(event, THEME_MODES, mode, setMode)}>
                {THEME_MODES.map((item) => {
                  const Icon = modeIcons[item.id];
                  const selected = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      data-radio-value={item.id}
                      data-testid={`theme-mode-${item.id}`}
                      onClick={() => setMode(item.id)}
                      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${selected ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-accent-text)]' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]'}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">ชุดสี</p>
              <div role="radiogroup" aria-label="เลือกชุดสี" className="space-y-2" onKeyDown={(event) => moveRadioFocus(event, THEME_PALETTES, palette, setPalette)}>
                {THEME_PALETTES.map((item) => {
                  const selected = palette === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      data-radio-value={item.id}
                      data-testid={`theme-palette-${item.id}`}
                      onClick={() => setPalette(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${selected ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)]' : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-border-strong)]'}`}
                    >
                      <span className="flex h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10" aria-hidden="true">
                        <span className="w-1/3" style={{ backgroundColor: item.preview[0] }} />
                        <span className="w-1/3" style={{ backgroundColor: item.preview[1] }} />
                        <span className="w-1/3" style={{ backgroundColor: item.preview[2] }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[var(--app-text)]">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--app-text-muted)]">{item.description}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-[var(--app-primary)] text-[var(--app-primary-contrast)]' : 'border border-[var(--app-border)] text-transparent'}`}>
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">{selected ? 'เลือกอยู่' : 'ยังไม่ได้เลือก'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <footer className="mt-5 border-t border-[var(--app-border)] pt-3">
              <button type="button" onClick={resetTheme} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]">
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                คืนค่าเป็นตามระบบและ ITHub Classic
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
