---
id: INV-069
title: 2026-07-11 公开分发与安装契约必须从真实产物验证
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-069: 2026-07-11 公开分发与安装契约必须从真实产物验证
  来源: experience/REQ-2026-089-distribution-installation-contract.md
---

## 详细说明

## 问题 / 模式

- npm 包名与 bin 名不同，简写 `npx <bin>` 会被误解为另一个包；公开命令必须显式绑定 package 与 bin。
- 如果测试从运行时 manifest 动态生成预期，manifest 与实现一起漏项时测试仍会通过；最低公开契约必须有独立硬编码断言。
- progress、INDEX、REQ、settings 是用户状态，不是可随重装刷新的模板资产。

<!-- 来源: context/experience/REQ-2026-089-distribution-installation-contract.md -->