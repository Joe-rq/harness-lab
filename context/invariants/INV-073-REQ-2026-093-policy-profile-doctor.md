---
id: INV-073
title: 2026-07-11 风险策略、事件协议与安装事实应分层
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-073: 2026-07-11 风险策略、事件协议与安装事实应分层
  来源: experience/REQ-2026-093-policy-profile-doctor.md
---

## 详细说明

## 复用建议

- 集中决策不等于集中协议输出；跨 Hook 的共同事实放 policy，各平台适配留在边界层。
- 机器生成的安装画像不要写时间戳，才能支持幂等、diff 审核和未来安全升级。
- profile 校验必须同时检查字段、依赖闭包、能力列表和 overlay/module 一致性，不能只验证 JSON 可解析。

<!-- 来源: context/experience/REQ-2026-093-policy-profile-doctor.md -->