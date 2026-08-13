---
id: INV-074
title: 2026-07-11 安全升级先证明“可以覆盖”，再考虑合并
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-074: 2026-07-11 安全升级先证明“可以覆盖”，再考虑合并
  来源: experience/REQ-2026-094-safe-upgrade-without-auto-merge.md
---

## 详细说明

## 复用建议

- 所有权系统的核心不是记录“哪些路径像我的”，而是记录“我能证明哪些字节来自哪个版本”。
- dry-run 和 apply 必须共用同一 planner，不能维护两套判断逻辑。
- 在单用户系统里仍应写前 rehash；它成本很低，却能显著缩小计划后变化的覆盖窗口。

<!-- 来源: context/experience/REQ-2026-094-safe-upgrade-without-auto-merge.md -->