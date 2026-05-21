# REQ-2026-063 治理审计 warning 摘要经验

## 场景

当治理框架刚引入更严格的完成态审计时，历史项目通常会产生大量 legacy warning。直接输出完整列表虽然透明，但日常检查时会淹没最关键的问题：有没有 error、warning 是否都是历史债务、主要债务类型是什么。

## 问题或模式

- 全量审计需要完整明细，但默认终端输出更需要快速判断。
- 历史 warning 不应阻断当前工作，也不应被完全隐藏。
- 健康报告如果只给总数，维护者无法判断治理债务的集中方向。

## 根因或关键判断

审计命令应同时服务两类场景：门禁需要稳定的结构化结果，人工需要低噪音摘要。两者应该共用同一份 finding 数据，避免输出优化影响实际门禁。

## 解决方案

- 在 `req-audit` 内统一生成 `summary`，包含 severity、code、legacy/current warning 和 top code。
- all-mode 文本默认展示摘要；`--verbose` 展开完整明细；`--max-findings N` 用于抽样排查。
- `governance:health` 直接复用 audit summary，展示 warning age 和 top finding code。
- JSON 保留 `{ ok, findings }`，额外增加 `summary`，兼容后续自动化消费。

## 后续项目如何复用

- 新增治理检查时，先保证 structured findings 完整，再设计默认人工输出。
- 面向历史仓库启用强规则时，用 legacy/current 摘要降低噪音，而不是批量修改旧交付物。
- 健康报告要展示“问题类型分布”，不要只展示总数。

## 相关交付物

- REQ：`requirements/completed/REQ-2026-063-feat-governance-audit-warning-triage.md`
- Code Review：`requirements/reports/REQ-2026-063-code-review.md`
- QA：`requirements/reports/REQ-2026-063-qa.md`
