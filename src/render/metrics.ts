import { resolveColors } from '../color';
import type { MaterialScheme } from '../color';
import { fitText, clamp } from '../measure';
import { escapeXml, sanitizeText } from '../escape';
import { fetchAvatar } from '../avatar';
import type { AvatarData } from '../avatar';

/**
 * GitHub Metrics 仪表盘渲染器。
 *
 * 视觉上对齐 mdui2 组件（SVG 无法直接使用 Web Components，这里逐一还原 mdui 的设计）：
 * - 头部        = mdui-avatar + mdui-list（标题/副标题）
 * - 区块        = mdui-card（outlined 变体：surface 底 + outline 描边 + 12dp 圆角）
 * - 统计        = mdui-list-item 网格
 * - 语言        = mdui-linear-progress
 * - 成就        = mdui-chip（secondary-container）
 * - 仓库/动态   = mdui-list-item（两行/一行）
 * - 排版        = Material 3 typescale（title-large 22 / title-small 14 / body-medium 14 / body-small 12 / label-*）
 * - 标题        = Title Case（Material You 不使用全大写）
 */

export interface MetricsStat {
  label: string;
  value: string;
}

export interface MetricsLanguage {
  name: string;
  percent: number;
  color?: string;
}

export interface MetricsRepo {
  name: string;
  description?: string;
  stars?: number;
  forks?: number;
}

export interface MetricsSpec {
  title: string;
  subtitle?: string;
  avatar?: string;
  stats?: MetricsStat[];
  languages?: MetricsLanguage[];
  achievements?: string[];
  repos?: MetricsRepo[];
  activity?: string[];
  /** 提交热力图：每天一个 0–4 的强度值，最旧在前。 */
  heatmap?: number[];
  heatmapTotal?: number;
  /** 热力图每天对应的日期（YYYY-MM-DD），用于渲染月份/星期标签。 */
  heatmapDates?: string[];
  /** 指定展示的模块及顺序（逗号分隔字符串或数组）。缺省时展示所有可用模块。 */
  sections?: string | string[];
}

export interface MetricsOptions extends MetricsSpec {
  color?: string;
  /** auto（默认，随浏览者深浅色切换）| true/dark | false/light。 */
  dark?: boolean | string;
  width?: number;
  transparent?: boolean;
}

const FONT =
  "Roboto, 'Segoe UI', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";

// Material 3 typescale（与 mdui 的 --mdui-typescale-* 对齐）
const TS = {
  titleLarge: 22,
  titleSmall: 14,
  bodyMedium: 14,
  bodySmall: 12,
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 11,
};

const P = 16; // 外边距（mdui 16dp）
const G = 8; // 区块间距
const CARD_RADIUS = 12; // mdui-card 默认圆角（--mdui-shape-corner-medium）
const CARD_PAD = 16; // 区块内边距
const TITLE_H = 34; // 区块标题区高度
const AVATAR = 48; // mdui-avatar 尺寸

type Ref = (role: keyof MaterialScheme) => string;

