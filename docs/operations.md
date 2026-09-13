# 工作站运行与恢复

## 验证

`node scripts/syntax-check.js`、`node --test scripts/security-sync.test.js`、`node scripts/build-search-index.js`，确认索引无意外差异。

## 发布

只提交本次文件并推送main。现有Pages分支发布仍有效。已准备 `verified-pages` 工作流：管理员须将Pages Source切换为GitHub Actions，并设置仓库变量 `PAGES_DEPLOY_ENABLED=true`。在完成这两项之前，不能声称CI失败已能阻断现有分支发布。工作流只有验证通过才上传/部署同一提交。

## 数据与凭据

花园草稿、此刻、随记写入私有 digital-garden-data；只有显式发布的快照进入公开仓。PAT只授权所需仓库，短有效期。不要把PAT放入聊天、代码、备份或截图。同一github.io域下各项目共享origin；更强隔离需要独立编辑域和后端凭据方案，不应把前端密码锁作为安全边界。

## 恢复演练

在无Token的独立浏览器配置中写测试草稿并导出Markdown，再导入确认正文。此刻页导出JSON，再导入确认日期与冲突副本。真实同步失败时先导出本机数据，不清空浏览器。文章私有备份和公开发布分别确认成功，撤下公开内容失败时到写作台重发已发布内容。不要用批量发布恢复草稿。
