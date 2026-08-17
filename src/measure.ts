/**
 * 文本宽度估算。SVG 无法在服务端精确测量字形宽度（除非内嵌字体），
 * 这里用字符分类做近似，足以用于徽章/卡片这类短文本的布局。
 */

function isCjk(c: number): boolean {
  return (
    (c >= 0x2e80 && c <= 0x9fff) || // CJK 统一表意文字
    (c >= 0x3040 && c <= 0x30ff) || // 日文假名
    (c >= 0xac00 && c <= 0xd7af) || // 韩文
    (c >= 0xf900 && c <= 0xfaff) || // CJK 兼容
    (c >= 0xff00 && c <= 0xffef) // 全角形式
  );
}

function isEmoji(c: number): boolean {
  return (
    (c >= 0x1f300 && c <= 0x1faff) ||
    (c >= 0x1f000 && c <= 0x1f2ff) ||
    (c >= 0x2600 && c <= 0x27bf)
  );
}

const NARROW = "iIl1.,:;'`|!()[]{}<>/\\\"'";
const WIDE = 'mwMW@%&#QO';

function charWidth(c: number, size: number): number {
  if (isEmoji(c)) return size * 1.15;
  if (isCjk(c)) return size;
  if (c === 0x20) return size * 0.33; // 空格
  const ch = String.fromCodePoint(c);
  if (NARROW.includes(ch)) return size * 0.34;
  if (WIDE.includes(ch)) return size * 0.85;
  if (c >= 0x30 && c <= 0x39) return size * 0.6; // 数字
  if (c >= 0x41 && c <= 0x5a) return size * 0.68; // 大写
  if (c >= 0x61 && c <= 0x7a) return size * 0.58; // 小写
  return size * 0.6;
}

export function measureText(text: string, size: number, tracking = 0): number {
  const chars = [...text];
  let w = 0;
  for (const ch of chars) {
    w += charWidth(ch.codePointAt(0) ?? 32, size);
  }
  if (chars.length > 1) w += tracking * (chars.length - 1);
  return w;
}

/** 按宽度截断并追加省略号。 */
export function fitText(text: string, size: number, maxWidth: number, tracking = 0): string {
  if (measureText(text, size, tracking) <= maxWidth) return text;
  const chars = [...text];
  let acc = '';
  for (const ch of chars) {
    if (measureText(acc + ch + '…', size, tracking) > maxWidth) break;
    acc += ch;
  }
  return acc + '…';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
