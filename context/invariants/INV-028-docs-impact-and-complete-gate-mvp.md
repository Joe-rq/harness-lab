---
id: INV-028
title: 2026-03-23 Docs Impact And Complete Gate MVP
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: " 时，agent 很容易在实现结束后才第一次知道“还要补文档”
- 如果 complete 阶段不接 gate，REQ 可能在文档义务未清理时就被移入 completed
- 如果 impact / verify /**"
confidence: medium
message: |
  ⚠️ INV-028: 2026-03-23 Docs Impact And Complete Gate MVP
  来源: experience/2026-03-23-docs-impact-and-complete-gate-mvp.md
---

## 详细说明

## 问题 / 模式

- 只有 `docs:verify` 时，agent 很容易在实现结束后才第一次知道“还要补文档”
- 如果 complete 阶段不接 gate，REQ 可能在文档义务未清理时就被移入 completed
- 如果 impact / verify / complete 各自实现一套规则，三者很快会互相漂移

<!-- 来源: context/experience/2026-03-23-docs-impact-and-complete-gate-mvp.md -->