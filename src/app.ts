import { Hono } from 'hono';
import type { Context } from 'hono';
import { renderBadge } from './render/badge';
import type { BadgeStyle } from './render/badge';
import { renderMetrics } from './render/metrics';
import type { MetricsSpec } from './render/metrics';
import { fetchGitHubMetrics, fetchContributions } from './github';
import {
  githubRepo,
  githubRelease,
  githubUser,
  npmPackage,
  npmDownloads,
  fetchDynamicEndpoint,
  formatNumber,
  formatRelativeDate,
} from './connectors';
import type { DynamicBadge } from './connectors';
import { renderLanding } from './landing';

export const app = new Hono();

const SVG_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
};

// 动态徽章：数据会变，缓存时间短一些
const DYNAMIC_SVG_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=1800',
  'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
};

const BADGE_STYLES: BadgeStyle[] = [
  'flat',
  'flat-square',
  'tonal',
  'filled',
  'outline',
  'for-the-badge',
];

function bool(v: string | undefined): boolean {
  return v === 'true' || v === '1' || v === 'yes';
}

function parseStyle(v: string | undefined): BadgeStyle {
  return (BADGE_STYLES as string[]).includes(v ?? '') ? (v as BadgeStyle) : 'flat';
}

/** dark 参数：auto（默认）| true/dark | false/light。传给 resolveColors 解析。 */
function darkParam(c: Context): string | undefined {
  return c.req.query('dark') ?? c.req.query('scheme') ?? undefined;
}

