# REQ-2026-006: Structured docs impact output MVP

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`REQ-2026-005` 已经把 `docs:impact` 做成了 agent 可见的文本入口，但它仍然主要面向人类阅读。
如果后续要让 agent、CI 或其他脚本直接消费当前文档义务，纯文本输出还不够稳：
- 难以做程序判断
- 难以在不同工具间复用
- 一旦文本文案调整，下游解析就会碎

因此需要补一个稳定、显式的结构化输出，而不是让调用方去解析控制台文本。

## 目标
- 为 `docs:impact` 增加稳定的结构化输出格式
- 保留现有人类可读输出，不破坏当前维护者工作流
- 让 agent / CI 能直接拿到 changed files、命中规则、已满足项和缺失项

## 非目标
- 不在本轮改写 `req:complete` 的阻断逻辑
- 不在本轮做 JSON Schema 文件、网络接口或 PR comment 集成
- 不在本轮引入更多规则语义或 impact 输出持久化

## 范围
- 涉及目录 / 模块：
  - `scripts/docs-verify.mjs`
  - `scripts/check-governance.mjs`
  - `package.json`
  - `README.md`
  - `CONTRIBUTING.md`
- 影响接口 / 页面 / 脚本：
  - `npm run docs:impact`
  - `npm run docs:impact:json`
  - `node scripts/docs-verify.mjs --impact-only --format json`

## 验收标准
- [x] `docs:impact` 继续保留人类可读输出
- [x] 新增 JSON 结构化输出入口，包含 changed files、triggered rules、missing docs 等核心字段
- [x] JSON 输出和文本输出复用同一份 impact 分析结果，而不是两套逻辑
- [x] README / CONTRIBUTING 说明何时用文本输出，何时用结构化输出
- [x] QA 至少覆盖一组结构化输出通过场景和一组缺失文档场景

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-006-design.md`
- 相关规范：`scripts/docs-verify.mjs`、`package.json`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-006-code-review.md`
- QA：`requirements/reports/REQ-2026-006-qa.md`
- Ship：`requirements/reports/REQ-2026-006-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run docs:impact`
  - `npm run docs:impact:json`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/docs-verify.mjs --impact-only --format json --status-file tmp/docs-impact-missing.status`
- 需要的环境：
  - Node.js
  - Git
- 需要的人工验证：
  - 核对文本和 JSON 输出是否都能表达同一组 impact 结果
  - 核对 README 是否说明 agent / CI 该用 JSON 输出

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - 如果结构化字段设计不稳，后续 agent / CI 会把它当契约依赖，变更成本会上升
  - 如果文本输出和 JSON 输出分叉实现，后续会出现结果不一致
- 回滚方式：
  - 回退 JSON 输出参数、入口脚本和相关文档说明

## 关键决策
- 2026-03-23：MVP 采用同一命令支持 `--format text|json`，同时保留 `docs:impact` 文本入口
- 2026-03-23：额外提供 `npm run docs:impact:json` 作为稳定的 agent / CI 入口
- 2026-03-23：结构化输出只承诺 impact 决策所需的最小字段，不把内部实现细节直接暴露成契约
- 2026-03-23：文本输出与 JSON 输出共享同一份 `analyzeDocsImpact` 结果，避免后续分叉

<!-- Source file: REQ-2026-006-structured-docs-impact-output-mvp.md -->
