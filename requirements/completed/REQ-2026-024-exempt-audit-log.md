# REQ-2026-024: 豁免机制审计日志

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 `.req-exempt` 豁免机制存在信任链漏洞：
- 创建豁免文件时无记录（谁、何时、为什么）
- 删除豁免文件时无记录
- 无法追溯历史上哪些操作绕过了 REQ 强制流程

这导致整个"强制治理"机制存在后门，破坏了审计闭环。

## 目标
- 每次创建豁免时记录时间戳、操作者、原因
- 豁免记录持久化，即使 `.req-exempt` 被删除也能追溯
- 保持轻量级实现（纯文件，无数据库）

## 非目标
- 不实现权限控制（单用户设计）
- 不实现实时监控告警
- 不改变豁免机制的使用方式

## 范围
- 涉及目录 / 模块：scripts/req-cli.mjs、scripts/req-check.js
- 影响接口 / 页面 / 脚本：req:create、req:start、req:complete 命令

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（功能明确，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/req-cli.mjs、scripts/req-check.js
- 可新增的测试 / 脚本：.claude/exempt-audit.log

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本文件
- 不可引入的依赖 / 操作：外部 npm 包

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：小规模改动

## 验收标准
- [ ] 创建 `.req-exempt` 时自动追加审计日志到 `.claude/exempt-audit.log`
- [ ] 日志格式包含：时间戳、操作类型、REQ ID（如有）、原因
- [ ] `req:start` 成功后删除 `.req-exempt` 时追加删除记录
- [ ] 审计日志文件为纯文本，可 Git 追踪
- [ ] `npm test` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-024-design.md`（豁免）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-024-code-review.md`
- QA：`requirements/reports/REQ-2026-024-qa.md`
- Ship：不需要发布

## 验证计划
- 计划执行的命令：npm test
- 需要的环境：Node.js
- 需要的人工验证：手动测试豁免创建和删除流程

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，仅增加日志记录
- 回滚方式：删除审计日志代码，保留日志文件

## 关键决策
- 2026-04-01：来自评审结论 P1 行动项

<!-- Source file: REQ-2026-024-exempt-audit-log.md -->
