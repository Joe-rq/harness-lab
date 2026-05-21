---
id: INV-104
title: REQ-2026-064 invariant incremental 来源去重经验
status: draft
severity: medium
triggers:
  - glob: "context/experience/**"
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-104: REQ-2026-064 invariant incremental 来源去重经验
  来源: experience/REQ-2026-064-invariant-incremental-source-dedup.md
---

## 详细说明

## 问题或模式

- 已有 invariant 里记录的来源通常是 `experience/foo.md` 或 `context/experience/foo.md`。
- incremental scan 比较时使用的是裸文件名 `foo.md`。
- 两边格式不一致，导致已处理 experience 仍被当成新来源。

<!-- 来源: context/experience/REQ-2026-064-invariant-incremental-source-dedup.md -->