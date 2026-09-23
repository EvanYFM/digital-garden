# 代码审查标准与流程

**版本** v1.0 · 2026-09-23
**适用范围** EvanYFM 全部仓库：代码、脚本、CI、构建链路、数据管线
**制定依据** 对 `trading-system-fresh` / `macro-workstation` / `macro-workstation-site` / `futures-workstation-deploy2` / `mockup-garden-v4` 的实际代码、CI 配置与提交历史审计

---

## 0 现状诊断：为什么需要这份标准

先说结论：**问题不是「代码质量参差不齐」，而是「门禁没有否决权，且装在 push 之后」。**

### 0.1 已经做得好的（保留，不要推翻）

| 资产 | 位置 | 价值 |
|---|---|---|
| 数据契约校验 | `futures-workstation-deploy2/.github/workflows/ci.yml` | JSON 可解析、快照与 meta 一致、反向守门（防首页停更） |
| 产物结构断言（**强**） | `macro-workstation/scripts/ci-check-pages.mjs` (76 行) | 不只查语法：把内联渲染器放进 `vm` + 假 DOM **真跑一遍**，断言渲染出「数据健康」面板且无 `NaN` |
| 发布守护（**强**） | `macro-workstation/scripts/publish-guards.mjs` (23 行) | 公开产物**白名单**（不在名单内即拒发）、凭证正则扫描（`github_pat_` / 私钥头）、禁止历史回退、禁止符号链接 |
| 公开产物隐私守门 | `check_public_artifacts.py` | 防交易记录 / Token 进公开仓 |
| **验证后发布的代码已写好** | `futures-workstation` 与 `digital-garden` 的 `deploy.yml` | 两个仓都写了 `deploy: needs: build`，build 阶段先校验再发布。**结构完全正确 —— 但被未设置的 `PAGES_DEPLOY_ENABLED` 变量关掉，从未生效**（见 G1） |
| 模板回归围栏 | `ci-check-pages.mjs` 内嵌断言 | 防 Google Fonts 回归、防 `hashchange` 监听丢失 |
| **规则文件已建立** | `macro-workstation/AGENTS.md`（112 行，2026-09-22 新增） | 明确双仓架构——「本仓为唯一真相源，公开仓只含构建产物、**禁止直接修改**」；含 4 条硬性规则 |
| **发布 SOP 已文档化** | `macro-workstation/docs/data-update-guide.md`（171 行） | 含本机网络限制下的 REST 发布 5 步、CRLF/LF 陷阱、DOM 级验证要求 |
| **事故复盘制度化** | 同上「修订记录」 | 09-20 / 09-21 / 09-22 三次事故均有根因与规则产出，例如「manual 值不许覆盖必须用**代码守卫**保证，仅靠流程约定会复发」——这是很成熟的工程判断 |
| 业务回归测试 | `trading-system-fresh/tests/`（9 文件，含 16KB 级用例） | 口径回归 |
| 领域规则单一真相源 | `trading-system-fresh/AGENTS.md`（100 行，已改 29 次） | 口径不漂移 |
| 资产卫生 | 三仓均无硬编码凭证、无 `node_modules`/`dist` 入库、均有 `.gitignore` | 底子是干净的 |
| 提交信息质量 | `trading-system-fresh` 采用 conventional + 变更理由 | 可追溯 |

> **说清楚一件事**：这套断言体系的质量高于多数商业项目。`ci-check-pages.mjs` 会在沙箱里真实执行渲染器并检查输出，`publish-guards.mjs` 用白名单而非黑名单防止不该发的东西发出去。**问题从来不是工具不行。**

### 0.2 真正的缺口（六条，均有可验证证据）

