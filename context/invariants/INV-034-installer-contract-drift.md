---
id: INV-034
title: Installer Contract Drift Needs Tests
status: draft
severity: medium
triggers:
  - glob: " / /**"
  - glob: "/harness-setup/**"
confidence: medium
message: |
  ⚠️ INV-034: Installer Contract Drift Needs Tests
  来源: experience/2026-03-29-installer-contract-drift.md
---

## 详细说明

## 复用建议

- 每次治理机制升级时，把“模板仓库入口文档”“示例配置”“安装器产物”当成同一批契约一起验证
- 对安装器增加至少一条“产物验证”测试，而不是只测函数返回值

<!-- 来源: context/experience/2026-03-29-installer-contract-drift.md -->