function text(
  x: number,
  y: number,
  content: string,
  color: string,
  size: number,
  weight = 400,
  anchor: 'start' | 'middle' | 'end' = 'start',
): string {
  return `<text x="${r(x)}" y="${r(y)}" fill="${color}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="central">${escapeXml(content)}</text>`;
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Section {
  title: string;
  full: boolean;
  height: number;
  render: (x: number, y: number, w: number) => string[];
}

type SectionKey = 'stats' | 'languages' | 'achievements' | 'heatmap' | 'repos' | 'activity';

const SECTION_ALIASES: Record<string, SectionKey> = {
  stats: 'stats',
  statistics: 'stats',
  languages: 'languages',
  language: 'languages',
  achievements: 'achievements',
  achievement: 'achievements',
  heatmap: 'heatmap',
  contributions: 'heatmap',
  contribution: 'heatmap',
  calendar: 'heatmap',
  repos: 'repos',
  repositories: 'repos',
  featured: 'repos',
  activity: 'activity',
  recent: 'activity',
};

const DEFAULT_SECTIONS: SectionKey[] = ['stats', 'languages', 'achievements', 'heatmap', 'repos', 'activity'];

/** 解析 sections 参数：逗号分隔字符串或数组 → 有序的模块键；无效/为空返回 null（用默认顺序）。 */
export function normalizeSections(input?: string | string[] | null): SectionKey[] | null {
  if (!input) return null;
  const parts = Array.isArray(input) ? input : input.split(/[,;|]/);
  const keys: SectionKey[] = [];
  for (const p of parts) {
    const k = SECTION_ALIASES[String(p).trim().toLowerCase()];
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys.length ? keys : null;
}

/** mdui-card（outlined）：surface 底 + outline 描边 + 12dp 圆角 + Title Case 标题。 */
function card(ref: Ref, x: number, y: number, w: number, h: number, title: string): string[] {
  const out: string[] = [];
  out.push(`<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${CARD_RADIUS}" fill="${ref('surface')}"/>`);
  out.push(
    `<rect x="${r(x + 0.5)}" y="${r(y + 0.5)}" width="${r(w - 1)}" height="${r(h - 1)}" rx="${CARD_RADIUS}" fill="none" stroke="${ref('outlineVariant')}" stroke-width="1"/>`,
  );
  out.push(text(x + CARD_PAD, y + 17, title, ref('onSurface'), TS.titleSmall, 500));
  return out;
}

// ---------------- 各区块 ----------------

function statsSection(stats: MetricsStat[], ref: Ref): Section {
  const rows = Math.ceil(stats.length / 2);
  const rowH = 42;
  const height = TITLE_H + rows * rowH + CARD_PAD - 4;
  return {
    title: 'Statistics',
    full: false,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Statistics');
      const cellW = (w - CARD_PAD * 2) / 2;
      const top = y + TITLE_H;
      stats.forEach((s, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = x + CARD_PAD + col * cellW;
        const cy = top + row * rowH;
        const displayValue = fitText(sanitizeText(s.value) || '0', TS.titleLarge, cellW - 4);
        const displayLabel = fitText(sanitizeText(s.label) || '', TS.bodySmall, cellW - 4);
        out.push(text(cx, cy + 12, displayValue, ref('onSurface'), TS.titleLarge, 400));
        out.push(text(cx, cy + 32, displayLabel, ref('onSurfaceVariant'), TS.bodySmall));
      });
      return out;
    },
  };
}

function languagesSection(langs: MetricsLanguage[], ref: Ref): Section {
  const rowH = 24;
  const height = TITLE_H + langs.length * rowH + CARD_PAD - 4;
  return {
    title: 'Languages',
    full: false,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Languages');
      const barW = w - CARD_PAD * 2;
      const top = y + TITLE_H;
      langs.forEach((l, i) => {
        const ry = top + i * rowH;
        const name = fitText(sanitizeText(l.name) || '?', TS.bodyMedium, barW - 48);
        const pct = clamp(Math.round(l.percent), 0, 100);
        out.push(text(x + CARD_PAD, ry + 6, name, ref('onSurface'), TS.bodyMedium));
        out.push(text(x + w - CARD_PAD, ry + 6, `${pct}%`, ref('onSurfaceVariant'), TS.labelSmall, 500, 'end'));
        out.push(`<rect x="${r(x + CARD_PAD)}" y="${r(ry + 14)}" width="${r(barW)}" height="6" rx="3" fill="${ref('surfaceVariant')}"/>`);
        if (pct > 0) {
          out.push(
            `<rect x="${r(x + CARD_PAD)}" y="${r(ry + 14)}" width="${r(Math.max(6, (barW * pct) / 100))}" height="6" rx="3" fill="${l.color || ref('primary')}"/>`,
          );
        }
      });
      return out;
    },
  };
}

