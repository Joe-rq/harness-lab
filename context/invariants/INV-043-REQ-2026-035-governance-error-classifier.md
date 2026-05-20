---
id: INV-043
title: 2026-04-13 错误分类器：结构化治理错误与恢复策略
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-043: 2026-04-13 错误分类器：结构化治理错误与恢复策略
  来源: experience/REQ-2026-035-governance-error-classifier.md
---

## 详细说明

## 问题 / 模式

- **自由文本难解析**：原错误信息无结构，用户需要阅读完整内容才能理解
- **无自动化恢复**：缺少错误代码，无法编写自动化脚本响应特定错误
- **恢复建议缺失**：只告知"失败了"，不告知"怎么办"

<!-- 来源: context/experience/REQ-2026-035-governance-error-classifier.md -->