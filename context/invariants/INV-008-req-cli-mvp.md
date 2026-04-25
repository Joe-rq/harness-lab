---
id: INV-008
title: 2026-03-23 REQ CLI MVP
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "create / start / block / complete/**"
status: draft
severity: medium
confidence: medium
message: |
  ⚠️ INV-008: 2026-03-23 REQ CLI MVP
  来源: experience/2026-03-23-req-cli-mvp.md
---

## 详细说明

## 问题 / 模式

- `create / start / block / complete` 这四个动作的真实痛点，不在业务逻辑，而在多文件同步
- Markdown 自动更新很容易因为换行风格或空行处理写得太死
- 自动化工具只适合维护结构化字段，不适合伪造自由文本总结

<!-- 来源: context/experience/2026-03-23-req-cli-mvp.md -->