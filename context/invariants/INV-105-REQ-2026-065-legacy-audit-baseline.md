---
id: INV-105
title: REQ-2026-065 legacy audit baseline 经验
status: draft
severity: medium
triggers:
  - glob: "requirements/**"
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-105: REQ-2026-065 legacy audit baseline 经验
  来源: experience/REQ-2026-065-legacy-audit-baseline.md
---

## 详细说明

## 问题或模式

- 历史 warning 需要可见，但不应该淹没新增问题。
- 基线如果改变 pass/fail 语义，就会变成隐性豁免。
- 健康报告需要回答“是否比已知债务更糟”，而不仅是“现在有多少 warning”。

<!-- 来源: context/experience/REQ-2026-065-legacy-audit-baseline.md -->