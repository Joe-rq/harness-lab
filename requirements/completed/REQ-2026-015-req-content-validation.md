# REQ-2026-015: REQ 内容有效性验证

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
在 agent-flow-lite 项目测试中发现，AI 可以先执行 `req:create` 生成骨架 REQ，再在没有填写真实背景、目标、验收标准的情况下继续推进实施。此前 `req-check.sh` 只检查是否存在活跃 REQ 编号，没有验证 REQ 内容是否仍是模板；同时 `req:start` 也没有阻止空模板 REQ 进入 `in-progress`。结果是“REQ 已创建”被误当成“REQ 已被真正使用”。

## 目标
- 增强 REQ 校验逻辑，识别关键章节中的模板占位符
- 阻止空模板 REQ 通过 `PreToolUse` hook 进入写入流程
- 阻止空模板 REQ 通过 `req:start` 进入 `in-progress`
- 保持已写实 REQ 的正常启动与实施路径

## 非目标
- 不修改 REQ 模板结构
- 不改变 REQ 生命周期约定

## 范围
- 涉及目录 / 模块：`scripts/req-check.sh`、`scripts/req-cli.mjs`、共享校验逻辑、相关测试与入口文档
- 影响接口 / 页面 / 脚本：PreToolUse hook、`npm run req:start`

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-check.sh`、`scripts/req-cli.mjs`、相关入口文档、当前 REQ 文档
- 可新增的测试 / 脚本：共享 REQ 校验脚本、治理测试

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：REQ 模板结构
- 不可引入的依赖 / 操作：新增外部依赖

**边界条件**：
- 时间 / 环境 / 数据约束：本仓库先落地治理机制；agent-flow-lite 同步作为后续接入动作记录
- 改动规模或发布边界：仅增强治理验证逻辑，不改变 REQ 模板结构

## 验收标准
- [x] `PreToolUse` 会阻止包含模板占位符的活跃 REQ 继续写入
- [x] `PreToolUse` 会阻止 `draft` 状态的活跃 REQ 继续写入
- [x] `req:start` 会拒绝启动仍包含模板占位符的 REQ
- [x] 自动化测试覆盖共享校验逻辑和 `req:start` 失败路径
- [x] 入口文档明确说明“创建 REQ 骨架”不等于“REQ 已可实施”

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-015-design.md`
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-015-code-review.md`
- QA：`requirements/reports/REQ-2026-015-qa.md`
- Ship：不适用（治理框架内部增强）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 手动测试：创建模板 REQ 后尝试 `req:start` 与写入
- 需要的环境：Node.js、Git、Bash
- 需要的人工验证：确认模板 REQ 在 start 与 hook 两条路径都被正确拦截

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：新增验证可能误判有效的 REQ
- 回滚方式：恢复原有 req-check.sh

## 关键决策
- 2026-03-29：将“空模板 REQ”定义为关键章节仍保留模板占位符，而不只看 REQ 编号是否存在
- 2026-03-29：`req:start` 与 `PreToolUse` 复用同一套内容校验，避免两条治理链路标准不一致
- 2026-03-29：agent-flow-lite 的同步更新不并入本 REQ 验收，避免跨仓库状态混淆

<!-- Source file: REQ-2026-015-req-content-validation.md -->
