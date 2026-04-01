# REQ-2026-026: 添加错误日志持久化

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前错误信息仅通过 `console.error` 输出到终端，会话结束后无法追溯。对于 Hook 阻断、REQ 流程失败等关键错误，需要持久化记录以便：
- 跨会话诊断问题
- 分析错误模式和频率
- 审计失败原因

## 目标
- 关键错误写入 `.claude/error.log` 文件
- 日志格式包含：时间戳、错误类型、详细信息
- 保持轻量级实现（纯文件，无数据库）

## 非目标
- 不实现日志轮转（小规模使用无需）
- 不实现实时监控告警
- 不改变现有错误输出方式（同时输出终端和文件）

## 范围
- 涉及目录 / 模块：scripts/req-cli.mjs、scripts/req-validation.mjs
- 影响接口 / 页面 / 脚本：fail() 函数、Hook 阻断消息

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（功能明确，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/req-cli.mjs、scripts/req-validation.mjs
- 可新增的测试 / 脚本：.claude/error.log

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本文件
- 不可引入的依赖 / 操作：外部 npm 包

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：小规模功能增强

## 验收标准
- [ ] `fail()` 函数调用时写入错误日志
- [ ] 日志格式包含时间戳、错误类型、详细信息
- [ ] 日志文件路径为 `.claude/error.log`
- [ ] `npm test` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-026-design.md`（豁免）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-026-code-review.md`
- QA：`requirements/reports/REQ-2026-026-qa.md`
- Ship：不需要发布

## 验证计划
- 计划执行的命令：npm test
- 需要的环境：Node.js
- 需要的人工验证：手动测试错误日志写入

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，仅增加日志记录
- 回滚方式：删除日志代码，保留日志文件

## 关键决策
- 2026-04-01：来自评审结论 P2 行动项

<!-- Source file: REQ-2026-026-error-log-persistence.md -->
