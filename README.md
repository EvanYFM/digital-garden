# 小马的数字花园

现代东方极简主义个人网站——克制、留白、长期主义。

像一本持续修订的个人思想出版物：思考 / 研究 / 项目 / 复盘 / 关于 / 观。

## 页面结构

| 页面 | 内容 |
|---|---|
| `index.html` | 首页：封面 + 精选思考 + 关注方向 |
| `notes.html` | 思考：文章索引（生长状态标记）+ 随记 |
| `article.html` | 文章详情（数据驱动，`#a0`~`#a7` 锚点路由） |
| `research.html` | 研究：四条准则 + 宏观/期货/AI 三主线 |
| `projects.html` | 项目：宏观工作台 / 期货工作站 / A股仪表盘 |
| `review.html` | 复盘：循环示意 + 每日此刻索引 + 复盘记录 |
| `about.html` | 关于：一份持续修订的个人操作系统 |
| `jing.html` | 观：体验区，静止时字才会来 |
| `now.html` | 此刻：每日记录，支持跨设备同步（见下） |

设计系统见 `DESIGN.md`。

## 日常更新

```
改文件 → git add -A → git commit -m "说明" → git push
```

推送后约一分钟，GitHub Pages 自动更新线上版本。

## 数据同步（跨设备记录）

「此刻」与「随记」支持跨设备同步，架构：**本地优先 + GitHub 私有仓库**。

- 数据仓库：`digital-garden-data`（私有），含 `now.json`（每日此刻）与 `fragments.json`（随记）
- `garden-data.js` 为共享数据层：拉取/推送/合并（409 冲突自动重试）
- Token 为 GitHub fine-grained PAT，只授权该私有仓库的 Contents 读写；仅存在各设备浏览器 localStorage，不进入网站代码
- 无 Token 时一切退化为纯本地，不报错

### 开启同步（每台设备一次）

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate
2. Repository access：仅 `digital-garden-data`；Permissions：Contents → Read and write
3. 打开线上「此刻」页 → 底部「同步 · SYNC」→ 粘贴 Token → 保存

## 本地版与线上版

- 本地版与线上版完全同源；本地直接双击 HTML 也可用（file:// 下同步同样有效）
- 私密记录永远只存在于私有数据仓库，公网不可见

## 设计原则速记

- 70% 东方留白 / 虚实 / 呼吸 + 30% 现代主义网格秩序
- 禁圆角卡片、禁阴影；几何只用圆环、圆点、细线
- 太极元素只存在于一枚 24px 日夜切换按钮的微交互里
- 朱砂色作印章式点缀，全站不超过七处
