---
id: INV-035
title: 2026-03-29 Governance Contract Parity
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-035: 2026-03-29 Governance Contract Parity
  来源: experience/2026-03-29-governance-contract-parity.md
---

## 详细说明

## 问题 / 模式

- README 精简后丢了治理检查依赖的固定入口文案，导致模板仓库自检失败
- 安装器复制清单落后于实际治理脚本，导致目标项目缺失 `check-governance.mjs`
- 安装器写入的 hook 结构与示例配置不一致，导致“文档契约”和“配置契约”分裂

<!-- 来源: context/experience/2026-03-29-governance-contract-parity.md -->