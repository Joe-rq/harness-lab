---
id: INV-053
title: 2026-03-23 Docs Quality Gate MVP
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-053: 2026-03-23 Docs Quality Gate MVP
  来源: experience/2026-03-23-docs-quality-gate-mvp.md
---

## 详细说明

## 问题 / 模式

- 只做结构检查时，README、命令名和本地路径引用可以过期而不被拦截
- 第一版规则如果不区分“核心文档”和“模板占位符 / 研究文档”，会产生大量误报
- 在治理检查里起子进程调用另一个 Node 脚本，在当前环境下不稳定

<!-- 来源: context/experience/2026-03-23-docs-quality-gate-mvp.md -->