function achievementsSection(items: string[], ref: Ref): Section {
  const chipH = 26;
  const chipGap = 8;
  const rows = Math.ceil(items.length / 2);
  const height = TITLE_H + rows * chipH + (rows - 1) * chipGap + CARD_PAD - 4;
  return {
    title: 'Achievements',
    full: false,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Achievements');
      const cellW = (w - CARD_PAD * 2 - chipGap) / 2;
      const top = y + TITLE_H;
      items.forEach((it, i) => {
        const label = sanitizeText(it) || '·';
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = x + CARD_PAD + col * (cellW + chipGap);
        const cy = top + row * (chipH + chipGap);
        const display = fitText(label, TS.labelMedium, cellW - 20);
        const chipW = Math.min(cellW, Math.max(24, display.length * 7 + 20));
        out.push(`<rect x="${r(cx)}" y="${r(cy)}" width="${r(chipW)}" height="${chipH}" rx="${chipH / 2}" fill="${ref('secondaryContainer')}"/>`);
        out.push(text(cx + 10, cy + chipH / 2, display, ref('onSecondaryContainer'), TS.labelMedium, 500));
      });
      return out;
    },
  };
}

function reposSection(repos: MetricsRepo[], ref: Ref): Section {
  const rowH = 40;
  const height = TITLE_H + repos.length * rowH + (repos.length - 1) * 6 + CARD_PAD - 4;
  return {
    title: 'Featured Repositories',
    full: true,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Featured Repositories');
      const contentW = w - CARD_PAD * 2;
      const top = y + TITLE_H;
      repos.forEach((repo, i) => {
        const ry = top + i * (rowH + 6);
        const name = fitText(sanitizeText(repo.name) || 'repo', TS.titleSmall, contentW - 100);
        const stars = repo.stars != null ? repo.stars : 0;
        const forks = repo.forks != null ? repo.forks : 0;
        const meta = `★ ${stars}  ·  ${forks} ⑂`;
        out.push(text(x + CARD_PAD, ry + 10, name, ref('primary'), TS.titleSmall, 500));
        out.push(text(x + w - CARD_PAD, ry + 10, meta, ref('onSurfaceVariant'), TS.labelSmall, 500, 'end'));
        const desc = repo.description ? fitText(sanitizeText(repo.description), TS.bodySmall, contentW) : '';
        if (desc) out.push(text(x + CARD_PAD, ry + 30, desc, ref('onSurfaceVariant'), TS.bodySmall));
      });
      return out;
    },
  };
}

