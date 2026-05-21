---
id: INV-102
title: REQ-2026-062 治理框架审计与安装器安全化经验
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-102: REQ-2026-062 治理框架审计与安装器安全化经验
  来源: experience/REQ-2026-062-governance-framework-audit-and-installer-hardening.md
---

## 详细说明

## 问题或模式

- completed REQ 不能只看文件位置，内部状态、标题 ID、source marker 和报告链接都需要一致。
- “测试通过”如果只写在结论里，后续无法判断命令、环境、人工验证是否真实发生。
- 安装器不能按编号范围清理目标项目文件，模板示例和目标项目真实历史必须可区分。

<!-- 来源: context/experience/REQ-2026-062-governance-framework-audit-and-installer-hardening.md -->