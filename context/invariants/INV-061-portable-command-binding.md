---
id: INV-061
title: 2026-03-29 Portable Command Binding
status: draft
severity: medium
triggers:
  - glob: "lint / test / build / verify/**"
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-061: 2026-03-29 Portable Command Binding
  来源: experience/2026-03-29-portable-command-binding.md
---

## 详细说明

## 问题 / 模式

- 只靠 README 提醒“请手动绑定真实命令”，接入体验仍会卡在最后一步
- 如果目标项目已有标准脚本名，却没有被自动复用，就是纯粹的机械摩擦
- 如果目标项目没有真实命令，也不能静默成功；必须给出统一 placeholder 和明确缺口

<!-- 来源: context/experience/2026-03-29-portable-command-binding.md -->