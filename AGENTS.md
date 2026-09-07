# AGENTS.md — 小马的数字花园

## 项目定位

现代东方极简主义个人网站：像一本持续修订的思想出版物，不是作品集、不是 SaaS 落地页。内容围绕交易/宏观研究、AI 工具、长期主义与自我操作系统。

## 怎么跑

纯静态，零依赖。直接双击任意 HTML 即可（file:// 下 localStorage 与云端同步均可用）。
字体走 Google Fonts CDN，断网时自动回退宋体/雅黑，不影响功能。

线上：https://evanyfm.github.io/digital-garden/
更新流程：改文件 → `git add -A` → `git commit -m "说明"` → `git push` → 约 1 分钟自动部署（GitHub Pages，main 分支根路径）。

**铁律：GitHub 优先**。用户会直接在 GitHub 网页端改代码，远端经常领先本地。
任何修改前必须先 `git fetch origin && git pull --rebase origin main`（无本地提交时用
`git reset --hard origin/main` 对齐），以远端最新版为修改基准，禁止凭本地旧副本动手。
（2026-09-01 教训：一次失败的 rebase 曾损坏本地 .git，靠远端重建恢复——远端即真相。）

## 技术栈与结构

- HTML + 内联 CSS/JS，无构建步骤。共享层：`garden-data.js`（数据）、`base.css`（色彩 tokens/页头导航/太极钮，七页引入）、`base.js`（日夜切换 + 入场动效，`body data-rv` 可扩展观察选择器）
- 页头样式有页面差异的 index/jing/write 未抽取，仍为内联——改全站页头/太极时这三页需手动同步
- 语法守门：`node scripts/syntax-check.js`（推送后 CI 自动跑，见 .github/workflows/check.yml）
- 全文检索：notes.html 检索框；索引 `search-index.json` 由 `node scripts/build-search-index.js` 从 article.html 的 ARTICLES 生成（确定性输出）。**改了 article.html 文章必须重跑索引**，否则 CI 新鲜度检查会挂红；用户文章不入索引（运行时从 user-articles.json 实时并入）；file:// 下自动退化为标题检索+本地草稿全文
- 仓库：`EvanYFM/digital-garden`（公开，站点）、`EvanYFM/digital-garden-data`（私有，此刻/随记数据）
- 设计系统权威文档：`DESIGN.md`；对外说明：`README.md`
- 项目记忆：`.workbuddy/memory/` 按日期追加

## 约定

- **设计红线**：禁圆角卡片、禁阴影、禁渐变装饰；几何只用圆环/圆点/细线；朱砂色仅作印章式点缀（全站不超过七处）；东方元素隐喻化，不做显性太极与水墨装饰
- **文章路由**：`article.html#a0`~`#a7` 锚点优先，`?id=` 为后备（锚点在 file:// 与静态服务下都可靠）
- **文章数据**：集中在 `article.html` 顶部 `ARTICLES` 对象与 `ORDER` 数组，改文章只动这两处
- **数据同步**：本地 localStorage 优先，无 Token 时纯本地不报错；`now.json`（按日期）/ `fragments.json`（按时间戳）
- **私密边界**：此刻页有 6 位密码门（前端锁，可被绕过）；真正的安全由私有仓库 + Token 保证；复盘页「每日此刻」区块仅在有 Token 的设备显示
- 中文内容一律 UTF-8；改完用 `node -e` 或浏览器核对脚本语法

## 当前状态与下一步

v1 已上线（2026-08-24），数据层与私密锁已生效（2026-08-27 / 08-30）。
待办：Token 需用户手动创建并在各设备粘贴一次；`.tmp-data` 等会话残留待用户确认后清理。
后续可选：文章全文检索、双链、随记升格为文章的工作流。
