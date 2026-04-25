---
id: INV-073
title: 2026-04-25 Phase 2B: specialized REQ slash commands (bugfix/
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
  - glob: "skills/req/**"
  - glob: ".claude/commands/**"
confidence: medium
message: |
  ⚠️ INV-073: 2026-04-25 Phase 2B: specialized REQ slash commands (bugfix/
  来源: experience/REQ-2026-039-phase-2b-specialized-req-slash-commands-bugfix-feature-refactor.md
---

## 详细说明

## 问题 / 模式

- **模板源分裂风险**：`REQ_TEMPLATE.md` 是参考文档，`req-cli.mjs` 的 `buildReqContent()` 是实际执行的硬编码模板，两者已不同步（缺少颗粒度自检和反馈与质量检查章节）。如果再引入第三个模板源会失控
- **INV-039 章节重复**：用 Edit 逐节替换 REQ 模板时，`old_string` 捕获下一节标题导致章节丢失。解决方案：Write 重写整个文件
- **REQ 路线图原方案路径问题**：路线图写 `skills/req/bugfix.md`，但实际 slash command 在 `.claude/commands/`，两套路径会让人混乱

<!-- 来源: context/experience/REQ-2026-039-phase-2b-specialized-req-slash-commands-bugfix-feature-refactor.md -->