| # | 缺口 | 证据 |
|---|---|---|
| **G1** | **门禁写了，但被一个未设置的变量关掉了（比缺门禁更危险）** | 三个公开站点的 Pages 全是 `build_type=legacy`、`source=main/` → **全部是分支直发，push 即上线**。`futures-workstation` 与 `digital-garden` 的 `deploy.yml` 都已写对（`deploy: needs: build`），但 build job 带 `if: vars.PAGES_DEPLOY_ENABLED == 'true'`，而**该变量在三个仓中都不存在** → 每次运行结论都是 `completed/skipped`，`deploy.yml` 是**从未生效的死代码，保护力为零**。`macro-workstation-site` 更彻底：连 `deploy.yml` 都没有，只有事后报警的 `site-check.yml` |
| **G2** | **发布路径已完全脱离自动化门禁（最严重）** | 本机封 `github.com:443` → `publish-pages.mjs` **不可用** → 发布退化为 **5 步手工流程**（`docs/data-update-guide.md` 第五节）：① 手工 `import` `publish-guards.mjs` 跑守卫 ② `cp -a dist/pages/.` ③ 手工 `git add` + `git commit` ④ **REST Git Data API 推送**（blobs→trees→commits→PATCH refs）⑤ 比对 tree sha。**四道守护（白名单 / 凭证扫描 / 历史保护 / 树一致性）全部落在手工调用的第 1、5 步上，跳过不会有任何提示**；REST 推送绕过 `git push`，任何钩子与分支保护都拦不住 |
| **G3** | **CI 门禁列表与 npm 脚本不同源** | `npm test` 跑 **5** 个测试文件，`check.yml` 只跑 **3** 个 → `tests/futu-quote.test.mjs`（155 行）与 `tests/rendered-html.test.mjs`（16KB）**在 CI 中从不运行**。同类：`trading-system-fresh/tests/verify_tdx_converters.py` 不匹配 `-p 'test_*.py'`，同样不跑 |
| **G4** | **类型与 lint 从未被调用** | 有 `eslint.config.mjs`、TS 5.9、`strict: true`、`npm run lint`，但 `check.yml`（仅 4 步）从不调用 eslint，也从不跑 `tsc --noEmit` |
| **G5** | **对源模板做字符串级替换** | `65415de` 删 `garden/index.html` **530 行**只留 1 行（`1 insertion(+), 530 deletions(-)`），修复用「手工重打补丁」而非 `git revert`；`build-static.mjs` 另有 11 处 replace/replaceAll |
| **G6** | **跨仓分叉（本地非 git 副本）** | `futures-workstation-deploy` **不是 git 仓库**，只是 8 文件的陈旧本地副本，与现役公开仓 `futures-workstation`（本地 `futures-workstation-deploy2`）并存，无来源标记 |

### 0.3 三个量化信号（以 GitHub `main` 为基准，2026-09-23 取数）

| 指标 | 数值 |
|---|---|
| `macro-workstation` 修复/回滚提交占比 | **12 / 38 = 31%** |
| `trading-system` 修复/回滚提交占比 | **21 / 105 = 20%** |
| `futures-workstation` 修复/回滚提交占比 | **16 / 65 = 24%** |

三个仓都接近或超过 1/5。这不是"写代码水平不够"，而是**错误发现得晚**——发现得越晚，修复成本越高，修复动作本身又产生新的提交。这条指标是审查不足最直接的量化代理。

### 0.4 核心结论（审计后修正）

原以为是"代码质量参差不齐"。审计完结论不一样：

> **你们的守护写得很对，但守护住在一条没人走的路上。**

按 `AGENTS.md` 与 `docs/data-update-guide.md` 的记载，真实的发布路径是：

```
build-static.mjs  →  dist/pages/  →  cp -a 到公开仓  →  git commit  →  REST Git Data API 推送
                                          ↑
                        白名单 / 凭证扫描 / 历史保护 / 树一致性比对
                        全部落在「手工调用的第 1 步和第 5 步」上
```

关键事实三条：

1. **`publish-pages.mjs` 在本机不可用**。本机封 `github.com:443`（只放行 `api.github.com`），而该脚本内含 `git fetch` / `git pull --rebase` / `git push`，必然失败。所以 `npm run publish` 这条"带守护的路径"**在日常执行中根本不会被走到**。
2. **取而代之的 5 步手工流程，每一步都可跳过且无提示**。跑守卫是手工 import 的一行命令；树一致性比对是最后手工看一眼。跳过它们不需要绕过任何机制，只是"这次忘了"。
3. **`macro-workstation-site` 没有 deploy 门禁**，Pages 直服 main。所以错误一旦推上去，**秒级上线**，唯一的发现机制是事后 `site-check` 报警。

所以真正的缺口是两件事：

| 缺口 | 本质 |
|---|---|
| **守护不在执行路径上** | 守护正确，但住在手工步骤里；REST 推送还绕过了所有 git 层面机制（钩子、分支保护） |
| **没有否决权** | 唯一的自动断言在发布**之后**运行，且不阻止 Pages 提供服务 |

