---
id: INV-058
title: 外部任务不能取代仓库内 REQ
status: active
severity: high
triggers:
  - glob: "requirements/external-mappings.json"
  - glob: "scripts/req-cli.mjs"
confidence: high
message: |
  ⚠️ INV-058: 外部任务系统（Linear/Jira/GitHub Issues）不能取代仓库内 REQ。
  实施门禁只认 REQ readiness，不认外部 ticket 状态。
  外部任务与 REQ 之间必须通过 external-mappings.json 建立一对一映射。
---

## 详细说明

### 规则

1. **外部 issue ≠ 仓库 REQ**：Linear/Jira/GitHub Issues 中的任务不等于 Harness Lab 的 REQ。二者是独立实体。
2. **门禁只认 REQ readiness**：所有实施门禁（PreToolUse hook、req:start 校验、scope guard）只检查 REQ 的 readiness 状态，不检查外部 ticket 状态。
3. **一对一映射**：外部任务与 REQ 之间必须通过 `requirements/external-mappings.json` 建立映射。一个 REQ 最多映射一个外部任务，一个外部任务最多映射一个 REQ。
4. **CLI owns schema**：映射的写入由 Harness Lab CLI 管理（未来 `req:import`），外部编排器只传递元数据。
5. **冲突处理**：当外部 ticket 状态与 REQ 状态不一致时，以 REQ 状态为准。编排器应通过 `req:status --json` 获取权威状态。

### Why

- 外部追踪器可能被任何人修改状态（QA 标记 Done、PM 改优先级），但这些操作不应绕过仓库内的治理流程。
- 如果门禁信任外部状态，则编排器可以在仓库外绕过 REQ 强制机制，使整个治理层形同虚设。
- 一对一映射防止同一个外部任务被多个 REQ 拆分执行（或一个 REQ 对应多个外部任务导致追踪混乱）。

### How to apply

- 在 `req:import` 实现中，必须校验映射唯一性。
- 在 `harness:doctor` 中，应检查映射文件的健康状态（重复、孤立、格式）。
- 任何从外部 ticket 创建 REQ 的流程，必须在 `external-mappings.json` 中登记映射，否则视为未关联。

## 复用建议

- 将此不变量应用于任何接入外部任务系统的项目。
- 如果项目不使用外部追踪器，此不变量不适用，可标记为 deprecated。

<!-- 来源: REQ-2026-054 Phase 6a 决策 -->
