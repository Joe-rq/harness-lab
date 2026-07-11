---
id: INV-070
title: 2026-07-11 路径门禁必须共享分类、canonical containment 与全目标决策
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-070: 2026-07-11 路径门禁必须共享分类、canonical containment 与全目标决策
  来源: experience/REQ-2026-090-canonical-path-write-target-policy.md
---

## 详细说明

## 问题 / 模式

- 字符串前缀不是目录 containment：`/repo-x` 不能被当成 `/repo` 内部。
- lexical normalize 不能识别现有符号链接祖先；不存在目标也要先 realpath 最近现有祖先再拼接尾部。
- 写命令可能包含多个目标；`tee allowed forbidden`、多重重定向或复合命令必须 all-targets-must-pass。

<!-- 来源: context/experience/REQ-2026-090-canonical-path-write-target-policy.md -->