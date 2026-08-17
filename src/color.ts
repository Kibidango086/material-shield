import {
  themeFromSourceColor,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';
import type { Scheme } from '@material/material-color-utilities';

/**
 * Material You 调色板（浅色/深色两套角色色）。
 * 与 mdui `setColorScheme()` 生成的 `--mdui-color-*` 令牌一一对应，
 * 因为二者底层都是 @material/material-color-utilities。
 */
export interface MaterialScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

/** Material 3 基线主色（紫），作为缺省主题色。 */
export const DEFAULT_SEED = '#6750A4';

/** 把 #rgb / #rrggbb / #rrggbbaa（可带 # 可不带）规范化为 #rrggbb，非法返回 null。 */
export function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) return '#' + h.toLowerCase();
  if (/^[0-9a-fA-F]{8}$/.test(h)) return '#' + h.slice(0, 6).toLowerCase();
  return null;
}

function schemeToHex(s: Scheme): MaterialScheme {
  const h = (c: number) => hexFromArgb(c);
  return {
    primary: h(s.primary),
    onPrimary: h(s.onPrimary),
    primaryContainer: h(s.primaryContainer),
    onPrimaryContainer: h(s.onPrimaryContainer),
    secondary: h(s.secondary),
    onSecondary: h(s.onSecondary),
    secondaryContainer: h(s.secondaryContainer),
    onSecondaryContainer: h(s.onSecondaryContainer),
    tertiary: h(s.tertiary),
    onTertiary: h(s.onTertiary),
    tertiaryContainer: h(s.tertiaryContainer),
    onTertiaryContainer: h(s.onTertiaryContainer),
    error: h(s.error),
    onError: h(s.onError),
    errorContainer: h(s.errorContainer),
    onErrorContainer: h(s.onErrorContainer),
    background: h(s.background),
    onBackground: h(s.onBackground),
    surface: h(s.surface),
    onSurface: h(s.onSurface),
    surfaceVariant: h(s.surfaceVariant),
    onSurfaceVariant: h(s.onSurfaceVariant),
    outline: h(s.outline),
    outlineVariant: h(s.outlineVariant),
    inverseSurface: h(s.inverseSurface),
    inverseOnSurface: h(s.inverseOnSurface),
    inversePrimary: h(s.inversePrimary),
  };
}

export interface ResolvedTheme {
  seed: string;
  scheme: MaterialScheme;
}

/** 由种子色生成一套 Material You 调色板。非法色值回退到默认色。 */
export function themeFromSeed(seed?: string | null, dark = false): ResolvedTheme {
  let hex = normalizeHex(seed);
  if (!hex) hex = DEFAULT_SEED;

  let argb: number;
  try {
    argb = argbFromHex(hex);
  } catch {
    hex = DEFAULT_SEED;
    argb = argbFromHex(DEFAULT_SEED);
  }

  const theme = themeFromSourceColor(argb);
  const scheme = dark ? theme.schemes.dark : theme.schemes.light;
  return { seed: hex, scheme: schemeToHex(scheme) };
}

/**
 * 计算某个颜色的 Material "on" 色（用于自定义 labelColor / messageColor 时
 * 自动推导出对比度正确的文字颜色）。
 */
export function onColorFor(hex: string): string {
  try {
    const argb = argbFromHex(normalizeHex(hex) ?? '#000000');
    return hexFromArgb(themeFromSourceColor(argb).schemes.light.onPrimary);
  } catch {
    return '#ffffff';
  }
}

// ---------------- 深浅色自动切换（auto / light / dark） ----------------

export type ColorMode = 'light' | 'dark' | 'auto';

const ROLE_KEYS: (keyof MaterialScheme)[] = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
];

function cssVar(role: keyof MaterialScheme): string {
  return '--ms-' + role.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

export function parseColorMode(input: string | boolean | null | undefined): ColorMode {
  if (input === true || input === 'true' || input === '1' || input === 'dark') return 'dark';
  if (input === false || input === 'false' || input === '0' || input === 'light') return 'light';
  return 'auto';
}

export interface ThemeColors {
  mode: ColorMode;
  light: MaterialScheme;
  dark: MaterialScheme;
  /** auto 模式下的 <style> 块（light/dark 模式为空字符串）。 */
  css: string;
  /** 取色：auto 模式返回 var(--ms-*)，否则返回字面量十六进制。 */
  ref: (role: keyof MaterialScheme) => string;
}

/**
 * 根据种子色与深浅色模式解析出配色。
 * - `light` / `dark`：直接烘焙字面量颜色（兼容不支持 CSS 变量的栅格化场景）
 * - `auto`（默认）：通过 CSS 自定义属性 + `prefers-color-scheme` 让 SVG 跟随浏览者主题切换
 */
export function resolveColors(seed?: string | null, modeInput?: string | boolean | null): ThemeColors {
  const { scheme: light } = themeFromSeed(seed, false);
  const { scheme: dark } = themeFromSeed(seed, true);
  const mode = parseColorMode(modeInput);

  const ref = (role: keyof MaterialScheme): string => {
    if (mode === 'auto') return `var(${cssVar(role)})`;
    return (mode === 'dark' ? dark : light)[role];
  };

  let css = '';
  if (mode === 'auto') {
    const l = ROLE_KEYS.map((r) => `${cssVar(r)}:${light[r]}`).join(';');
    const d = ROLE_KEYS.map((r) => `${cssVar(r)}:${dark[r]}`).join(';');
    css = `<style>:root{${l}}@media (prefers-color-scheme:dark){:root{${d}}}</style>`;
  }

  return { mode, light, dark, css, ref };
}
