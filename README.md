# Material Shield

Material You 风格的徽章（badge）与 GitHub Metrics 仪表盘（metrics）SVG 生成服务。由单个种子色自动生成整套配色，支持深浅色自动切换，可免费部署到 Vercel / Netlify / Cloudflare Workers。

在线预览：<https://material-shield.kibidango086.workers.dev>

[![stars](https://material-shield.kibidango086.workers.dev/github/stars/Kibidango086/material-shield?style=tonal&logo=github)](https://github.com/Kibidango086/material-shield)
[![forks](https://material-shield.kibidango086.workers.dev/github/forks/Kibidango086/material-shield?style=tonal&logo=github)](https://github.com/Kibidango086/material-shield)
[![release](https://material-shield.kibidango086.workers.dev/github/release/Kibidango086/material-shield?style=tonal)](https://github.com/Kibidango086/material-shield/releases)
[![license](https://material-shield.kibidango086.workers.dev/github/license/Kibidango086/material-shield?style=tonal)](https://github.com/Kibidango086/material-shield)

## 端点

| 端点 | 说明 |
| --- | --- |
| `/badge` | 静态徽章（`label` / `message`） |
| `/github/:metric/:owner/:repo` | GitHub 仓库数据：`stars` `forks` `watchers` `issues` `license` `release` `last-commit` |
| `/github/:metric/:user` | GitHub 用户数据：`followers` `repos` |
| `/npm/:metric/:pkg` | npm：`v`（版本）`dw` `dm` `dy`（周/月/年下载量） |
| `/badge?url=<json>` | 任意 JSON 接口（兼容 shields 的 `{label,message,color}` 格式） |
| `/metrics` | GitHub Metrics 仪表盘（`user=` 自动抓取，或 `config=` 传 JSON） |

## 示例

```markdown
![build](https://material-shield.kibidango086.workers.dev/badge?label=build&message=passing&color=%236750A4)
![stars](https://material-shield.kibidango086.workers.dev/github/stars/Kibidango086/material-shield)
![npm](https://material-shield.kibidango086.workers.dev/npm/dm/react)
![metrics](https://material-shield.kibidango086.workers.dev/metrics?user=Kibidango086)
```

通用参数：`color`（种子色，十六进制）、`dark`（`auto` / `true` / `false`，默认 `auto` 随浏览者深浅色切换）、`style`（`flat` `flat-square` `tonal` `filled` `outline` `for-the-badge`）、`logo`、`label`。

`/metrics` 的 `config` 传 URL 编码 JSON，可自定义 `stats` / `languages` / `achievements` / `heatmap`（0–4 强度数组）/ `repos` / `activity`。用 `?sections=stats,languages,heatmap` 可指定展示哪些模块及顺序（模块名：`stats` `languages` `achievements` `heatmap` `repos` `activity`）。

## 本地运行

```bash
npm install
npm run dev      # http://localhost:8787
```

## 部署

```bash
npx wrangler deploy    # Cloudflare Workers（wrangler.jsonc）
vercel --prod          # Vercel（vercel.json）
netlify deploy --prod  # Netlify（netlify.toml）
```

配置 `GITHUB_TOKEN`（各平台 secret / 环境变量）可提高 GitHub 限流额度，并启用提交热力图。
