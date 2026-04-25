---
id: INV-034
title: 2026-03-29 Governance Automation Gate
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "scripts/**"
confidence: medium
message: |
  ⚠️ INV-034: 2026-03-29 Governance Automation Gate
  来源: experience/2026-03-29-governance-automation-gate.md
---

## 详细说明

## 问题 / 模式

- `docs:verify` 和 `check:governance` 只靠人工执行时，容易出现“规则还在，没人运行”的空档
- 只增加 CI workflow 但没有仓库级自动化测试，依然无法保护脚本回归
- 只增加测试但不把它写进治理自检，后续维护者又可能把测试和 workflow 删掉

<!-- 来源: context/experience/2026-03-29-governance-automation-gate.md -->