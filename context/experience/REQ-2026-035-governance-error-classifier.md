# 2026-04-13 错误分类器：结构化治理错误与恢复策略

## 场景

harness-lab 的治理 Hook（`req-check.sh`、`req-validation.mjs`）原本只有两种输出：`exit 0`（通过）和 `exit 2`（阻断）。阻断时的错误信息是自由文本，用户难以快速定位问题，也无法编写自动化恢复脚本。

借鉴 hermes-agent 的 `error_classifier.py` 设计，引入结构化错误分类器，定义 8 种错误类型，每种包含错误代码、类型、描述和恢复策略。

## 关联材料

- REQ: `requirements/completed/REQ-2026-035-governance-error-classifier.md`
- Design: `docs/plans/REQ-2026-035-design.md`
- Code Review: `requirements/reports/REQ-2026-035-code-review.md`
- QA: `requirements/reports/REQ-2026-035-qa.md`

## 问题 / 模式

- **自由文本难解析**：原错误信息无结构，用户需要阅读完整内容才能理解
- **无自动化恢复**：缺少错误代码，无法编写自动化脚本响应特定错误
- **恢复建议缺失**：只告知"失败了"，不告知"怎么办"
- **日志不可审计**：错误日志格式不统一，难以统计分析

## 关键决策

- **决策 1：使用 Node.js 模块而非 bash**：核心错误分类逻辑放在 `error-classifier.mjs`，便于测试和复用，bash 脚本通过 `node` 命令调用

- **决策 2：保持向后兼容**：Hook 的 exit code 不变（0/2），输出格式增强而非替换，不破坏现有流程

- **决策 3：错误代码使用 E 前缀 + 三位数字**：`E001`-`E008`，预留扩展空间，格式统一便于解析

- **决策 4：错误块使用 Unicode 边框**：视觉清晰，易于区分普通输出和错误信息

## 解决方案

1. **定义错误类型**：在 `error-classifier.mjs` 中定义 `ErrorTypes` 对象，每种错误包含 code、type、title、message、recovery

2. **格式化错误块**：`formatErrorBlock()` 函数生成统一的错误输出格式，包含错误代码、类型、描述和恢复策略

3. **结构化日志**：`logError()` 函数记录错误到 `.claude/error.log`，格式：`timestamp | code | type | detail`

4. **改造现有脚本**：
   - `req-check.sh`：调用 `node error-classifier.mjs --type NO_ACTIVE_REQ`
   - `req-validation.mjs`：导入并使用 `formatErrorBlock()`
   - `req-cli.mjs`：complete 命令错误使用结构化格式

5. **测试覆盖**：新增两个测试用例验证错误块格式和日志格式

## 复用建议

- **新增错误类型**：在 `ErrorTypes` 对象中添加新条目，code 使用 E009、E010...
- **CI 集成**：可解析错误日志中的错误代码，触发特定告警或恢复流程
- **JSON 输出**：未来可添加 `--json` 参数，输出结构化 JSON 供程序消费
- **多语言支持**：错误消息可扩展为多语言版本，根据环境变量选择

## 相关经验

- hermes-agent 的 `error_classifier.py` 设计（本次借鉴来源）
- harness-lab 的 `exempt-audit.log` 审计日志格式
