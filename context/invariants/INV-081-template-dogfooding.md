---
id: INV-081
title: 2026-03-23 Template Dogfooding
status: draft
severity: medium
triggers:
  - glob: " 作为治理模板仓库，需要证明自己也能按同一套 REQ / 设计 / 报告机制推进变更，而不是只提供公开示例。

## 关联材料

- REQ：/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "blocked / suspended/**"
confidence: medium
message: |
  ⚠️ INV-081: 2026-03-23 Template Dogfooding
  来源: experience/2026-03-23-template-dogfooding.md
---

## 详细说明

## 问题 / 模式

- 只有公开示例时，模板可信度容易停留在“设计完整”，而不是“实践可用”
- 悬空的模板配置（例如不存在的验证脚本）会直接削弱 onboarding 质量
- 目录级导航缺失时，使用者很难知道什么时候该读哪个 skill 或 context 文档

<!-- 来源: context/experience/2026-03-23-template-dogfooding.md -->