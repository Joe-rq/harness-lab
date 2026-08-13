---
id: INV-071
title: 2026-07-11 首次用户旅程必须同时验证命名、真实命令与独立安装基线
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-071: 2026-07-11 首次用户旅程必须同时验证命名、真实命令与独立安装基线
  来源: experience/REQ-2026-091-executable-first-user-journey.md
---

## 详细说明

## 问题 / 模式

- 人类语言标题与文件系统 slug 是两个问题；不能要求用户为了创建需求先翻译标题。
- 显式 slug 是文件路径输入，必须在写入前严格校验，不能对 traversal 或空白做静默“修正”。
- 识别到 Python/Go/Rust 不等于对应测试工具已配置；候选命令与真实验证证据必须分开。

<!-- 来源: context/experience/REQ-2026-091-executable-first-user-journey.md -->