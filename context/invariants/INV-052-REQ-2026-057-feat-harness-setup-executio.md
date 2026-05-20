---
id: INV-052
title: 2026-05-11 feat: harness setup execution optimization
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-052: 2026-05-11 feat: harness setup execution optimization
  来源: experience/REQ-2026-057-feat-harness-setup-execution-optimization.md
---

## 详细说明

## 问题 / 模式

- 安装目标目录和 package scripts 绑定位置不能默认等同；治理文件应该在 Git 根，业务 npm scripts 可能在子目录 package。
- 子目录 package 里不能直接写 `node scripts/req-cli.mjs`，因为 npm script 的 cwd 是 package 目录，治理 CLI 会把子目录误判为根。
- “默认安装”容易被用户理解成“完整镜像”，报告必须把未安装项和原因写清楚。

<!-- 来源: context/experience/REQ-2026-057-feat-harness-setup-execution-optimization.md -->