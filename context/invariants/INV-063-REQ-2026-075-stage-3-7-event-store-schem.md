---
id: INV-063
title: 2026-06-04 Stage 3 §7 评估表口径定义 + event-store schema 扩展
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/events/**"
confidence: medium
message: |
  ⚠️ INV-063: 2026-06-04 Stage 3 §7 评估表口径定义 + event-store schema 扩展
  来源: experience/REQ-2026-075-stage-3-7-event-store-schema.md
---

## 详细说明

## 问题 / 模式

- 决策表如果没有数据口径，后续一定会退化成“凭感觉填表”，即使表格看起来很治理化。
- append-only event log 很容易先只记录 lifecycle，等到需要分析失败率、拦截率、冲突次数时才发现没有遥测。
- 给事件加 `version` 后，写入端可以严格，读取端需要对旧数据局部兼容，否则一次 schema 扩展会把历史账本变成不可读。

<!-- 来源: context/experience/REQ-2026-075-stage-3-7-event-store-schema.md -->