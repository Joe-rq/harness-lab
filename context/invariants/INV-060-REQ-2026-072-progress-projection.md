---
id: INV-060
title: REQ-2026-072 progress projection 经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-060: REQ-2026-072 progress projection 经验
  来源: experience/REQ-2026-072-progress-projection.md
---

## 详细说明

## 问题 / 模式

- **projection 逻辑要集中**：事件解释规则放在 `event-store.mjs`，入口脚本只消费结果，避免 `session-start` 和 `req:status` 各自实现一套状态机。
- **先回退再替换**：坏事件、无事件或历史项目迁移时，`progress.txt` 继续作为缓存/回退输入。
- **不要提前做聚合**：默认 status 只处理当前 worktree，`--all` 和跨 worktree 聚合留给后续 REQ，否则语义会变复杂。

<!-- 来源: context/experience/REQ-2026-072-progress-projection.md -->