/** XML 转义，防止用户输入破坏 SVG 结构（避免注入）。 */
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 清理控制字符 / 零宽字符 / 换行，压缩连续空白。 */
export function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