### 0.5 一个必须承认的对照

值得指出的是：`AGENTS.md` 里那条经验已经非常准确——

> 「**manual 值不许覆盖**」必须用**代码守卫**保证，仅靠流程约定会复发。

这条判断完全正确，并且已经落实成了代码（`updateCmeFedPricing` 的 skip 守卫）。**但同一条洞察还没有被应用到自己身上**：发布守卫（白名单、凭证扫描、历史保护）目前仍然是"流程约定"，而它们同样会复发。把这条已知有效的原则从数据管线推广到发布管线，是这份标准性价比最高的一件事。

### 0.5 另一个容易混淆的概念

现在做的是**成品验收**（打开页面看对不对），不是**代码审查**（看实现里埋了什么雷）。

- 成品验收能发现白屏 —— 但只能在上线**之后**
- 代码审查能发现"这 530 行删改会破坏模板结构" —— 在合并**之前**

两者防的是**不同类别**的故障，不能互相替代。你的成品验收做得很好（本地预览验收后才推），缺的是代码这一层。

---

## 1 三个设计原则

### P1 不照搬多人 PR 流程

传统 code review 依赖两个前提：审查者是**独立的人**、审查发生在**合并之前**。在你这里两个前提都不成立——团队是"你 + AI"。

所以正确的做法是**重新分工**，而不是加一层没人执行的仪式。

> **奥卡姆剃刀用在这里**：规则数量要少到能记住。宁可 12 条硬规则 100% 执行，不要 80 条清单 100% 跳过。

### P2 机器能判的，绝不让人判

格式、类型、语法、契约一致性、产物隐私 —— 全部交给 CI。

人的注意力是稀缺资源，只能花在机器判不了的地方：**口径、意图、取舍、风险敞口**。

### P3 审查强度必须随风险变化

改 `styles.css` 和改构建脚本，不该走同一套流程。否则结果只有两种：规则被绕过，或者低风险改动被过度阻塞。

> **墨菲定律用在这里**：验证时显式攻击失败路径。每个高风险改动，审查必须回答"它会怎么坏"，而不是"它看起来对不对"。

---

## 2 严重度定义

只保留三级。每一级都有**可判定判据** —— 不允许用"感觉"定级。

### 🔴 BLOCKER — 不合入

| 编号 | 判据 | 为什么 |
|---|---|---|
| B1 | 明文凭证 / Token / Cookie / 账号进入代码、报告、日志或提交 | 三仓目前零命中，这是必须守住的现状 |
| B2 | 公开仓包含 `data/imported/`、`user_journal.json`、交易记录、账户状态 | `AGENTS.md` 已定义的隐私边界 |
| B3 | 对源模板 / 构建产物做**字符串级大段替换**（而非结构化编辑），且替换后无断言兜底 | `65415de`（删 530 行）与 `build-static.mjs`（11 处 replace）的成因 |
| B4 | 数据口径与 `AGENTS.md` 冲突（前端重定义三方口径、UTC 当北京时间、报告日非 `Asia/Shanghai`） | 口径漂移会污染整条数据链 |
| B5 | 缺失数据被填 0 / 沿用旧日值 / 用近似值替代 | 违反"缺失留空，不继承旧日值"硬规则 |
| B6 | 直接改构建产物或已发布产物，而非改源头 | 下次构建即回退，且不可追溯 |
| B7 | 削弱既有 CI 门禁（删断言、跳测试、`--no-verify`） | 门禁本身就是资产 |
| B8 | 破坏已建立契约字段（`run-manifest.json` 的 `latestDate` / `snapshotDates` / `snapshotCount`） | 会导致首页停更 |
| B9 | 新增数据源但没有定义回退链 | 单点故障 = 当日断供 |
| B10 | 绕过 `publish-pages.mjs` 直接推送公开仓，或手工复制产物到公开仓 | 使白名单、凭证扫描、历史保护全部失效 |
| B11 | 用"手工重打补丁"替代 `git revert` 恢复 | 无法保证等价于原状，`65415de` 的修复方式 |

### 🟡 SHOULD FIX — 本批或下批修

