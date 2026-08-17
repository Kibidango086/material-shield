import { cached } from './cache';

/** 动态徽章结果：由数据源给出 label / message，可选的 status 色。 */
export interface DynamicBadge {
  label: string;
  message: string;
  /** 状态色（十六进制或 shields 颜色名），用于通用 endpoint 场景。 */
  color?: string;
}

const TTL_GITHUB = 5 * 60 * 1000; // 5 分钟
const TTL_NPM = 60 * 60 * 1000; // 1 小时

async function fetchJson<T>(url: string, token?: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'material-shield/0.1',
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- GitHub ----------------

export interface GitHubRepoData {
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  license?: { spdx_id?: string } | null;
  pushed_at?: string;
}

export function githubRepo(owner: string, repo: string, token?: string): Promise<GitHubRepoData | null> {
  return cached(`gh:repo:${owner}/${repo}`, TTL_GITHUB, () =>
    fetchJson<GitHubRepoData>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token),
  );
}

export interface GitHubReleaseData {
  tag_name?: string;
}

export function githubRelease(owner: string, repo: string, token?: string): Promise<GitHubReleaseData | null> {
  return cached(`gh:release:${owner}/${repo}`, TTL_GITHUB, () =>
    fetchJson<GitHubReleaseData>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`, token),
  );
}

export interface GitHubUserData {
  followers?: number;
  public_repos?: number;
}

export function githubUser(user: string, token?: string): Promise<GitHubUserData | null> {
  return cached(`gh:user:${user}`, TTL_GITHUB, () =>
    fetchJson<GitHubUserData>(`https://api.github.com/users/${encodeURIComponent(user)}`, token),
  );
}

// ---------------- npm ----------------

export function npmPackage(pkg: string): Promise<Record<string, any> | null> {
  return cached(`npm:pkg:${pkg}`, TTL_NPM, () =>
    fetchJson<Record<string, any>>(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`),
  );
}

export function npmDownloads(pkg: string, period: string): Promise<{ downloads?: number } | null> {
  return cached(`npm:dl:${period}:${pkg}`, TTL_NPM, () =>
    fetchJson<{ downloads?: number }>(`https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`),
  );
}

// ---------------- 通用 endpoint（兼容 shields 的 dynamic endpoint） ----------------

const SHIELDS_COLORS: Record<string, string> = {
  brightgreen: '#34d058',
  green: '#2ebc4f',
  yellowgreen: '#a2cc00',
  yellow: '#dfb317',
  orange: '#ed7f2b',
  red: '#e05d44',
  blue: '#3b82f6',
  lightgrey: '#9f9f9f',
  blueviolet: '#8a2be2',
  purple: '#6750a4',
  pink: '#ff69b4',
  success: '#2ebc4f',
  important: '#e05d44',
  critical: '#e05d44',
  informational: '#3b82f6',
  inactive: '#9f9f9f',
};

export function shieldsColor(name: string): string | undefined {
  if (/^#[0-9a-fA-F]{3,8}$/.test(name)) return name;
  return SHIELDS_COLORS[name.toLowerCase()];
}

function firstDefined(obj: Record<string, any>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/** 从任意 JSON endpoint 读取 label/message/color。 */
export async function fetchDynamicEndpoint(url: string): Promise<DynamicBadge | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const data = await fetchJson<Record<string, any>>(url);
  if (!data) return null;

  const label = typeof data.label === 'string' ? data.label : 'custom';
  const raw = firstDefined(data, ['message', 'value', 'count', 'stars', 'downloads', 'total', 'number']) ?? 0;
  const message = typeof raw === 'number' ? formatNumber(raw) : String(raw);
  const colorName = typeof data.color === 'string' ? data.color : undefined;
  const color = colorName ? shieldsColor(colorName) : undefined;

  return { label, message, color };
}

// ---------------- 工具 ----------------

function trimZero(s: string): string {
  return s.replace(/\.0$/, '');
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trimZero((n / 1_000_000).toFixed(1)) + 'M';
  if (abs >= 1_000) return trimZero((n / 1_000).toFixed(1)) + 'k';
  return String(n);
}

export function formatRelativeDate(iso?: string): string {
  if (!iso) return 'unknown';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'unknown';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (days < 365) return `${months} months ago`;
  const years = Math.floor(days / 365);
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}
