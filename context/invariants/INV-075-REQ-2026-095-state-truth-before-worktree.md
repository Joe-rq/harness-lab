---
id: INV-075
title: 2026-07-12 跨 worktree 聚合前先定义状态事实
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-075: 2026-07-12 跨 worktree 聚合前先定义状态事实
  来源: experience/REQ-2026-095-state-truth-before-worktree-aggregation.md
---

## 详细说明

## 复用建议

- 在增加“全局状态”前，先为每类数据写清 authority、scope 与 fallback，否则全局视图只会汇总矛盾。
- 跨 checkout 测试必须创建真实 Git worktree 并通过真实 writer 产生数据；手工目录 fixture 只能验证解析器。
- macOS 临时目录存在 `/var` 与 `/private/var` 别名，涉及 checkout identity 或 root 比较时使用 canonical real path。

<!-- 来源: context/experience/REQ-2026-095-state-truth-before-worktree-aggregation.md -->