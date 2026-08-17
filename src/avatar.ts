import { bytesToBase64 } from './base64';

export interface AvatarData {
  mime: string;
  b64: string;
}

/**
 * 抓取头像图片并转为 base64（data URI 用）。
 * 4 秒超时、2MB 上限，失败返回 null，由调用方回退到「首字母」圆形头像。
 */
export async function fetchAvatar(url: string): Promise<AvatarData | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'material-shield/0.1' },
    });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('image/')) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 2 * 1024 * 1024) return null;
    return { mime: type, b64: bytesToBase64(buf) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
