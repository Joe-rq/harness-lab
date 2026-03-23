# 2026-03-23 REQ CLI MVP

## 场景

Harness Lab 的协议已经固定了 REQ、INDEX 和 progress 的职责，但生命周期推进仍靠手工编辑多个文件。

## 关联材料

- REQ：`requirements/completed/REQ-2026-002-req-lifecycle-cli-mvp.md`
- Design：`docs/plans/REQ-2026-002-design.md`
- Code Review：`requirements/reports/REQ-2026-002-code-review.md`
- QA：`requirements/reports/REQ-2026-002-qa.md`

## 问题 / 模式

- `create / start / block / complete` 这四个动作的真实痛点，不在业务逻辑，而在多文件同步
- Markdown 自动更新很容易因为换行风格或空行处理写得太死
- 自动化工具只适合维护结构化字段，不适合伪造自由文本总结

## 解决方案

1. 先把 CLI 范围压到四个最常见命令，不把 report 自动落盘塞进第一版。
2. 在脚本内部统一把文件内容规范化为 `\n`，避免 CRLF / LF 差异影响正则匹配。
3. section 重写时显式保留标题之间的空行，不只验证“字段对了”，还要保证可读性没坏。
4. `progress.txt` 只维护头部状态和 CLI 管理行，人工总结继续手写。
5. 自动编号默认忽略 `900+` 的公开示例号段，让真实 REQ 和示例 REQ 分开。

## 复用建议

- 以后再做 hooks、CI 或 MCP 时，优先复用同一套 Markdown 更新原语
- 任何自动改 Markdown 的工具，都要至少跑一次真实仓库和一次临时仓库 smoke
- 如果要支持多活跃 REQ，先改 INDEX / progress 的协议，再改 CLI