| 编号 | 判据 |
|---|---|
| S1 | 新增逻辑落在无类型 / 无 lint 覆盖的位置（如 1403 行的 vanilla `app.js`） |
| S2 | 单函数 > 60 行，或单文件 > 800 行且本次仍在增长 |
| S3 | 同一逻辑在两个仓库各写一份（deploy / deploy2 型分叉） |
| S4 | 错误路径无处理：fetch 失败静默、`JSON.parse` 无 try、await 无 catch |
| S5 | 新增行为没有测试，或测试只断言 happy path |
| S6 | 日期 / 时区 / 数据源口径未在输出中显式标注 |
| S7 | 一次性排查脚本（`audit_*` / `patch_*` / `diag_*` / `mem*.py`）留在仓库根目录 |

### 💭 NIT — 可选，不阻塞

命名、注释、文档同步、目录整洁、替代写法建议。

---

## 3 风险分级 → 审查强度

按**改动失败时的影响半径**分级，不按改动行数。

| 级别 | 判定 | 需要的门禁 | 上线方式 |
|---|---|---|---|
| **L3 高危** | 发布 / 构建 / 数据口径 / 凭证 / 契约 | 机器门禁全绿 **+** AI 结构化审查 **+** 人工逐行终审 **+** 回滚预案 | 并存上线，验证后切换 |
| **L2 中危** | 业务逻辑、前端行为、抓取脚本 | 机器门禁全绿 **+** AI 结构化审查 | 本地预览验收后推 |
| **L1 低危** | 文档、纯样式微调、每日数据更新 | CI 通过即合 | 直接推 |

### 默认分级表（对现有文件的事前约定，避免每次争论）

| 文件 / 目录 | 默认级别 |
|---|---|
| `scripts/build-static.mjs`、`publish-pages.mjs`、`publish-guards.mjs` | **L3** |
| `scripts/build_research_dashboard.py`（1081 行 / 已改 32 次） | **L3** |
| `AGENTS.md`、`docs/daily-data-update-handoff.md` | **L3**（口径真相源） |
| `check_public_artifacts.py`、`.github/workflows/**` | **L3**（门禁本体） |
| `web/research_dashboard/app.js`（1403 行）、`app/workbench.tsx` | L2 |
| `scripts/fetch_*.py`、`scripts/update-*.mjs` | L2 |
| `styles.css` / `styles-v2.css`（纯数值微调可降 L1） | L2 |
| `docs/**`（除上述）、`README.md` | L1 |
| `data/**`、`output/**` 日更产物 | L1 |

---

## 4 三层审查架构

**核心思想**：把判断力放在机器判不了的地方，把机器能判的全部推给机器。

### 第一层 · 机器门禁（已存在且质量高，缺否决权 + 三个漏项）

**已覆盖且做得好的**

| 覆盖项 | 载体 |
|---|---|
| JS / Python 语法检查 | `node --check`、`py_compile` |
| 产物结构 + 渲染运行时断言 | `ci-check-pages.mjs`（`vm` 沙箱真跑渲染器） |
| 数据 JSON 与快照契约（含反向守门） | `deploy2/ci.yml` |
| 公开产物白名单 + 凭证扫描 | `publish-guards.mjs`、`check_public_artifacts.py` |
| 模板回归围栏 | `ci-check-pages.mjs` 内嵌断言 |
| 部分业务回归测试 | `tests/` 各仓 |

**要补的只有四件事**

| # | 漏项 | 说明 |
|---|---|---|
| 1 | **否决权** | `macro-workstation-site` 没有 `deploy: needs: build` 门禁，push 即上线。见第一批动作 1 |
| 2 | **守护进入执行路径** | 白名单 / 凭证扫描 / 历史保护目前落在手工步骤上；发布已退化为 5 步 REST 流程。见第一批动作 2 |
| 3 | **门禁列表与 npm 脚本同源** | `npm test` 跑 5 个测试文件，`check.yml` 只跑 3 个 → `futu-quote.test.mjs`、`rendered-html.test.mjs` 在 CI 中从不运行 |
| 4 | **类型 / lint / Python 风格** | 有配置（`eslint.config.mjs`）、有脚本（`npm run lint`）、有 `strict: true`，但 CI 从不调用；Python 侧只有 `py_compile` |

**顺带修两个小洞**

- `trading-system-fresh/tests/verify_tdx_converters.py` 命名不匹配 `test_*.py` 通配符 → **当前不在 CI 中运行**（改名即可）
- `trading-system-fresh` 无 `requirements.txt`，CI 内硬编码 `lxml==6.1.1 pandas==2.2.3` → 本地与 CI 环境无单一真相源

