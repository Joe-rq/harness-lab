# REQ-2026-004: Diff-aware doc sync MVP

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`REQ-2026-003` 已经补上了静态文档质量门，但它还不能回答一个更实际的问题：
如果这次改了 CLI、治理脚本、REQ 模板或 skills，是否同步改了应该联动更新的入口文档。

当前仓库里已经有 `CONTRIBUTING.md -> Files To Update Together` 这类人工约定，但缺自动约束。
结果就是结构检查能通过，README / AGENTS / CLAUDE 仍可能停留在旧能力描述。

## 目标
- 为 `docs:verify` 增加基于 git changed files 的 diff-aware 文档同步检查
- 把“哪些改动通常要联动更新哪些文档”做成可维护的规则配置，而不是散落在脚本分支里
- 让模板仓库在改 CLI / 治理脚本 / 入口协议时，能自动提示缺失的文档同步

## 非目标
- 不在本轮做全文语义比对或自动判断文档内容是否“写对了”
- 不在本轮做外部 URL 可达性、锚点标题精确解析或拼写检查
- 不在本轮做 CI 专用的复杂 base/head 策略矩阵

## 范围
- 涉及目录 / 模块：
  - `scripts/docs-verify.mjs`
  - `scripts/check-governance.mjs`
  - `scripts/docs-sync-rules.json`
  - `README.md`
  - `CONTRIBUTING.md`
  - `requirements/`
- 影响接口 / 页面 / 脚本：
  - `npm run docs:verify`
  - `npm run check:governance`
  - 模板仓库维护者的文档同步约束

## 验收标准
- [x] `docs:verify` 能基于当前 working tree / staged / untracked changed files 执行 diff-aware 检查
- [x] diff-aware 规则由独立配置文件承载，而不是把所有映射硬编码在脚本逻辑里
- [x] 当触发文件改动但缺少约定文档改动时，`docs:verify` 能给出明确失败信息
- [x] `check:governance` 会继续在文档同步失败时一并失败
- [x] README 和 CONTRIBUTING 说明 diff-aware 规则的意图、范围和维护方式

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-004-design.md`
- 相关规范：`CONTRIBUTING.md`、`scripts/docs-verify.mjs`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-004-code-review.md`
- QA：`requirements/reports/REQ-2026-004-qa.md`
- Ship：`requirements/reports/REQ-2026-004-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run docs:verify`
  - `npm run check:governance`
  - 基于临时 git fixture 的 `node scripts/docs-verify.mjs`
- 需要的环境：
  - Node.js
  - Git
- 需要的人工验证：
  - 核对 README 是否解释 diff-aware 约束
  - 核对 CONTRIBUTING 是否记录规则维护入口

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - 规则写得过宽会造成误报，写得过窄又抓不住真正的文档漂移
  - working tree 级 diff-aware 默认行为如果不够透明，会让维护者难以判断为何失败
- 回滚方式：
  - 回退 `docs:verify`、规则配置及相关文档说明

## 关键决策
- 2026-03-23：MVP 先基于 git 本地 changed files 做同步检查，不在本轮要求 CI 侧复杂 diff 参数
- 2026-03-23：diff-aware 映射独立放到 `scripts/docs-sync-rules.json`，避免规则散落在脚本逻辑里
- 2026-03-23：当前环境内 Node 子进程直接调用 git 不稳定，因此改为由 npm 入口先产出 git status 快照，再交给 `docs:verify` 解析
- 2026-03-23：为兼容当前 sandbox 的 dubious ownership 限制，`docs:verify` / `check:governance` 入口使用只读的 `git -c safe.directory=* status`

<!-- Source file: REQ-2026-004-diff-aware-doc-sync-mvp.md -->
