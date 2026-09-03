export const THEME_MODE_STORAGE_KEY = 'theme';
export const THEME_PALETTE_STORAGE_KEY = 'ithub_palette_v1';
export const DEFAULT_THEME_MODE = 'system';
export const DEFAULT_THEME_PALETTE = 'classic';

export const THEME_MODES = [
  { id: 'system', label: 'ตามระบบ', description: 'ปรับตามอุปกรณ์อัตโนมัติ' },
  { id: 'light', label: 'สว่าง', description: 'ใช้พื้นผิวสว่างเสมอ' },
  { id: 'dark', label: 'มืด', description: 'ใช้พื้นผิวมืดเสมอ' },
];

export const THEME_PALETTES = [
  { id: 'classic', label: 'ITHub Classic', description: 'เทากลางและแดงแบบ ITHub', preview: ['#f2f4f7', '#ffffff', '#b91c1c'] },
  { id: 'ocean', label: 'Ocean', description: 'น้ำเงินเย็น สุขุมและอ่านง่าย', preview: ['#eff6ff', '#ffffff', '#0369a1'] },
  { id: 'forest', label: 'Forest', description: 'เขียวธรรมชาติ สงบและสบายตา', preview: ['#f0f5f1', '#fcfefc', '#166534'] },
  { id: 'violet', label: 'Violet', description: 'ม่วงเทคโนโลยีที่มีบุคลิก', preview: ['#f5f3ff', '#ffffff', '#6d28d9'] },
  { id: 'amber', label: 'Amber', description: 'โทนอุ่นคล้ายกระดาษ', preview: ['#f8f3e8', '#fffcf5', '#92400e'] },
];

const validModes = new Set(THEME_MODES.map((item) => item.id));
const validPalettes = new Set(THEME_PALETTES.map((item) => item.id));

export function normalizeThemeMode(value) {
  return validModes.has(value) ? value : DEFAULT_THEME_MODE;
}

export function normalizeThemePalette(value) {
  return validPalettes.has(value) ? value : DEFAULT_THEME_PALETTE;
}

export function resolveThemeMode(mode, prefersDark) {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}

export function applyThemeToDocument(mode, palette, prefersDark) {
  const normalizedMode = normalizeThemeMode(mode);
  const normalizedPalette = normalizeThemePalette(palette);
  const resolvedMode = resolveThemeMode(normalizedMode, prefersDark);
  const root = document.documentElement;

  root.dataset.mode = normalizedMode;
  root.dataset.palette = normalizedPalette;
  root.classList.toggle('dark', resolvedMode === 'dark');
  root.style.colorScheme = resolvedMode;
  return resolvedMode;
}

export const themeInitializationScript = `
(function () {
  try {
    var modes = ['system', 'light', 'dark'];
    var palettes = ['classic', 'ocean', 'forest', 'violet', 'amber'];
    var storedMode = window.localStorage.getItem('${THEME_MODE_STORAGE_KEY}');
    var storedPalette = window.localStorage.getItem('${THEME_PALETTE_STORAGE_KEY}');
    var mode = modes.indexOf(storedMode) >= 0 ? storedMode : '${DEFAULT_THEME_MODE}';
    var palette = palettes.indexOf(storedPalette) >= 0 ? storedPalette : '${DEFAULT_THEME_PALETTE}';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    var root = document.documentElement;
    root.dataset.mode = mode;
    root.dataset.palette = palette;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  } catch (error) {
    document.documentElement.dataset.mode = '${DEFAULT_THEME_MODE}';
    document.documentElement.dataset.palette = '${DEFAULT_THEME_PALETTE}';
  }
})();`;