### 第二层 · AI 结构化审查（新增，用协议约束）

这是最容易失败的一层。AI 审查的默认失败模式是**谄媚式通过** —— "整体看起来不错，建议注意错误处理"。

必须用强制输出格式 + 强制必查项约束。见第 8 节。

### 第三层 · 人工终审（你的时间只花在这里）

**只看四个问题：**

1. 口径对不对？（是否符合 `AGENTS.md` 当日的定义）
2. 意图是不是我想要的？（改的是不是我想改的那件事）
3. 取舍是否可接受？（成本 / 复杂度 / 可维护性）
4. 最坏情况能不能承受？（回滚路径是否清晰）

**不看的**：缩进、命名、格式、风格 —— 全部交机器。

---

## 5 流程

### 现状（macro-workstation 的真实发布链）

```
改数据 / 改前端
  ↓
node scripts/update-data.mjs --scope=all
  ↓
node scripts/build-static.mjs              → dist/pages/
  ↓
① 手工 import publish-guards.mjs 跑守卫      ← 可跳过，跳过无任何提示
② cp -a dist/pages/. 到公开仓
③ git add -A && git commit                  ← 可跳过（跳过则 CRLF 污染溯源）
④ REST Git Data API 推送（blobs→trees→commits→PATCH refs）
     └─ 绕过 git push ⇒ 钩子 / 分支保护 / pre-push 一律无效
⑤ 手工比对远端 tree.sha == 本地 HEAD^{tree}  ← 可跳过，跳过无任何提示
  ↓
GitHub Pages 直接服务 main ⇒ 秒级上线
  ↓
site-check.yml 事后报警（不阻断任何事）
```

**守卫已经写好了，但它们住在 ① 和 ⑤ 这两个手工且可跳过、且不会有任何提示的位置上。**

### 目标

```
node scripts/build-static.mjs  → dist/pages/
  ↓
npx publish-rest                             ← 一条命令，把 ①~⑤ 全部固化
  ├─ 守卫在脚本内前置：validatePublicTree + assertHistory（不可跳过）
  ├─ 结构断言：提取内嵌 <script> 跑 node --check（AGENTS.md 硬性规则 2）
  ├─ 内容取自 git show <sha>:<path>（已提交 blob，避免 CRLF 污染）
  ├─ REST 推送
  └─ 验收：远端 tree.sha == 本地 HEAD^{tree}，不等即退出非零
  ↓
站点仓 deploy 门禁（deploy: needs: build）⇒ 校验失败不上线
  ↓
线上自动核验
```

**关键改变只有三个**：

| # | 改变 | 解决 |
|---|---|---|
| 1 | **把 5 步手工发布固化成一条命令**（`publish-rest`），守卫在脚本内前置 | 守护脱离执行路径 → 守护将不可能被跳过 |
| 2 | **给 `macro-workstation-site` 装 `deploy: needs: build` 门禁** | 让已有断言拥有否决权 |
| 3 | **L3 改动必须留下书面审查结论**（写入 `AGENTS.md`「当前状态」或 `docs/codex-handoff.md`） | 机器判不了的那一层 |

> **注意**：`git` 的 `pre-push` 钩子只能覆盖**源码仓**（`macro-workstation` / `trading-system` / `digital-garden`）的 push，**对公开仓的 REST 发布路径完全无效**。它是补充，不是替代品。

### 每次改动的完成定义（DoD）

- [ ] 本地已跑与 CI 同源的命令，且全绿
- [ ] 本次改动的风险级别已明确（L1 / L2 / L3）
- [ ] L2 / L3：AI 结构化审查已执行，结论已记录
- [ ] L3：人工逐行终审已完成，回滚命令已写清
- [ ] 涉及口径：`AGENTS.md` 或 handoff 文档已同步
- [ ] 无临时文件、备份文件、一次性脚本混入提交

---

## 6 仓库专属必查清单

### macro-workstation

- [ ] `build-static.mjs` 的替换逻辑是否新增 / 修改？**若有，构建后必须断言产物结构**（script 标签配对、`new Function(js)` 可解析）
- [ ] `eslint` 与 `tsc --noEmit` 是否通过？（**当前 CI 不跑，必须本地跑**）
- [ ] 新增数据源是否在 `config/data-sources.json` 中登记并定义了回退链
- [ ] `config/update-state.json` 与 `public/data/latest.json` 是否同步
- [ ] 两个仓（`macro-workstation` / `macro-workstation-site`）是否都已更新

