---
id: INV-044
title: 2026-04-25 Phase 1: invariant quality gate, lifecycle, and i
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-044: 2026-04-25 Phase 1: invariant quality gate, lifecycle, and i
  来源: experience/REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md
---

## 详细说明

## 问题 / 模式

- **自动扫描候选质量低**：INV-005~024 全部带日期前缀标题、message 只是来源复读，无实质提醒内容。自动 --scan 生成的 21 条候选，只有 3 条手工种子（INV-001~003）质量达标
- **req:start 的 Scope Control 标题必须精确匹配**：写 `### 约束（Scope Control）` 不行，必须写 `### 约束（Scope Control，可选）`，否则 hasExemption 找不到节，skip-design-validation 不生效
- **checkbox 格式**：豁免字段必须用 `- [x] skip-design-validation`，不能用 `- skip-design-validation: xxx`

<!-- 来源: context/experience/REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md -->