---
id: INV-061
title: REQ-2026-073 worktree 事件聚合经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-061: REQ-2026-073 worktree 事件聚合经验
  来源: experience/REQ-2026-073-worktree-event-aggregation.md
---

## 详细说明

## 问题 / 模式

- **聚合是报告，不是合并**：重复 active REQ 只能进入 `conflicts`，不能自动选择赢家。
- **错误要按 worktree 隔离**：一个坏 JSONL 文件不能阻断其他 worktree 的状态展示。
- **`--all` 要保留回退**：没有事件目录时，仍使用原 INDEX active REQ 行为，避免空迁移项目体验倒退。

<!-- 来源: context/experience/REQ-2026-073-worktree-event-aggregation.md -->