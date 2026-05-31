---
id: INV-059
title: REQ-2026-071 event ledger 高频写入点经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-059: REQ-2026-071 event ledger 高频写入点经验
  来源: experience/REQ-2026-071-event-ledger-writers.md
---

## 详细说明

## 问题 / 模式

- **写事件不能先破坏主流程**：Stage 2 前半段应 best-effort，避免事件目录权限或 schema bug 让 `req:start` / `session-start` 失败。
- **新增 import 必须同步安装器**：只改本仓运行正常不够，目标项目通过 harness-install 复制后也必须有 `event-store.mjs`。
- **同一边界内的 lifecycle 事件可一起接**：create/start/block/complete 都在 `req-cli.mjs`，共享同一个 `recordEvent` 封装，拆成多 REQ 反而重复。

<!-- 来源: context/experience/REQ-2026-071-event-ledger-writers.md -->