function githubToken(c: Context): string | undefined {
  const env = c.env as Record<string, unknown> | undefined;
  if (env && typeof env.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  if (typeof process !== 'undefined' && process.env?.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  return undefined;
}

function parseMetricsConfig(raw: string | undefined): MetricsSpec | null {
  if (!raw) return null;
  for (const candidate of [raw, decodeURIComponent(raw)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed as MetricsSpec;
    } catch {
      // 继续尝试下一种解析
    }
  }
  return null;
}

/** 由动态数据源渲染徽章，用户可用 query 覆盖 label / style / color / logo / dark。 */
function dynamicBadge(c: Context, result: DynamicBadge): Response {
  return c.body(
    renderBadge({
      label: c.req.query('label') ?? result.label,
      message: result.message,
      color: c.req.query('color') ?? c.req.query('theme') ?? undefined,
      style: parseStyle(c.req.query('style')),
      logo: c.req.query('logo') ?? undefined,
      logoColor: c.req.query('logoColor') ?? undefined,
      dark: darkParam(c),
    }),
    200,
    DYNAMIC_SVG_HEADERS,
  );
}

function errorBadge(c: Context, message: string): Response {
  return c.body(
    renderBadge({
      label: 'error',
      message,
      style: parseStyle(c.req.query('style')),
      dark: darkParam(c),
    }),
    200,
    SVG_HEADERS,
  );
}

async function resolveRepoMetric(
  metric: string,
  owner: string,
  repo: string,
  token?: string,
): Promise<DynamicBadge | null> {
  if (metric === 'release') {
    const r = await githubRelease(owner, repo, token);
    return { label: 'release', message: r?.tag_name ?? 'none' };
  }
  const d = await githubRepo(owner, repo, token);
  if (!d) return null;
  switch (metric) {
    case 'stars':
      return { label: 'stars', message: formatNumber(d.stargazers_count ?? 0) };
    case 'forks':
      return { label: 'forks', message: formatNumber(d.forks_count ?? 0) };
    case 'watchers':
      return { label: 'watchers', message: formatNumber(d.subscribers_count ?? d.watchers_count ?? 0) };
    case 'issues':
      return { label: 'issues', message: formatNumber(d.open_issues_count ?? 0) };
    case 'license':
      return { label: 'license', message: d.license?.spdx_id ?? 'none' };
    case 'last-commit':
      return { label: 'last push', message: formatRelativeDate(d.pushed_at) };
    default:
      return null;
  }
}

app.get('/healthz', (c) => c.text('ok'));

app.get('/badge', async (c) => {
  // 动态模式：读任意 JSON endpoint（兼容 shields 风格 {label,message,color}）
  const endpoint = c.req.query('endpoint') ?? c.req.query('url');
  if (endpoint) {
    const data = await fetchDynamicEndpoint(endpoint);
    if (data) {
      return c.body(
        renderBadge({
          label: c.req.query('label') ?? data.label,
          message: data.message,
          color: c.req.query('color') ?? c.req.query('theme') ?? undefined,
          style: parseStyle(c.req.query('style')),
          logo: c.req.query('logo') ?? undefined,
          logoColor: c.req.query('logoColor') ?? undefined,
          messageColor: c.req.query('messageColor') ?? data.color,
          dark: darkParam(c),
        }),
        200,
        DYNAMIC_SVG_HEADERS,
      );
    }
    return errorBadge(c, 'endpoint failed');
  }

  const svg = renderBadge({
    label: c.req.query('label') ?? undefined,
    message: c.req.query('message') ?? c.req.query('value') ?? undefined,
    color: c.req.query('color') ?? c.req.query('theme') ?? undefined,
    style: parseStyle(c.req.query('style')),
    logo: c.req.query('logo') ?? undefined,
    logoColor: c.req.query('logoColor') ?? undefined,
    labelColor: c.req.query('labelColor') ?? undefined,
    messageColor: c.req.query('messageColor') ?? undefined,
    dark: darkParam(c),
  });
  return c.body(svg, 200, SVG_HEADERS);
});

// GitHub 仓库类指标：/github/:metric/:owner/:repo
const REPO_METRICS = ['stars', 'forks', 'watchers', 'issues', 'license', 'last-commit', 'release'];

app.get('/github/:metric/:owner/:repo', async (c) => {
  const metric = c.req.param('metric');
  if (!REPO_METRICS.includes(metric)) return errorBadge(c, 'bad metric');
  const result = await resolveRepoMetric(metric, c.req.param('owner'), c.req.param('repo'), githubToken(c));
  if (!result) return errorBadge(c, 'not found');
  return dynamicBadge(c, result);
});

// GitHub 用户类指标：/github/:metric/:user（followers / repos）
app.get('/github/:metric/:user', async (c) => {
  const metric = c.req.param('metric');
  const user = c.req.param('user');
  if (metric !== 'followers' && metric !== 'repos') return errorBadge(c, 'bad metric');

  const d = await githubUser(user, githubToken(c));
  if (!d) return errorBadge(c, 'not found');

  const result: DynamicBadge =
    metric === 'followers'
      ? { label: 'followers', message: formatNumber(d.followers ?? 0) }
      : { label: 'repositories', message: formatNumber(d.public_repos ?? 0) };
  return dynamicBadge(c, result);
});

// npm：/npm/v/:pkg（版本）、/npm/dw|dm|dy/:pkg（周/月/年下载量）
app.get('/npm/:metric/:pkg', async (c) => {
  const metric = c.req.param('metric');
  const pkg = c.req.param('pkg');
  let result: DynamicBadge | null = null;

  if (metric === 'v') {
    const d = await npmPackage(pkg);
    result = { label: 'npm', message: d?.['dist-tags']?.latest ?? 'unknown' };
  } else if (metric === 'dw' || metric === 'dm' || metric === 'dy') {
    const period = metric === 'dm' ? 'last-month' : metric === 'dw' ? 'last-week' : 'last-year';
    const label = metric === 'dm' ? 'downloads/mo' : metric === 'dw' ? 'downloads/wk' : 'downloads/yr';
    const d = await npmDownloads(pkg, period);
    result = { label, message: formatNumber(d?.downloads ?? 0) };
  }

  if (!result) return errorBadge(c, 'bad metric');
  return dynamicBadge(c, result);
});

app.get('/metrics', async (c) => {
  const color = c.req.query('color') ?? c.req.query('theme') ?? undefined;
  const dark = darkParam(c);
  const widthRaw = parseFloat(c.req.query('width') ?? '');
  const transparent = bool(c.req.query('transparent'));
  const user = c.req.query('user');
  const config = parseMetricsConfig(c.req.query('config'));

  let spec: MetricsSpec = { title: user ?? 'Profile' };

  if (config) spec = config;

  if (user) {
    const token = githubToken(c);
    const gh = await fetchGitHubMetrics(user, token);
    if (gh) {
      spec.title = config?.title ?? gh.profile.name ?? gh.profile.login;
      spec.subtitle = config?.subtitle ?? `@${gh.profile.login}${gh.profile.bio ? ' · ' + gh.profile.bio : ''}`;
      spec.avatar = config?.avatar ?? (gh.profile.avatarUrl || undefined);
      spec.stats = config?.stats ?? [
        { label: 'Repositories', value: formatNumber(gh.profile.publicRepos) },
        { label: 'Stars', value: formatNumber(gh.totalStars) },
        { label: 'Followers', value: formatNumber(gh.profile.followers) },
        { label: 'Following', value: formatNumber(gh.profile.following) },
      ];
      spec.languages = config?.languages ?? gh.languages;
      spec.repos = config?.repos ?? gh.repos.map((r) => ({ name: r.name, description: r.description ?? undefined, stars: r.stars, forks: r.forks }));
      spec.activity = config?.activity ?? gh.activity;

      // 提交热力图：需要 token 走 GraphQL 拿贡献日历
      if (config?.heatmap == null && token) {
        const contrib = await fetchContributions(user, token);
        if (contrib) {
          spec.heatmap = contrib.days;
          spec.heatmapTotal = contrib.total;
          spec.heatmapDates = contrib.dates;
        }
      }
    } else if (!config) {
      spec = { title: user };
    }
  }

  // 模块选择：?sections=stats,languages,heatmap（逗号分隔，顺序即展示顺序）
  const sectionsParam = c.req.query('sections');
  if (sectionsParam) spec.sections = sectionsParam;

  const svg = await renderMetrics({
    ...spec,
    color,
    dark,
    width: Number.isFinite(widthRaw) ? widthRaw : undefined,
    transparent,
  });
  return c.body(svg, 200, DYNAMIC_SVG_HEADERS);
});

app.get('/', (c) => c.html(renderLanding()));

app.notFound((c) =>
  c.json(
    {
      error: 'not found',
      endpoints: [
        '/badge',
        '/badge?url=<json endpoint>',
        '/github/stars/:owner/:repo',
        '/github/forks/:owner/:repo',
        '/github/release/:owner/:repo',
        '/github/followers/:user',
        '/npm/v/:pkg',
        '/npm/dm/:pkg',
        '/metrics',
        '/',
      ],
    },
    404,
  ),
);

export default app;