### trading-system-fresh

- [ ] 是否遵循 `AGENTS.md` 当日的口径条目？（该文件被频繁修订，审查时以最新版为准）
- [ ] 所有日期是否 `Asia/Shanghai`，无 UTC `Z` 参与判断
- [ ] 缺失字段是否留空，而非填 0 / 沿用旧值
- [ ] `run-manifest.json` 三字段是否与 `dashboard-meta.json` 一致
- [ ] `docs/codex-handoff.md` 是否同步
- [ ] 公开仓是否仍然不含 `data/imported/`、`user_journal.json`

### futures-workstation-deploy / -deploy2

- [ ] 本次改动是否**只进了一个仓**？两仓 `app.js` 已分叉，必须明确声明「deploy2 为现役 / deploy 为冻结」，或统一源头
- [ ] `check_public_artifacts.py` 是否通过
- [ ] 快照目录最新文件 == `meta.latestDate`（反向守门）

### mockup-garden-v4（原型目录）

- [ ] 原型产出的**结论**是否已进正式仓？该目录无 git、无 `package.json`，根目录堆积 32 个一次性脚本
- [ ] 从该目录复制到正式仓的任何代码，**必须按 L2 重新审查**，不得直接搬运

---

## 7 明确禁止的模式

| 禁止 | 替代做法 | 触发案例 |
|---|---|---|
| 对源模板或产物做字符串级大段替换 | 结构化编辑；确实必须替换时，替换后立即断言（结构解析 + 语法校验） | `65415de` 删 `garden/index.html` 530 行 |
| 用"手工重打补丁"恢复 | `git revert`，或从已知良好 commit 检出后一次性重放，并跑门禁确认等价 | 「恢复自 `334dfce` 并安全重打 `ois1y` 补丁」 |
| 绕过 `publish-pages.mjs` 直接推公开仓 | 只走 `npm run publish`；旁路场景须在站点仓 CI 显式校验 | 白名单与凭证扫描会静默失效 |
| 有 deploy 门禁的仓改用"发布后验证" | 保持 `deploy: needs: build` 范式（见 `deploy2/deploy.yml`） | `macro-workstation-site` 当前无 deploy 门禁 |
| 缺失数据填 0 / 沿用旧值 / 用 `priceIndex` 替代收盘价 | 留空 + 显式标注来源缺失 | `AGENTS.md` 明文规则 |
| 前端重新定义后端口径 | 前端只消费，口径唯一在数据层 | `AGENTS.md` |
| 一次性排查脚本留在仓库根目录 | 进 `tools/` 或删除；结论进 `docs/` | `mockup-garden-v4` 32 个脚本 |
| 用 `--no-verify` 绕过钩子 | 修钩子 | — |

---

## 8 AI 审查协议

AI 审查最大的失败模式是**谄媚式通过**。用格式强制约束。

### 提问模板

```
审查对象：<commit hash 或 diff>
改动级别：L2 / L3
上下文：<本次改动意图 + 相关 AGENTS.md 条目>

审查要求：
1. 先给改动摘要（≤3 句）
2. 列出所有 BLOCKER，每条必须给出：文件:行号 + 可复现的失败场景 + 具体修法
3. 列出 SHOULD FIX，同上格式
4. 显式回答：「这次改动最可能以哪 3 种方式失败？」每种必须给出触发条件
5. 显式回答：「有什么被漏掉的口径或契约？」
6. 区分「事实 / 推断 / 未知」，推断必须标注
7. 最后给结论：合入 / 有条件合入 / 不合入

禁止：在没有具体证据时使用「看起来没问题」「应该可以」等措辞。
```

### 配套要求

| 要求 | 原因 |
|---|---|
| 单次审查 diff ≤ ~600 行 | 超出则按文件分批，否则审查质量断崖下降 |
| 必须提供 `AGENTS.md` 相关条目 | AI 不知道你的口径，会把正确写法判成错误 |
| 必须提供改动意图 | 否则 AI 无法区分"遗漏"和"有意不做" |
| 高风险的用更强推理档位 | L3 改动值得多花算力 |

