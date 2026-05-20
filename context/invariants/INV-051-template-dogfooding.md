---
id: INV-051
title: 2026-03-23 Template Dogfooding
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-051: 2026-03-23 Template Dogfooding
  来源: experience/2026-03-23-template-dogfooding.md
---

## 详细说明

## 问题 / 模式

- 只有公开示例时，模板可信度容易停留在“设计完整”，而不是“实践可用”
- 悬空的模板配置（例如不存在的验证脚本）会直接削弱 onboarding 质量
- 目录级导航缺失时，使用者很难知道什么时候该读哪个 skill 或 context 文档

<!-- 来源: context/experience/2026-03-23-template-dogfooding.md -->