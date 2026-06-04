---
id: INV-064
title: 2026-06-04 Worktree 事件路径命名空间隔离
status: draft
severity: medium
triggers:
  - glob: ".claude/**"
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-064: 2026-06-04 Worktree 事件路径命名空间隔离
  来源: experience/REQ-2026-076-worktree-namespace-isolation.md
---

## 详细说明

## 问题 / 模式

- 只在事件 payload 里写 `worktree` 不等于隔离;文件路径仍共享时,并行写入和后续审计都会混在一起。
- 迁移 append-only 日志路径时,读端必须比写端更宽:新写入走新路径,读取同时兼容旧路径和 archive。
- main worktree 最容易被重复显示:旧 `.claude/events` 和新 `.claude/worktrees/main/events` 必须在 projection 层合并。

<!-- 来源: context/experience/REQ-2026-076-worktree-namespace-isolation.md -->