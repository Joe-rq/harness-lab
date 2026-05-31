---
id: INV-058
title: REQ-2026-070 event schema + append API 经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-058: REQ-2026-070 event schema + append API 经验
  来源: experience/REQ-2026-070-event-schema-append-api.md
---

## 详细说明

## 问题 / 模式

- **不要在同一 REQ 同时建立事实层和改主链路**：事件 schema、append API、progress projection、worktree aggregation 是不同风险层，混在一起会让 QA 难以定位回归。
- **坏事件必须写入前拒绝**：JSONL 一旦混入坏行，后续 projection 的可信度会下降；append API 要先补字段、再校验、最后写入。
- **多 writer 读取要稳定排序**：Stage 2 后续会读取多个 session/worktree 文件，排序必须有固定 tie-breaker，不能依赖文件系统顺序。

<!-- 来源: context/experience/REQ-2026-070-event-schema-append-api.md -->