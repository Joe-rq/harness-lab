---
id: INV-003
title: Edit 截断导致章节重复
triggers:
  - glob: "requirements/**/*.md"
confidence: high
message: |
  ⚠️ INV-003: Edit 工具 old_string 末尾多余空行会吞掉下一章节标题，导致重复
  预防：Edit 后立即 Read 验证文件结构完整性。
  来源: experience/2026-03-31-req-template-edit-pattern.md
---

## 详细说明

使用 Edit 工具修改 REQ 模板时，如果 old_string 末尾留有过多空行（或截断位置不当），
会将下一个章节的标题行一并包含进替换范围。结果：文件中出现两段标题相同或相邻章节重复。

**正确做法**：
1. Edit 前 Read 确认当前文件状态
2. old_string 精确匹配，**避免用多行空行作为截断点**
3. Edit 后 Read 验证章节结构完整
4. 替代方案：小文件直接用 Write 重写整体

<!-- 来源: context/experience/2026-03-31-req-template-edit-pattern.md -->
