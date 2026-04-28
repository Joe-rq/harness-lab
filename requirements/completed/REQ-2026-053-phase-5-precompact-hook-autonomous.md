# REQ-2026-053: Phase 5 集成验证 — PreCompact hook + autonomous 端到端

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 5.1-5.6 已全部完成，但路线图 Phase 5 有一条集成级退出标准未验证：

> "AI 能在 autonomous 模式下完成 1 个完整 REQ，期间遇到至少 1 次异常（测试失败 / lint 错误 / 范围冲突）并成功自恢复，无需人工干预"

同时，路线图全局架构图中 PreCompact hook 是唯一标记为 ❌ 的 hook 阶段。本 REQ 同时解决这两个问题：用 PreCompact hook 作为验证任务，在 autonomous 模式下完成全流程。

## 目标
- 实现 PreCompact hook：在上下文压缩前注入关键状态摘要，防止压缩丢失 REQ 进度
- 在 autonomous 模式下端到端完成本 REQ，验证 Phase 5 自恢复能力
- 记录全流程的 hook 触发情况和异常响应

## 非目标
- 不做 PreCompact hook 之外的新 hook
- 不修改现有 hook 的核心逻辑
- 不做跨项目共享（Phase 6 内容）

## 颗粒度自检
- [x] 目标数 ≤ 4？3 个目标
- [x] 涉及文件数 ≤ 4？3 个文件（precompact-notify.mjs + settings.local.json + session-start.sh 统计）
- [x] 涉及模块/目录 ≤ 4？2 个（scripts/ + .claude/）
- [x] 能否用一句话描述"解决了什么问题"？上下文压缩时丢失 REQ 进度，PreCompact hook 注入摘要防止丢失
- [x] 如果失败，能否干净回滚？删除 hook 脚本 + 移除 settings 配置即可

## 范围
- 涉及目录 / 模块：scripts/、.claude/
- 影响接口 / 页面 / 脚本：session-start.sh（显示 PreCompact 状态）

### 约束（Scope Control，可选）
- [x] skip-design-validation

> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/precompact-notify.mjs（新建）、.claude/settings.local.json、scripts/session-start.sh
- 可新增的测试 / 脚本：PreCompact hook 脚本

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：现有 hook 脚本的核心逻辑（watchdog、risk-tracker 等）
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：必须在 autonomous 模式下完成
- 改动规模或发布边界：≤ 3 文件改动

## 验收标准
- [ ] PreCompact hook 注册到 settings.local.json，在上下文压缩前注入 REQ 进度摘要
- [ ] 压缩注入内容包含：当前 REQ ID、阶段、进度、未完成项
- [ ] session-start.sh 显示 PreCompact hook 覆盖状态
- [ ] autonomous 模式下完成全流程，记录 hook 触发日志
- [ ] 期间遇到至少 1 次异常并成功自恢复

## 设计与实现链接
- 设计稿：无（实现简单，无需独立设计稿）
- 相关规范：路线图全局架构图 PreCompact 行

## 报告链接
- Code Review：`requirements/reports/REQ-2026-053-code-review.md`
- QA：`requirements/reports/REQ-2026-053-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`、手动触发 PreCompact hook 测试
- 需要的环境：harness-lab 仓库，autonomous 模式
- 需要的人工验证：确认注入内容格式正确

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现
- [ ] 旧功能保护
- [ ] 逻辑正确性
- [ ] 完整性
- [ ] 可维护性

#### 对齐检查（record 阶段）
- [ ] 目标对齐
- [ ] 设计对齐
- [ ] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：PreCompact hook 执行超时影响压缩体验
- 回滚方式：删除 scripts/precompact-notify.mjs + 移除 settings.local.json 中 PreCompact 配置

## 关键决策
- 2026-04-28：用 PreCompact hook 作为 Phase 5 集成验证的载体任务

<!-- Source file: REQ-2026-053-phase-5-precompact-hook-autonomous.md -->
