---
id: INV-002
title: 存在不等于就绪：占位符逃逸
triggers:
  - glob: "requirements/**/*.md"
  - glob: "context/experience/*.md"
confidence: high
message: |
  ⚠️ INV-002: 检查是否残留模板占位符（如 {描述...}、"说明为什么要做这件事"、"目标 1"）
  模板骨架通过结构检查但功能上为空，是治理系统最常见的自欺。
  来源: experience/2026-03-29-req-readiness-vs-existence.md
---

## 详细说明

"存在"（文件已创建）≠"就绪"（内容已填充）。req:create 生成骨架后，
如果背景、目标、验收标准仍包含模板占位符，则 REQ 是"伪就绪"。

同样的问题出现在 experience 文档中：骨架存在但内容为空。

**预防**：
- Edit 填充后立即 Read 验证，确认无残留占位符
- 注意 Edit 的 old_string 截断不当会导致章节重复（INV-003）

<!-- 来源: context/experience/2026-03-29-req-readiness-vs-existence.md, REQ-2026-032-experience.md, 2026-03-31-req-template-edit-pattern.md -->
