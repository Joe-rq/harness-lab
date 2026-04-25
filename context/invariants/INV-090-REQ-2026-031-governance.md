---
id: INV-090
title: 2026-04-01 Governance: 强制经验沉淀闭环
status: draft
severity: medium
triggers:
  - glob: "context/experience/**"
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-090: 2026-04-01 Governance: 强制经验沉淀闭环
  来源: experience/REQ-2026-031-governance.md
---

## 详细说明

## 问题 / 模式

- **软约束陷阱**："如有复用价值"这种措辞在实践中几乎等于 optional
- **无校验机制**：`req:complete` 只检查报告，不检查经验文档
- **高摩擦**：没有生成器，创建经验文档需要手动复制模板、命名、填充

<!-- 来源: context/experience/REQ-2026-031-governance.md -->