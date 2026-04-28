---
id: INV-047
title: 2026-04-13 错误分类器：结构化治理错误与恢复策略
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: " 命令调用

- **决策 2：保持向后兼容**：Hook 的 exit code 不变（0/2），输出格式增强而非替换，不破坏现有流程

- **决策 3：错误代码使用 E 前缀 + 三位数字**：/**"
confidence: medium
message: |
  ⚠️ INV-047: 2026-04-13 错误分类器：结构化治理错误与恢复策略
  来源: experience/REQ-2026-035-governance-error-classifier.md
---

## 详细说明

## 问题 / 模式

- **自由文本难解析**：原错误信息无结构，用户需要阅读完整内容才能理解
- **无自动化恢复**：缺少错误代码，无法编写自动化脚本响应特定错误
- **恢复建议缺失**：只告知"失败了"，不告知"怎么办"

<!-- 来源: context/experience/REQ-2026-035-governance-error-classifier.md -->