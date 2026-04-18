---
id: INV-011
title: 2026-03-28 Scope Control Template Sync
triggers:
  - glob: "requirements/**"
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-011: 2026-03-28 Scope Control Template Sync
  来源: experience/2026-03-28-scope-control-template-sync.md
---

## 详细说明

## 问题 / 模式

- 在 Harness Lab 里，REQ 骨架既存在于 `REQ_TEMPLATE.md`，也存在于 `scripts/req-cli.mjs`
- 如果只更新模板，不更新 CLI，维护者通过 `req:create` 生成的仍然会是旧协议
- 仅更新模板还不够，review skill 和入口文档也需要解释新字段何时使用，否则字段会退化成隐形约定

<!-- 来源: context/experience/2026-03-28-scope-control-template-sync.md -->