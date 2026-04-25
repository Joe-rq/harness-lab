---
id: INV-NNN
title: "一句话描述不变量"
status: draft          # draft → active → deprecated
severity: medium       # low | medium | high | critical
triggers:
  - glob: "path/to/files/**"
verification: "如何验证此不变量是否被遵守"
confidence: medium     # low | medium | high — 提取置信度
message: |
  ⚠️ INV-NNN: 触发时的提醒文本
  说明具体要检查什么、为什么重要。
---

## 详细说明

描述不变量的上下文、违反后果、检查清单。

## 检查清单

- [ ] 检查项 1
- [ ] 检查项 2

<!-- 来源: context/experience/YYYY-MM-DD-xxx.md -->
