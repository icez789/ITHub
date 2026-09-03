'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_MODE,
  DEFAULT_THEME_PALETTE,
  THEME_MODE_STORAGE_KEY,
  THEME_PALETTE_STORAGE_KEY,
  applyThemeToDocument,
  normalizeThemeMode,
  normalizeThemePalette,
  resolveThemeMode,
} from '../lib/theme';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(DEFAULT_THEME_MODE);
  const [palette, setPaletteState] = useState(DEFAULT_THEME_PALETTE);
  const [resolvedMode, setResolvedMode] = useState('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedMode = normalizeThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
    const storedPalette = normalizeThemePalette(window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY));
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const frame = window.requestAnimationFrame(() => {
      setModeState(storedMode);
      setPaletteState(storedPalette);
      setResolvedMode(applyThemeToDocument(storedMode, storedPalette, prefersDark));
      setIsReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isReady || mode !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = (event) => {
      setResolvedMode(applyThemeToDocument(mode, palette, event.matches));
    };
    media.addEventListener('change', handleSystemTheme);
    return () => media.removeEventListener('change', handleSystemTheme);
  }, [isReady, mode, palette]);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.dataset.themeReady = 'true';
  }, [isReady]);

  const setMode = useCallback((nextMode) => {
    const normalizedMode = normalizeThemeMode(nextMode);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setModeState(normalizedMode);
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, normalizedMode);
    setResolvedMode(applyThemeToDocument(normalizedMode, palette, prefersDark));
  }, [palette]);

  const setPalette = useCallback((nextPalette) => {
    const normalizedPalette = normalizeThemePalette(nextPalette);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setPaletteState(normalizedPalette);
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, normalizedPalette);
    setResolvedMode(applyThemeToDocument(mode, normalizedPalette, prefersDark));
  }, [mode]);

  const resetTheme = useCallback(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setModeState(DEFAULT_THEME_MODE);
    setPaletteState(DEFAULT_THEME_PALETTE);
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, DEFAULT_THEME_MODE);
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, DEFAULT_THEME_PALETTE);
    setResolvedMode(applyThemeToDocument(DEFAULT_THEME_MODE, DEFAULT_THEME_PALETTE, prefersDark));
  }, []);

  const value = useMemo(() => ({
    mode,
    resolvedMode: isReady ? resolvedMode : resolveThemeMode(mode, false),
    palette,
    setMode,
    setPalette,
    resetTheme,
    isReady,
  }), [isReady, mode, palette, resetTheme, resolvedMode, setMode, setPalette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme ต้องถูกเรียกใช้ภายใต้ ThemeProvider เท่านั้นครับ!');
  }
  return context;
};
