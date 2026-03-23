# REQ-2026-005: Docs impact planning and completion gate MVP

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`REQ-2026-004` 已经让 `docs:verify` 能发现 diff-aware 文档同步缺口，但它仍然是“事后报错”。
对于主要面向 agent 的仓库，这还不够：
- agent 需要在实现前就知道这次应该补哪些文档
- REQ 完成前需要有机械 gate，避免文档义务漏掉后仍然被标记完成

如果这一层还依赖人显式提醒“记得改 README / AGENTS”，那文档漂移只是从 review 阶段后移到了 complete 阶段。

## 目标
- 提供一个面向 agent 的 `docs:impact` 入口，直接输出本次 changed files 触发的文档义务
- 让 `req:complete` 在文档漂移未清理时拒绝完成 REQ
- 让 drift-control 从“被动检查”升级为“先给待办，再阻止漏项收工”

## 非目标
- 不在本轮做自动修改文档内容
- 不在本轮做复杂的 `requireAll` / 优先级矩阵 / 规则推理系统
- 不在本轮做 CI 平台专用输出格式或 PR comment 集成

## 范围
- 涉及目录 / 模块：
  - `scripts/docs-verify.mjs`
  - `scripts/req-cli.mjs`
  - `scripts/check-governance.mjs`
  - `scripts/docs-sync-rules.json`
  - `package.json`
  - `README.md`
  - `CONTRIBUTING.md`
- 影响接口 / 页面 / 脚本：
  - `npm run docs:impact`
  - `npm run docs:verify`
  - `npm run req:complete`

## 验收标准
- [x] 仓库内可运行 `npm run docs:impact`，输出当前 changed files 命中的规则、已满足文档和缺失文档
- [x] `req:complete` 在提供 changed-files 快照时，会因未满足的 diff-aware 文档义务而失败
- [x] 当文档义务已满足时，`req:complete` 仍可正常完成 REQ
- [x] README / CONTRIBUTING 明确说明 `docs:impact` 和 complete gate 的用途
- [x] QA 中至少覆盖一组 complete gate 失败和一组通过场景

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-005-design.md`
- 相关规范：`scripts/docs-verify.mjs`、`scripts/req-cli.mjs`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-005-code-review.md`
- QA：`requirements/reports/REQ-2026-005-qa.md`
- Ship：`requirements/reports/REQ-2026-005-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run docs:impact`
  - `npm run docs:verify`
  - `npm run check:governance`
  - 基于临时 fixture 的 `npm run req:complete -- --id ...`
- 需要的环境：
  - Node.js
  - Git
- 需要的人工验证：
  - 核对 `docs:impact` 输出是否对 agent 足够直接
  - 核对 README 是否说明先看 impact、再 complete

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - 如果 complete gate 接得过死，会增加维护者“只是想落报告”的摩擦
  - 如果 impact 输出不够明确，agent 仍可能不知道该先改哪份文档
- 回滚方式：
  - 回退 `docs:impact` 与 `req:complete` 的文档 gate 集成

## 关键决策
- 2026-03-23：MVP 先复用现有 diff-aware 规则，不在本轮引入新的规则语义
- 2026-03-23：drift-control 先做“impact 可见 + complete 阻断”两段式闭环
- 2026-03-23：`docs:impact` 直接复用 `docs-verify` 的 changed-files 分析内核，避免 impact / verify / complete 三套逻辑漂移
- 2026-03-23：`req:complete` 的 docs gate 先通过 npm wrapper 注入 git status 快照，保持当前 sandbox 环境可运行

<!-- Source file: REQ-2026-005-docs-impact-and-complete-gate-mvp.md -->
