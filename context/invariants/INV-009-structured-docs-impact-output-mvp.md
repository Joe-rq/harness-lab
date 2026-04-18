---
id: INV-009
title: 2026-03-23 Structured Docs Impact Output MVP
triggers:
  - glob: " 已经能让人看到当前文档义务，但 agent / CI 不适合解析控制台文本。

## 关联材料

- REQ：/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "requirements/completed/**"
confidence: medium
message: |
  ⚠️ INV-009: 2026-03-23 Structured Docs Impact Output MVP
  来源: experience/2026-03-23-structured-docs-impact-output-mvp.md
---

## 详细说明

## 问题 / 模式

- 纯文本 impact 输出对人友好，但对自动化脆弱
- 如果文本 / JSON / complete gate 各自维护一套逻辑，最终一定会出现漂移
- 结构化输出一旦被下游消费，就会自然变成契约

<!-- 来源: context/experience/2026-03-23-structured-docs-impact-output-mvp.md -->