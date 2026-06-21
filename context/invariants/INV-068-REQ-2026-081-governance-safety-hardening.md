---
id: INV-068
title: 2026-06-10 Governance safety hardening
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-068: 2026-06-10 Governance safety hardening
  来源: experience/REQ-2026-081-governance-safety-hardening.md
---

## 详细说明

## 问题 / 模式

- hook 配置和风险规则是两套表，人工同步容易漏项。
- `.js` / `.mjs` 后缀差异会让脚本落入较低风险通配规则，例如 `session-start.js` 被普通源码规则覆盖。
- 重复调用 `git rev-parse` 这类小成本操作，在 PostToolUse 高频路径上会变成持续噪声。

<!-- 来源: context/experience/REQ-2026-081-governance-safety-hardening.md -->