function activitySection(items: string[], ref: Ref): Section {
  const rowH = 18;
  const height = TITLE_H + items.length * rowH + (items.length - 1) * 4 + CARD_PAD - 4;
  return {
    title: 'Recent Activity',
    full: true,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Recent Activity');
      const top = y + TITLE_H + 4;
      items.forEach((it, i) => {
        const line = fitText(sanitizeText(it) || '', TS.bodySmall, w - CARD_PAD * 2 - 16);
        const cy = top + i * (rowH + 4) + rowH / 2;
        out.push(`<circle cx="${r(x + CARD_PAD + 3)}" cy="${r(cy)}" r="3" fill="${ref('primary')}"/>`);
        out.push(text(x + CARD_PAD + 14, cy, line, ref('onSurface'), TS.bodySmall));
      });
      return out;
    },
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function heatmapSection(
  values: number[],
  total: number | undefined,
  dates: string[] | undefined,
  ref: Ref,
  fullW: number,
): Section {
  const DAY_LABEL_W = 22;
  const MONTH_LABEL_H = 14;
  const LEGEND_H = 18;

  const days = values;
  const cols = Math.max(1, Math.ceil(days.length / 7));
  const available = fullW - 2 * CARD_PAD - DAY_LABEL_W;

  // 自适应格子大小，保证完整当前年份（约 53 列）都能放下
  let cell = 10;
  let gap = 3;
  const fit = (g: number) => Math.floor((available - (cols - 1) * g) / cols);
  if (fit(3) >= 6) {
    gap = 3;
    cell = fit(3);
  } else if (fit(2) >= 5) {
    gap = 2;
    cell = fit(2);
  } else {
    gap = 1;
    cell = Math.max(4, fit(1));
  }
  cell = Math.min(cell, 11);

  const gridH = 7 * cell + 6 * gap;
  const height = TITLE_H + MONTH_LABEL_H + gridH + LEGEND_H + CARD_PAD - 4;

  const heatColor = (lvl: number): [string, number] => {
    if (lvl <= 0) return [ref('surfaceVariant'), 1];
    return [ref('primary'), [0.25, 0.5, 0.75, 1][lvl - 1]];
  };

  return {
    title: 'Contribution Activity',
    full: true,
    height,
    render: (x, y, w) => {
      const out = card(ref, x, y, w, height, 'Contribution Activity');
      if (total != null) {
        out.push(text(x + w - CARD_PAD, y + 17, `${total.toLocaleString('en-US')} contributions`, ref('onSurfaceVariant'), TS.labelSmall, 500, 'end'));
      }

      const gridLeft = x + CARD_PAD + DAY_LABEL_W;
      const gridTop = y + TITLE_H + MONTH_LABEL_H;

      // 星期标签（Mon / Wed / Fri）
      const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
      for (let row = 0; row < 7; row++) {
        if (dayLabels[row]) {
          out.push(text(gridLeft - 6, gridTop + row * (cell + gap) + cell / 2, dayLabels[row], ref('onSurfaceVariant'), 9, 400, 'end'));
        }
      }

      // 月份标签（每列首日所属月份变化处）
      if (dates && dates.length) {
        let prevMonth = '';
        for (let col = 0; col < cols; col++) {
          const date = dates[col * 7];
          if (!date) break;
          const month = date.slice(0, 7);
          if (month !== prevMonth) {
            const m = parseInt(date.slice(5, 7), 10) - 1;
            const label = m === 0 ? `${MONTHS[m]} ${date.slice(0, 4)}` : MONTHS[m];
            out.push(text(gridLeft + col * (cell + gap) + cell / 2, gridTop - 6, label, ref('onSurfaceVariant'), 9, 400, 'middle'));
            prevMonth = month;
          }
        }
      }

      // 格子
      days.forEach((v, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        const lvl = clamp(Math.round(v), 0, 4);
        const [fill, op] = heatColor(lvl);
        const cx = gridLeft + col * (cell + gap);
        const cy = gridTop + row * (cell + gap);
        out.push(`<rect x="${r(cx)}" y="${r(cy)}" width="${cell}" height="${cell}" rx="${cell > 6 ? 3 : 2}" fill="${fill}" fill-opacity="${op}"/>`);
      });

      // 图例
      const legendY = gridTop + gridH + 10;
      out.push(text(gridLeft - 6, legendY + cell / 2, 'Less', ref('onSurfaceVariant'), 9, 400, 'end'));
      [0, 1, 2, 3, 4].forEach((lvl, li) => {
        const [fill, op] = heatColor(lvl);
        out.push(`<rect x="${r(gridLeft + li * (cell + 2))}" y="${r(legendY)}" width="${cell}" height="${cell}" rx="${cell > 6 ? 3 : 2}" fill="${fill}" fill-opacity="${op}"/>`);
      });
      out.push(text(gridLeft + 5 * (cell + 2) + 6, legendY + cell / 2, 'More', ref('onSurfaceVariant'), 9));
      return out;
    },
  };
}

// ---------------- 主渲染 ----------------

function buildSection(key: SectionKey, opts: MetricsOptions, ref: Ref, fullW: number): Section | null {
  switch (key) {
    case 'stats':
      return opts.stats?.length ? statsSection(opts.stats, ref) : null;
    case 'languages':
      return opts.languages?.length ? languagesSection(opts.languages, ref) : null;
    case 'achievements':
      return opts.achievements?.length ? achievementsSection(opts.achievements, ref) : null;
    case 'heatmap':
      return opts.heatmap?.length ? heatmapSection(opts.heatmap, opts.heatmapTotal, opts.heatmapDates, ref, fullW) : null;
    case 'repos':
      return opts.repos?.length ? reposSection(opts.repos, ref) : null;
    case 'activity':
      return opts.activity?.length ? activitySection(opts.activity, ref) : null;
  }
}

export async function renderMetrics(opts: MetricsOptions): Promise<string> {
  const tc = resolveColors(opts.color, opts.dark);
  const ref = tc.ref;
  const width = clamp(Math.round(opts.width ?? 720), 480, 900);

  const title = sanitizeText(opts.title) || 'Profile';
  const subtitle = opts.subtitle ? sanitizeText(opts.subtitle) : '';

  let avatarData: AvatarData | null = null;
  if (opts.avatar) {
    avatarData = await fetchAvatar(opts.avatar);
  }

  const colW = (width - 2 * P - G) / 2;
  const fullW = width - 2 * P;

  const sections: Section[] = [];
  for (const key of normalizeSections(opts.sections) ?? DEFAULT_SECTIONS) {
    const s = buildSection(key, opts, ref, fullW);
    if (s) sections.push(s);
  }

  // 头部（mdui-avatar + 标题/副标题）
  const headerH = AVATAR + 12;
  const titleX = P + AVATAR + 16;
  const titleY = P + 12;
  const subtitleY = P + 34;
  const titleMaxW = width - titleX - P;
  const displayTitle = fitText(title, TS.titleLarge, titleMaxW);
  const displaySubtitle = subtitle ? fitText(subtitle, TS.bodyMedium, titleMaxW) : '';

  // 两列网格布局
  const colX = [P, P + colW + G];
  const colY = [P + headerH, P + headerH];
  const placed: { section: Section; x: number; y: number; w: number }[] = [];

  for (const section of sections) {
    if (section.full) {
      const y = Math.max(colY[0], colY[1]);
      placed.push({ section, x: P, y, w: fullW });
      colY[0] = y + section.height + G;
      colY[1] = y + section.height + G;
    } else {
      const c = colY[0] <= colY[1] ? 0 : 1;
      placed.push({ section, x: colX[c], y: colY[c], w: colW });
      colY[c] += section.height + G;
    }
  }

  const contentBottom = Math.max(colY[0], colY[1]) - G;
  const footerY = contentBottom + 22;
  const height = Math.max(120, Math.ceil(footerY + 10));

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
  );
  parts.push(`<title>${escapeXml(title)}</title>`);
  if (tc.css) parts.push(tc.css);

  if (!opts.transparent) {
    parts.push(`<rect width="${width}" height="${height}" rx="${CARD_RADIUS}" fill="${ref('surface')}"/>`);
  }
  parts.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${CARD_RADIUS}" fill="none" stroke="${ref('outlineVariant')}" stroke-width="1"/>`,
  );

  // 头像（mdui-avatar）
  const acx = P + AVATAR / 2;
  const acy = P + AVATAR / 2;
  const ar = AVATAR / 2;
  if (avatarData) {
    parts.push(`<defs><clipPath id="msavm"><circle cx="${acx}" cy="${acy}" r="${ar}"/></clipPath></defs>`);
    parts.push(
      `<image x="${P}" y="${P}" width="${AVATAR}" height="${AVATAR}" preserveAspectRatio="xMidYMid slice" clip-path="url(#msavm)" href="data:${avatarData.mime};base64,${avatarData.b64}"/>`,
    );
  } else {
    const letter = ([...title][0] ?? '?').toUpperCase();
    parts.push(`<circle cx="${acx}" cy="${acy}" r="${ar}" fill="${ref('primaryContainer')}"/>`);
    parts.push(text(acx, acy, letter, ref('onPrimaryContainer'), 20, 500, 'middle'));
  }

  // 标题 / 副标题
  parts.push(text(titleX, titleY, displayTitle, ref('onSurface'), TS.titleLarge, 500));
  if (displaySubtitle) parts.push(text(titleX, subtitleY, displaySubtitle, ref('onSurfaceVariant'), TS.bodyMedium));

  // 区块
  for (const p of placed) {
    parts.push(...p.section.render(p.x, p.y, p.w));
  }

  // 页脚
  parts.push(text(width / 2, footerY, 'Generated with Material Shield', ref('onSurfaceVariant'), TS.labelSmall, 400, 'middle'));

  parts.push('</svg>');
  return parts.join('');
}
