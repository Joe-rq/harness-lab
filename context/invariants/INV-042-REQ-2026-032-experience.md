---
id: INV-042
title: 2026-04-02 Experience 文档质量门禁
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
  - glob: "context/experience/**"
confidence: medium
message: |
  ⚠️ INV-042: 2026-04-02 Experience 文档质量门禁
  来源: experience/REQ-2026-032-experience.md
---

## 详细说明

## 问题 / 模式

- **软约束陷阱**：REQ-2026-031 的检查逻辑只看文件名前缀，19 篇日期命名文档被忽略
- **自举悖论**：空骨架文件可以过检查，违背"确保有价值经验被沉淀"的初衷
- **模式复用**：与 REQ-2026-015（空模板 REQ 阻断）完全相同的问题模式，只是对象不同

<!-- 来源: context/experience/REQ-2026-032-experience.md -->