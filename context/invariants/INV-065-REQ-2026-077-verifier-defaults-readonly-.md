---
id: INV-065
title: REQ-2026-077 verifier 默认值与 envelope 只读边界经验
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-065: REQ-2026-077 verifier 默认值与 envelope 只读边界经验
  来源: experience/REQ-2026-077-verifier-defaults-readonly-boundary.md
---

## 详细说明

## 问题 / 模式

- 默认值必须集中声明,尤其是跨多个 CLI 入口的环境变量。
- "生成 verifier envelope"不能伪装成审查通过;它是 handoff package,不是 pass/fail report。
- 只读边界可以拆成两层验证:runtime 物理权限由历史实测证明,默认本地路径则用自动化测试证明不会执行命令或启动外部 CLI。

<!-- 来源: context/experience/REQ-2026-077-verifier-defaults-readonly-boundary.md -->