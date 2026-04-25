---
id: INV-062
title: REQ Ready != REQ Exists
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-062: REQ Ready != REQ Exists
  来源: experience/2026-03-29-req-readiness-vs-existence.md
---

## 详细说明

## 复用建议

- 新增治理门禁时，优先识别“存在”和“准备就绪”是不是两个不同层级
- 如果一个约束同时存在于 hook、CLI、CI 中，应优先抽成共享规则，而不是各自复制一份判断

<!-- 来源: context/experience/2026-03-29-req-readiness-vs-existence.md -->