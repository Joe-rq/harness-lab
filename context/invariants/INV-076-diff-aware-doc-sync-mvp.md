---
id: INV-076
title: 2026-03-23 Diff-aware Doc Sync MVP
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-076: 2026-03-23 Diff-aware Doc Sync MVP
  来源: experience/2026-03-23-diff-aware-doc-sync-mvp.md
---

## 详细说明

## 问题 / 模式

- 直接在 Node 里起子进程读 git diff，在当前 sandbox 环境会遇到 `spawnSync git EPERM`
- 仅靠静态文档 lint，无法判断这次 changed files 是否应该联动更新入口文档
- 把规则硬编码在脚本里，可维护性会迅速恶化

<!-- 来源: context/experience/2026-03-23-diff-aware-doc-sync-mvp.md -->