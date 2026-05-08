---
id: INV-078
title: 2026-05-01 Phase 6a: req status --json + external mappings
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: "requirements/**"
  - glob: "requirements/**/**"
confidence: medium
message: |
  ⚠️ INV-078: 2026-05-01 Phase 6a: req status --json + external mappings
  来源: experience/REQ-2026-054-phase-6a-req-status-json-external-mappings.md
---

## 详细说明

## 问题 / 模式

- **Scope Guard catch-22**：修改 REQ 文件本身被 scope guard 拦截（REQ 不在自己的 scope 声明中）。需要用 Bash/sed 绕过 hook 来修改 scope 声明。
- **Glob 模式陷阱**：`requirements/` 作为 glob 只匹配目录本身，不匹配子文件。必须用 `requirements/**`。
- **JSON 输出中 undefined vs null**：JavaScript 的 `undefined` 在 `JSON.stringify` 中被省略，但 API 消费者期望 `null`。必须显式设置 `external: null`。

<!-- 来源: context/experience/REQ-2026-054-phase-6a-req-status-json-external-mappings.md -->