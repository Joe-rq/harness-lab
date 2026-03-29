# REQ-2026-018: req:complete 强制检查报告文件存在

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前治理框架存在验证盲区：
- `req:complete` 不检查 code-review 和 qa 报告是否存在
- AI 可以跳过报告直接完成 REQ
- 报告内容为空或只有标题也能通过

这导致治理框架只验证"形式完整性"，而非"流程完整性"。

## 目标
- 在 `req:complete` 中添加报告文件存在检查
- 缺少 code-review 或 qa 报告时阻止完成
- 提示用户创建缺失的报告

## 非目标
- 不检查报告内容是否有效（方案 2/3 超出治理模板职责）
- 不自动生成报告
- 不绑定实际验证命令

## 范围
- 涉及目录 / 模块：`scripts/req-cli.mjs`
- 影响接口 / 页面 / 脚本：`req:complete` 命令行为

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-cli.mjs`、`tests/governance.test.mjs`
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：需同步到 agent-flow-lite
- 改动规模或发布边界：仅增加报告检查逻辑

## 验收标准
- [x] 缺少 code-review 报告时 `req:complete` 被阻止
- [x] 缺少 qa 报告时 `req:complete` 被阻止
- [x] 测试用例更新适配新逻辑

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-018-design.md`（不适用，小改动）
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-018-code-review.md`
- QA：`requirements/reports/REQ-2026-018-qa.md`
- Ship：不适用（治理框架内部增强）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run check:governance`
- 需要的环境：Node.js
- 需要的人工验证：确认缺少报告时 `req:complete` 被阻止

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：某些特殊 REQ 可能不需要某类报告
- 回滚方式：移除报告检查逻辑

## 关键决策
- 2026-03-29：只检查报告存在，不检查内容（方案 1：最小改动）
- 2026-03-29：如果报告类型不适用，用户需创建文件并说明原因

<!-- Source file: REQ-2026-018-req-complete-report-check.md -->
