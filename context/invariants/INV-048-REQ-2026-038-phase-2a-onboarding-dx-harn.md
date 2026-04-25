---
id: INV-048
title: 2026-04-25 Phase 2A: Onboarding DX — harness-doctor and firs
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/commands/**"
  - glob: "skills/**"
confidence: medium
message: |
  ⚠️ INV-048: 2026-04-25 Phase 2A: Onboarding DX — harness-doctor and firs
  来源: experience/REQ-2026-038-phase-2a-onboarding-dx-harness-doctor-and-first-req-wizard.md
---

## 详细说明

## 问题 / 模式

- settings.local.json 的 hooks 结构不是简单的数组，而是嵌套对象 `{ SessionStart: [{ matcher, hooks: [{ command }] }] }`，初始代码按数组解析导致 TypeError
- harness-doctor 与 harness-setup 边界需要明确：setup 是安装（一次性），doctor 是体检（随时可跑）
- slash command 只能在交互式 Claude Code 环境中测试，自动化测试无法覆盖

<!-- 来源: context/experience/REQ-2026-038-phase-2a-onboarding-dx-harness-doctor-and-first-req-wizard.md -->