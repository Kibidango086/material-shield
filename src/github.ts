/**
 * GitHub 公开 API 抓取，用于 `/metrics` 的 `user=用户名` 自动模式。
 * 未认证限流 60 次/小时（按 IP），建议部署时配置 GITHUB_TOKEN 提高额度。
 */

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
}

export interface GitHubMetrics {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  totalStars: number;
  totalForks: number;
  languages: { name: string; percent: number; color: string }[];
  activity: string[];
}

/** 常见语言的品牌色（用于语言条）。 */
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4f5d95',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Dart: '#00b4ab',
  Zig: '#ec915c',
};

function formatEvent(e: Record<string, any>): string {
  const repo = e?.repo?.name ?? '';
  const payload = e?.payload ?? {};
  switch (e.type) {
    case 'PushEvent': {
      // 事件 API 的 PushEvent 不含 commits/size，无法得知提交数，只展示分支
      const branch = (payload.ref ?? '').replace('refs/heads/', '');
      return `Pushed to ${repo}${branch ? ` (${branch})` : ''}`;
    }
    case 'CreateEvent':
      return `Created ${payload.ref_type ?? 'ref'} in ${repo}`;
    case 'PullRequestEvent':
      return `${payload.action ?? 'Opened'} pull request in ${repo}`;
    case 'IssuesEvent':
      return `${payload.action ?? 'Opened'} issue in ${repo}`;
    case 'WatchEvent':
      return `Starred ${repo}`;
    case 'ForkEvent':
      return `Forked ${repo}`;
    case 'ReleaseEvent':
      return `Released in ${repo}`;
    case 'IssueCommentEvent':
      return `Commented on ${repo}`;
    case 'PullRequestReviewEvent':
      return `Reviewed pull request in ${repo}`;
    default:
      return '';
  }
}

export async function fetchGitHubMetrics(user: string, token?: string): Promise<GitHubMetrics | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'material-shield/0.1',
    Accept: 'application/vnd.github+json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const base = `https://api.github.com/users/${encodeURIComponent(user)}`;

    const profileRes = await fetch(base, { headers, signal: controller.signal });
    if (!profileRes.ok) return null;
    const profile = (await profileRes.json()) as Record<string, any>;

    // 拉取全部仓库（分页，最多 10 页 × 100 = 1000 个）
    const all: Record<string, any>[] = [];
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${base}/repos?sort=updated&per_page=100&page=${page}&type=owner`, {
        headers,
        signal: controller.signal,
      });
      if (!res.ok) break;
      const data = (await res.json()) as Record<string, any>[];
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < 100) break;
    }

    // 总 star / fork
    const totalStars = all.reduce((a, r) => a + (r.stargazers_count ?? 0), 0);
    const totalForks = all.reduce((a, r) => a + (r.forks_count ?? 0), 0);

    // 精选仓库：按 star 排序取前 6
    const repos: GitHubRepo[] = [...all]
      .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        description: r.description ?? null,
        language: r.language ?? null,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
      }));

    // 语言占比：对全部仓库聚合
    const langCount: Record<string, number> = {};
    for (const r of all) {
      if (r.language) langCount[r.language] = (langCount[r.language] ?? 0) + 1;
    }
    const totalLang = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
    const languages = Object.entries(langCount)
      .map(([name, count]) => ({
        name,
        percent: Math.round((count / totalLang) * 100),
        color: LANG_COLORS[name] ?? '#8b8b8b',
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);

    // 近期动态（可选，失败不影响整体）
    let activity: string[] = [];
    try {
      const evRes = await fetch(`${base}/events/public?per_page=6`, { headers, signal: controller.signal });
      if (evRes.ok) {
        const events = (await evRes.json()) as Record<string, any>[];
        activity = events.map(formatEvent).filter(Boolean);
      }
    } catch {
      activity = [];
    }

    return {
      profile: {
        login: profile.login ?? user,
        name: profile.name ?? null,
        avatarUrl: profile.avatar_url ?? '',
        bio: profile.bio ?? null,
        publicRepos: profile.public_repos ?? 0,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        createdAt: profile.created_at ?? '',
      },
      repos,
      totalStars,
      totalForks,
      languages,
      activity,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- 贡献日历（GraphQL，需 token） ----------------

export interface GitHubContribution {
  total: number;
  /** 每天一个 0–4 强度值，最旧在前。 */
  days: number[];
  /** 每天对应的日期（YYYY-MM-DD），与 days 一一对应，用于渲染月份/星期标签。 */
  dates: string[];
}

function contributionIntensity(n: number): number {
  if (n <= 0) return 0;
  if (n <= 3) return 1;
  if (n <= 9) return 2;
  if (n <= 19) return 3;
  return 4;
}

export async function fetchContributions(user: string, token: string): Promise<GitHubContribution | null> {
  const query =
    'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date}}}}}}';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'User-Agent': 'material-shield/0.1',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: user } }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, any>;
    const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) return null;

    const raw: number[] = [];
    const dates: string[] = [];
    for (const week of (cal.weeks ?? []) as Record<string, any>[]) {
      for (const d of (week.contributionDays ?? []) as Record<string, any>[]) {
        raw.push(d.contributionCount ?? 0);
        dates.push(d.date ?? '');
      }
    }
    // 展示完整当前年份（GitHub 贡献日历返回最近约 52–53 周）
    const days = raw.map(contributionIntensity);
    return { total: cal.totalContributions ?? 0, days, dates };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
