# SPEC.md — 数字花园产品面规格

> 本文件是产品面真相文档（路由/页面/数据/流/边界），供 AI 会话快速上船与漂移检测。
> 设计权威（视觉/交互准则）见 DESIGN.md；运维细节见 docs/operations.md。
> 修改任何产品行为前先读本文，改后同步本文。最后全面核对：2026-10-03。

## 1. 路由与页面清单（13 页，纯静态，GitHub Pages）

| 页面 | 角色 | 索引状态 |
|---|---|---|
| index.html | 首页/随记流 | 公开 |
| notes.html | 思考·随记聚合 | 公开 |
| article.html | 文章阅读页（含用户文章） | 公开 |
| concept.html | 概念页（概念层+待审候选面板） | 公开 |
| research.html | 研究 | 公开 |
| projects.html | 项目 | 公开 |
| review.html | 复盘（v2 items/del 模式） | 公开 |
| jing.html | 周易·观页 | 公开 |
| about.html | 关于 | 公开 |
| 404.html | 错误页 | — |
| now.html | 私密·当下 | noindex + robots Disallow |
| write.html | 写作台（草稿→发布） | noindex + robots Disallow |
| review-edit.html | 复盘编辑台 | noindex + robots Disallow |

JS 模块：base.js（公共 UI/样式行为）、garden-data.js（数据层：私有仓 API + 同步合并）、md.js（Markdown 渲染 v2）、bgm.js。

## 2. 数据结构

- **私有数据仓** `EvanYFM/digital-garden-data`（GitHub API 读写，Token 存 localStorage `gd_token`）：
  七数据文件 `concepts / relations / candidates / fragments / now / reviews / articles`（.json）。
- **公开仓数据**：`user-articles.json`（已发布文章 + deletions 墓碑，generated 时间戳）。
- **知识四层**：出处层（fragments）→ 概念层（concepts，含 refs/别称）→ 关系层（relations，邻域图）→ 候选管线（candidates.json：type=accept/rewrite/reject 待审，30 天过期）。
- **合并语义**（garden-data.js）：articles 按 id `updated` 新者胜；reviews/fragments v2 `items+del` 墓碑防跨设备复活；pushPublic 走 GET→merge→PUT(sha)→409 重试。
  （审计结论 2026-10-03：曾担心的 user-articles 并发丢稿已被 mergePublic 按篇合并+墓碑覆盖，无需再修。）

## 3. 数据流

写入：write/review-edit → `GD.sync`（localStorage 草稿 + 私有仓同步）→ 发布时 `GD.pushPublic('user-articles.json')` → Pages 约 1 分钟全站可见。
读取：页面 fetch 各 json（带 `?t=` 时间戳防缓存）。
部署：push main → Actions deploy.yml → Pages；check.yml 守语法/结构。
Agent 管线：周日 20:00 cron 审计（概念质量+候选发现+关系改写建议）落盘私有仓。

## 4. 环境变量与密钥

- `gd_token`（localStorage）：GitHub PAT，写私有仓用；`hasToken()` 未设置时同步功能拒绝并提示。
- 无其他 env；无后端。

## 5. 已知边界（有意为之，勿当 bug 修）

- **页脚两代形态并存**：A 代标准页脚（about/article/notes/projects/research/review/review-edit/index，max-width 随页面容器 1080/1180px）与 B 代紧凑页脚（write/concept 880px，含移动端 column 覆盖）。CSS 内联在各页，未入 base.css——统一需设计裁决（2026-10-03 审计记录，待 Evan 定夺）。文案已统一「持续修正」。
- now/write/review-edit 不入搜索引擎是**有意**的私密页。
- 概念 refs=0 属内容侧自然补全，不是管线 bug。
- 字体走系统栈 + 异步加载（09-25 审计修复），勿回退 Google Fonts 同步加载。
- 缓存戳：发布 workflow 将日期型 `?v=` 替换为 GITHUB_SHA（f4b6dae，防旧 JS 长期存活）。
