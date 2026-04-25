---
id: INV-088
title: REQ 模板填充时的章节重复问题
status: draft
severity: medium
triggers:
  - glob: " 末尾留有过多空行（或截断位置不当），会将下一个章节的标题行一并包含进 old_string 范围。

结果：
- 新字符串只写了目标章节的内容
- 下一个章节的标题仍留在文件中
- 导致文件中出现两段标题相同或相邻章节重复

## 案例

REQ-2026-023 模板中，"阻塞 / 搁置说明" 有两个相邻实例（第二个是原模板残留），原因是 Edit 时：

/**"
  - glob: "
# 错误做法：old_string 截断位置不当
old_string = """
## 阻塞 /**"
  - glob: "
old_string = """## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无
"""

new_string = """## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无
"""
/**"
confidence: medium
message: |
  ⚠️ INV-088: REQ 模板填充时的章节重复问题
  来源: experience/2026-03-31-req-template-edit-pattern.md
---

## 详细说明

## 问题

在填充 REQ 模板时，使用 `Edit` 工具修改某一章节，如果 `old_string` 末尾留有过多空行（或截断位置不当），会将下一个章节的标题行一并包含进 old_string 范围。

结果：

<!-- 来源: context/experience/2026-03-31-req-template-edit-pattern.md -->