---
id: INV-067
title: 2026-06-10 Fix scope guard enforcement and hook installation
status: draft
severity: medium
triggers:
  - glob: ".claude/**"
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: "requirements/reports/**/**"
confidence: medium
message: |
  ⚠️ INV-067: 2026-06-10 Fix scope guard enforcement and hook installation
  来源: experience/REQ-2026-082-fix-scope-guard-enforcement-and-hook-installation-drift.md
---

## 详细说明

## 问题 / 模式

- 本地模板仓库能力和安装器分发能力可能漂移：源仓库自己安全，但目标项目仍拿到旧级别防护。
- `req-check` 只能证明 REQ 存在且可实施，不能证明本次写入符合 REQ 的 CAN/CANNOT。
- “无 scope 声明则放行”的向后兼容策略遇到只读 REQ 时会变成漏洞，应对明确只读边界 fail-closed。

<!-- 来源: context/experience/REQ-2026-082-fix-scope-guard-enforcement-and-hook-installation-drift.md -->