---

## 9 度量：只看 4 个指标

| 指标 | 当前 | 目标 | 取法 |
|---|---|---|---|
| 修复/回滚提交占比 | macro 36% / trading 17% | < 10% | `git log --oneline \| grep -ciE 'fix\|修复\|revert\|回滚'` ÷ 总提交数 |
| 门禁覆盖率 | 类型/lint 未接入 | 双仓 lint + type 接入 | workflow 文件 |
| 高危改动的书面审查率 | ~0 | 100% | handoff 文档中的 L3 审查记录 |
| 分叉重复文件数 | ≥ 1（`app.js`） | 0 | 跨仓同名文件 md5 对比 |

**每两周看一次，只看趋势，不看单点。**

---

## 10 落地顺序

不要一次全上。核心原则两条：

1. **先让守护进入执行路径，再加新检查。** 顺序反了就是往一条没人走的路上再装几个新路标。
2. **先给门禁装否决权，再谈覆盖率。**

### 第一批 · 让守护进入执行路径 + 装上否决权（本周，最高杠杆）→ 对应 `CI_GATES_PATCH.md` 的 **P0**

| # | 动作 | 效果 |
|---|---|---|
| 1 | **把 5 步手工发布固化成 `scripts/publish-rest.mjs`**：守卫在脚本内前置（`validatePublicTree` + `assertHistory`），内容取自 `git show <sha>:<path>`，推送后校验 `tree.sha == HEAD^{tree}`，不等即退出非零 | 解决 G2 —— 白名单 / 凭证扫描 / 历史保护 / 树一致性从"手工步骤"变成"不可跳过的前置"。这是全表最高杠杆的一项 |
| 2 | **给 `macro-workstation-site` 加 `deploy.yml`**，照抄 `futures-workstation-deploy2` 的 `deploy: needs: build` 范式 | 解决 G1 —— 从"发布后验证"变"验证后发布"，白屏类别故障拦在发布前 |
| 3 | **装 `pre-push` 钩子**（`core.hooksPath=.githooks`） | 覆盖**源码仓** push（对 REST 发布路径无效，见第 5 节注） |

→ 具体 YAML 与脚本见 `CI_GATES_PATCH.md`

### 第二批 · 让门禁列表同源 + 接入从未被调用的检查（下周）→ **P1**

| # | 动作 | 对应缺口 |
|---|---|---|
| 4 | `check.yml` 的测试列表改为 `npm test`（当前少跑 `futu-quote.test.mjs`、`rendered-html.test.mjs`） | G3 |
| 5 | `eslint` + `tsc --noEmit` 加入 `macro-workstation/check.yml` | G4 |
| 6 | `ruff check scripts/ tests/` 加入 `trading-system-fresh/ci.yml` | G4 |
| 7 | 生成 `requirements.txt` 锁定依赖，CI 改读文件（当前硬编码 `lxml==6.1.1 pandas==2.2.3`） | 可重现性 |
| 8 | `verify_tdx_converters.py` → `test_verify_tdx_converters.py`（当前不匹配 `test_*.py`，**不在 CI 中运行**） | 测试假覆盖 |

### 第三批 · 制度化（按需）→ **P2**

| # | 动作 |
|---|---|
| 9 | 启用 PR 模板（`PULL_REQUEST_TEMPLATE.md`）+ 默认分级表 |
| 10 | 统一 `futures` 源头：公开仓只由 `trading-system` 发布；清理非 git 的 `futures-workstation-deploy` 本地副本 |
| 11 | AI 审查协议进入日常（L3 改动强制） |
| 12 | 清理 `mockup-garden-v4` 的 32 个一次性脚本 |
| 13 | 每两周看一次第 9 节的 4 个指标 |

---

## 一句话

**你们的守护写得很对，但它们住在一条没人走的路上 —— 把守护从手工步骤搬进执行路径，再给它否决权，比新增任何检查都重要。**

---

### 附：配套文件

| 文件 | 用途 | 放置位置 |
|---|---|---|
| `REVIEW_CHECKLIST.md` | 审查时对照勾选的一页速查 | 各仓 `docs/` |
| `PULL_REQUEST_TEMPLATE.md` | PR 模板 | 各仓 `.github/` |
| `CI_GATES_PATCH.md` | 门禁补丁，含可直接粘贴的 YAML | 参考文档 |
