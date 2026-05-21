---
id: INV-103
title: REQ-2026-063 治理审计 warning 摘要经验
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-103: REQ-2026-063 治理审计 warning 摘要经验
  来源: experience/REQ-2026-063-governance-audit-warning-triage.md
---

## 详细说明

## 问题或模式

- 全量审计需要完整明细，但默认终端输出更需要快速判断。
- 历史 warning 不应阻断当前工作，也不应被完全隐藏。
- 健康报告如果只给总数，维护者无法判断治理债务的集中方向。

<!-- 来源: context/experience/REQ-2026-063-governance-audit-warning-triage.md -->