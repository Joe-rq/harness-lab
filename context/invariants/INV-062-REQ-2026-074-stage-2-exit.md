---
id: INV-062
title: REQ-2026-074 Stage 2 退出确认经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-062: REQ-2026-074 Stage 2 退出确认经验
  来源: experience/REQ-2026-074-stage-2-exit.md
---

## 详细说明

## 问题 / 模式

- **退出确认不是新功能**：如果在退出 REQ 里继续加能力，路线就无法收口。
- **证据按 checkpoint 链接**：退出报告要引用每个 checkpoint 的 REQ、报告和经验，而不是只写总结。
- **下一阶段只给入口**：Stage 3 先进入观察/决策门，不直接承诺实现任务图。

<!-- 来源: context/experience/REQ-2026-074-stage-2-exit.md -->