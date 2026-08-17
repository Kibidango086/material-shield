/**
 * 进程内 TTL 缓存。边缘函数是无状态的，这里的缓存只在单个实例内生效，
 * 但能显著减少同一实例并发请求时对上游 API 的重复调用；配合响应头里的
 * `s-maxage`（CDN/camo 缓存）一起降低限流压力。
 */
const store = new Map<string, { value: unknown; expires: number }>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const value = await fn();
  if (value !== null && value !== undefined) {
    store.set(key, { value, expires: Date.now() + ttlMs });
  }
  return value;
}

export function clearCache(): void {
  store.clear();
}
