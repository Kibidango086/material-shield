/**
 * Uint8Array → base64，跨运行时（Node / Cloudflare Workers / Vercel / Netlify）。
 * Node 走 Buffer；其余运行时用 chunked btoa 避免参数数量超限。
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...Array.from(slice));
  }
  return btoa(binary);
}
