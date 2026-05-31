---
id: INV-056
title: REQ-2026-067 duplicate completed REQ ID 修复经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-056: REQ-2026-067 duplicate completed REQ ID 修复经验
  来源: experience/REQ-2026-067-fix-duplicate-completed-req-ids.md
---

## 详细说明

## 问题 / 模式

- **报告编号会误导归属判断**：如果只改 REQ 文件名，不补新编号的 review / QA 报告，审计链仍会把历史证据串到原 063/064。
- **重编号要改完整链路**：REQ 正文、报告链接、experience 文件名、invariant 来源、INDEX 都要一起迁移，否则下次 audit 或人工排查仍会看到旧号残留。
- **baseline warning 不是当前阻断项**：`REQ-2026-032` 仍是 legacy duplicate warning，但不应混入当前 bugfix 范围。

<!-- 来源: context/experience/REQ-2026-067-fix-duplicate-completed-req-ids.md -->