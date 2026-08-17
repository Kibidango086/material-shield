/**
 * 落地页：完全由 mdui（Material You / Web Components）组件构成，
 * 使用 Google Fonts（Roboto）与 Material Icons 图标字体。
 * 页面本身通过 setColorScheme 做动态配色，随主题色实时切换 Material You 配色。
 */
export function renderLanding(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Material Shield · Material You 徽章 & GitHub Metrics 生成器</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mdui@2/mdui.css" />
<script src="https://cdn.jsdelivr.net/npm/mdui@2/mdui.global.js"></script>
<style>
  body { margin: 0; font-family: 'Roboto', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 24px 20px 64px; }
  .ts-headline { font-size: var(--mdui-typescale-headline-small-size, 24px); line-height: var(--mdui-typescale-headline-small-line-height, 32px); font-weight: var(--mdui-typescale-headline-small-weight, 400); letter-spacing: var(--mdui-typescale-headline-small-tracking, 0); margin: 4px 0 6px; }
  .ts-body { font-size: var(--mdui-typescale-body-medium-size, 14px); line-height: var(--mdui-typescale-body-medium-line-height, 20px); color: rgb(var(--mdui-color-on-surface-variant)); margin: 0 0 20px; }
  .ts-title { font-size: var(--mdui-typescale-title-large-size, 22px); line-height: var(--mdui-typescale-title-large-line-height, 28px); font-weight: var(--mdui-typescale-title-large-weight, 400); }
  .ts-label { font-size: var(--mdui-typescale-label-large-size, 14px); font-weight: var(--mdui-typescale-label-large-weight, 500); }
  mdui-card { display: block; margin-bottom: 24px; }
  .settings { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; padding: 16px 20px; }
  .settings .field { display: flex; flex-direction: column; gap: 10px; }
  .swatches { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  mdui-button-icon.swatch { width: 40px; min-width: 40px; height: 40px; border-radius: 50%; }
  .swatch-dot { display: inline-block; width: 16px; height: 16px; border-radius: 50%; }
  .color-field { display: inline-flex; align-items: center; gap: 8px; margin-left: 4px; cursor: pointer; }
  input[type="color"] { width: 40px; height: 40px; padding: 0; border: 2px solid rgb(var(--mdui-color-outline-variant)); border-radius: 50%; background: none; cursor: pointer; }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; }
  input[type="color"]::-moz-color-swatch { border: none; border-radius: 50%; }
  .card-head { display: flex; align-items: center; gap: 12px; padding: 12px 20px 8px; }
  .card-head mdui-icon { color: rgb(var(--mdui-color-primary)); }
  .card-head .tag { margin-left: auto; font-size: 12px; padding: 2px 10px; border-radius: 999px; background: rgb(var(--mdui-color-secondary-container)); color: rgb(var(--mdui-color-on-secondary-container)); }
  .card-body { padding: 4px 20px 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .full { grid-column: 1 / -1; }
  .hint { margin: 4px 0 0; color: rgb(var(--mdui-color-on-surface-variant)); font-size: 12px; line-height: 1.6; }
  .hint code { background: rgb(var(--mdui-color-surface-container-high)); padding: 0 5px; border-radius: 6px; }
  .mods { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }
  .preview { text-align: center; padding: 16px 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .preview img { max-width: 100%; height: auto; }
  footer { color: rgb(var(--mdui-color-on-surface-variant)); font-size: 13px; line-height: 1.7; padding-top: 8px; }
  footer code { background: rgb(var(--mdui-color-surface-container-high)); padding: 1px 6px; border-radius: 6px; }
</style>
</head>
<body>

<mdui-top-app-bar variant="small">
  <mdui-top-app-bar-title>Material Shield</mdui-top-app-bar-title>
  <mdui-button-icon slot="action" icon="open_in_new--outlined" id="ghLink"></mdui-button-icon>
</mdui-top-app-bar>

<main class="wrap">
  <p class="ts-headline">Material You 徽章 & GitHub Metrics 生成器</p>
  <p class="ts-body">Material You 风格徽章与 GitHub 仪表盘，可免费部署到 Vercel / Netlify / Cloudflare Workers。</p>

  <!-- 主题设置 -->
  <mdui-card variant="outlined">
    <div class="settings">
      <div class="field">
        <span class="ts-label">主题色（种子色）</span>
        <div class="swatches">
          <mdui-button-icon class="swatch" data-color="#6750A4"><span class="swatch-dot" style="background:#6750A4"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#0061A4"><span class="swatch-dot" style="background:#0061A4"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#00897B"><span class="swatch-dot" style="background:#00897B"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#4CAF50"><span class="swatch-dot" style="background:#4CAF50"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#FB8C00"><span class="swatch-dot" style="background:#FB8C00"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#E53935"><span class="swatch-dot" style="background:#E53935"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#8E24AA"><span class="swatch-dot" style="background:#8E24AA"></span></mdui-button-icon>
          <mdui-button-icon class="swatch" data-color="#3949AB"><span class="swatch-dot" style="background:#3949AB"></span></mdui-button-icon>
          <label class="color-field" title="自定义颜色"><input type="color" id="seedColor" value="#6750A4" />自定义</label>
        </div>
      </div>
      <div class="field">
        <span class="ts-label">深浅色</span>
        <mdui-segmented-button-group id="darkMode" value="auto">
          <mdui-segmented-button value="light">浅色</mdui-segmented-button>
          <mdui-segmented-button value="auto">自动</mdui-segmented-button>
          <mdui-segmented-button value="dark">深色</mdui-segmented-button>
        </mdui-segmented-button-group>
      </div>
    </div>
  </mdui-card>

  <!-- 徽章 -->
  <mdui-card variant="outlined">
    <div class="card-head">
      <mdui-icon name="verified--outlined"></mdui-icon>
      <span class="ts-title">徽章 Badge</span>
      <span class="tag">/badge</span>
    </div>
    <mdui-divider></mdui-divider>
    <div class="card-body">
      <div class="grid">
        <mdui-text-field id="badgeLabel" label="左侧文字 label" value="build"></mdui-text-field>
        <mdui-text-field id="badgeMessage" label="右侧文字 message" value="passing"></mdui-text-field>
        <mdui-select id="badgeStyle" label="样式 style" value="flat">
          <mdui-menu-item value="flat">flat（默认）</mdui-menu-item>
          <mdui-menu-item value="flat-square">flat-square</mdui-menu-item>
          <mdui-menu-item value="tonal">tonal</mdui-menu-item>
          <mdui-menu-item value="filled">filled</mdui-menu-item>
          <mdui-menu-item value="outline">outline</mdui-menu-item>
          <mdui-menu-item value="for-the-badge">for-the-badge</mdui-menu-item>
        </mdui-select>
        <mdui-text-field id="badgeLogo" label="logo（github / npm / rust…）" value=""></mdui-text-field>
        <div class="full preview">
          <img id="badgePreview" alt="badge preview" src="/badge?label=build&message=passing&color=%236750A4" />
          <mdui-text-field id="badgeSnippet" label="Markdown" readonly>
            <mdui-button-icon slot="suffix" icon="content_copy" id="badgeCopy"></mdui-button-icon>
          </mdui-text-field>
        </div>
      </div>
    </div>
  </mdui-card>

  <!-- 动态徽章 -->
  <mdui-card variant="outlined">
    <div class="card-head">
      <mdui-icon name="sync--outlined"></mdui-icon>
      <span class="ts-title">动态徽章 Dynamic Badge</span>
      <span class="tag">/github · /npm</span>
    </div>
    <mdui-divider></mdui-divider>
    <div class="card-body">
      <div class="grid">
        <div class="full">
          <mdui-text-field id="dynPath" label="数据路径（github/stars/owner/repo 或 npm/dm/pkg）" value="github/stars/Kibidango086/material-shield"></mdui-text-field>
          <p class="hint">内置：<code>github/stars·forks·watchers·issues·license·release·last-commit</code>、<code>github/followers·repos</code>、<code>npm/v·dw·dm·dy</code>；任意 JSON 接口用 <code>/badge?url=…</code></p>
        </div>
        <div class="full preview">
          <img id="dynPreview" alt="dynamic badge preview" src="/github/stars/Kibidango086/material-shield?color=%236750A4" />
          <mdui-text-field id="dynSnippet" label="Markdown" readonly>
            <mdui-button-icon slot="suffix" icon="content_copy" id="dynCopy"></mdui-button-icon>
          </mdui-text-field>
        </div>
      </div>
    </div>
  </mdui-card>

  <!-- GitHub Metrics 仪表盘 -->
  <mdui-card variant="outlined">
    <div class="card-head">
      <mdui-icon name="dashboard--outlined"></mdui-icon>
      <span class="ts-title">GitHub Metrics</span>
      <span class="tag">/metrics</span>
    </div>
    <mdui-divider></mdui-divider>
    <div class="card-body">
      <div class="grid">
        <div class="full">
          <mdui-text-field id="metricsUser" label="GitHub 用户名 user（自动抓取公开数据）" value="Kibidango086"></mdui-text-field>
          <p class="hint">展示模块（勾选要显示的，全选 = 全部展示）：</p>
          <div class="mods">
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="stats">Statistics</mdui-chip>
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="languages">Languages</mdui-chip>
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="achievements">Achievements</mdui-chip>
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="heatmap">Heatmap</mdui-chip>
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="repos">Repositories</mdui-chip>
            <mdui-chip variant="filter" selectable selected selected-icon="check" class="mod-chip" data-key="activity">Activity</mdui-chip>
          </div>
          <p class="hint">提交热力图：配置 <code>GITHUB_TOKEN</code> 后由 GraphQL 自动拉取贡献日历；或通过 <code>config</code> JSON 的 <code>heatmap</code> 字段（0–4 强度数组）手动提供。</p>
        </div>
        <div class="full preview">
          <img id="metricsPreview" alt="metrics preview" src="/metrics?user=Kibidango086&color=%236750A4" style="width:100%" />
          <mdui-text-field id="metricsSnippet" label="Markdown" readonly>
            <mdui-button-icon slot="suffix" icon="content_copy" id="metricsCopy"></mdui-button-icon>
          </mdui-text-field>
        </div>
      </div>
    </div>
  </mdui-card>

  <footer>
    <p>
      生成的 Markdown 已自动带上本页域名，可直接粘贴进 GitHub README / Profile。嵌入 GitHub 时图片会被
      <code>camo.githubusercontent.com</code> 自动代理。auto 深浅色模式依赖 SVG 内的 <code>prefers-color-scheme</code>。
    </p>
  </footer>
</main>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var BASE = window.location.origin;

  function seed() { return $('seedColor').value || '#6750A4'; }
  function darkMode() { return $('darkMode').value || 'auto'; }
  function darkParam() {
    var m = darkMode();
    if (m === 'dark') return 'true';
    if (m === 'light') return 'false';
    return 'auto';
  }

  function badgeUrl() {
    var p = new URLSearchParams();
    p.set('label', $('badgeLabel').value || 'build');
    p.set('message', $('badgeMessage').value || 'passing');
    p.set('style', $('badgeStyle').value || 'flat');
    p.set('color', seed());
    p.set('dark', darkParam());
    var logo = $('badgeLogo').value.trim();
    if (logo) p.set('logo', logo);
    return BASE + '/badge?' + p.toString();
  }

  function dynUrl() {
    var p = new URLSearchParams();
    p.set('color', seed());
    p.set('dark', darkParam());
    var path = $('dynPath').value.trim();
    while (path.charAt(0) === '/') { path = path.slice(1); }
    if (!path) path = 'github/stars/Kibidango086/material-shield';
    return BASE + '/' + path + '?' + p.toString();
  }

  function metricsUrl() {
    var p = new URLSearchParams();
    var u = $('metricsUser').value.trim();
    if (u) p.set('user', u);
    p.set('color', seed());
    p.set('dark', darkParam());
    var selected = [];
    var chips = document.querySelectorAll('.mod-chip');
    chips.forEach(function (chip) {
      if (chip.selected) selected.push(chip.getAttribute('data-key'));
    });
    if (selected.length > 0 && selected.length < chips.length) {
      p.set('sections', selected.join(','));
    }
    return BASE + '/metrics?' + p.toString();
  }

  function update() {
    var b = badgeUrl();
    var d = dynUrl();
    var m = metricsUrl();
    $('badgePreview').src = b;
    $('dynPreview').src = d;
    $('metricsPreview').src = m;
    $('badgeSnippet').value = '![badge](' + b + ')';
    $('dynSnippet').value = '![badge](' + d + ')';
    $('metricsSnippet').value = '![metrics](' + m + ')';
  }

  function applyTheme() {
    mdui.setColorScheme(seed());
    mdui.setTheme(darkMode());
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        mdui.snackbar({ message: '已复制到剪贴板' });
      });
    }
  }

  $('ghLink').addEventListener('click', function () {
    window.open('https://github.com/Kibidango086/material-shield', '_blank');
  });

  document.querySelectorAll('.swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $('seedColor').value = btn.getAttribute('data-color');
      applyTheme();
      update();
    });
  });

  $('seedColor').addEventListener('input', function () { applyTheme(); update(); });
  $('darkMode').addEventListener('change', function () { applyTheme(); update(); });

  $('badgeLabel').addEventListener('input', update);
  $('badgeMessage').addEventListener('input', update);
  $('badgeStyle').addEventListener('change', update);
  $('badgeLogo').addEventListener('input', update);
  $('dynPath').addEventListener('input', update);
  $('metricsUser').addEventListener('input', update);
  document.querySelectorAll('.mod-chip').forEach(function (chip) {
    chip.addEventListener('change', update);
  });

  $('badgeCopy').addEventListener('click', function () { copy($('badgeSnippet').value); });
  $('dynCopy').addEventListener('click', function () { copy($('dynSnippet').value); });
  $('metricsCopy').addEventListener('click', function () { copy($('metricsSnippet').value); });

  applyTheme();
  update();
})();
</script>
</body>
</html>`;
}
