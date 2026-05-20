---
id: INV-047
title: 2026-05-01 Phase 6a: req:status --id 按 REQ ID 查询状态
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-047: 2026-05-01 Phase 6a: req:status --id 按 REQ ID 查询状态
  来源: experience/REQ-2026-055-phase-6a-req-status-by-id.md
---

## 详细说明

## 问题 / 模式

- **函数提取时机**：statusCommand 内的字段提取逻辑（readiness 计算、block_reason 解析、criteria 提取）在 `--id` 和默认模式中完全相同，是提取共用函数的明确信号。不提前提取会导致两个分支代码重复。
- **字段名语义差异**：默认模式用 `active_req`（强调"当前活跃"），`--id` 模式用 `req`（强调"这个 REQ"）。编排器消费时应注意区分：`active_req` 暗示这是当前工作焦点，`req` 只是查询结果。

<!-- 来源: context/experience/REQ-2026-055-phase-6a-req-status-by-id.md -->