# 代码审查速查清单

> 审查时对着勾。**机器能判的一律不勾**（交给 CI），只勾需要判断力的。
> 配套主文档：`CODE_REVIEW.md`

---

## 第一步：定级（30 秒）

| 问题 | 是 → |
|---|---|
| 碰了发布 / 构建 / 数据口径 / 凭证 / 契约 / CI？ | **L3** |
| 碰了业务逻辑 / 前端行为 / 抓取脚本？ | **L2** |
| 只改文档 / 纯样式微调 / 日更数据？ | **L1** |

**L1 → 看 CI 绿了就合，走完。L2 → 继续。L3 → 继续 + 人工逐行终审。**

---

## 第二步：BLOCKER 扫描（必须全过）

- [ ] **B1** 无明文凭证 / Token / Cookie / 账号进入代码、报告、日志
- [ ] **B2** 公开仓不含 `data/imported/`、`user_journal.json`、交易记录、账户状态
- [ ] **B3** 构建 / 发布脚本**未新增**字节级字符串替换；若有，替换后已断言产物结构
- [ ] **B4** 口径与 `AGENTS.md` 一致（无前端重定义、UTC 未当北京时间、报告日为 `Asia/Shanghai`）
- [ ] **B5** 缺失数据留空，**未**填 0 / **未**沿用旧日值 / **未**用近似值替代
- [ ] **B6** 改的是源头，**不是**构建产物或已发布产物
- [ ] **B7** 未削弱既有 CI 门禁（无删断言、无跳测试、无 `--no-verify`）
- [ ] **B8** `run-manifest.json` 的 `latestDate` / `snapshotDates` / `snapshotCount` 三字段完整
- [ ] **B9** 新增数据源已定义回退链
- [ ] **B10** 未绕过 `publish-pages.mjs` 直接推送 / 手工复制产物到公开仓
- [ ] **B11** 未用「手工重打补丁」替代 `git revert` 恢复

**有任一未勾 → 不合入，不要往下走。**

---

## 第三步：SHOULD FIX 扫描

- [ ] **S1** 新增逻辑不在无类型 / 无 lint 覆盖的盲区（`app.js` 类 1400 行 vanilla JS）
- [ ] **S2** 无单函数 > 60 行；无单文件 > 800 行且仍在增长
- [ ] **S3** 无跨仓各写一份的重复逻辑
- [ ] **S4** 错误路径有处理（fetch 失败、`JSON.parse`、await 都有 catch / 降级）
- [ ] **S5** 新增行为有测试，且测试不只断言 happy path
- [ ] **S6** 日期 / 时区 / 数据源口径已在输出中显式标注
- [ ] **S7** 无一次性脚本留在仓库根目录

---

## 第四步：攻击性提问（L2 / L3 必答）

**这次改动最可能以哪 3 种方式失败？** 每种必须写出触发条件。

1.
2.
3.

**被漏掉的口径或契约是什么？**

**回滚方式是什么？**（具体到命令）

---

## 仓库专属补充

### macro-workstation
- [ ] `build-static.mjs` 替换逻辑有改动 → 已断言产物结构（script 标签配对、`new Function(js)` 可解析）
- [ ] 本地跑过 `eslint` 与 `tsc --noEmit`（CI 当前不跑）
- [ ] 新数据源已登记进 `config/data-sources.json` 且带回退链
- [ ] `config/update-state.json` 与 `public/data/latest.json` 已同步
- [ ] `macro-workstation` 与 `macro-workstation-site` 两仓都已更新

### trading-system-fresh
- [ ] 对照最新版 `AGENTS.md` 当日口径条目
- [ ] 无 UTC `Z` 参与日期判断
- [ ] `run-manifest.json` 与 `dashboard-meta.json` 一致
- [ ] `docs/codex-handoff.md` 已同步
- [ ] 公开仓仍不含 `data/imported/`、`user_journal.json`

### futures-workstation-deploy / -deploy2
- [ ] 明确本次只进哪个仓（两仓 `app.js` 已分叉）
- [ ] `check_public_artifacts.py` 通过
- [ ] 快照目录最新文件 == `meta.latestDate`

### mockup-garden-v4
- [ ] 结论已进正式仓；复制到正式仓的代码**已按 L2 重新审查**

---

## 结论

- [ ] **合入**
- [ ] **有条件合入**（条件：____________，须在下一批修复）
- [ ] **不合入**（原因：____________）

**书面审查记录写入**：commit message / `docs/codex-handoff.md`（L3 必填）
