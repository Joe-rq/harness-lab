---
id: INV-057
title: REQ-2026-066 独立 verifier Stage 1 经验
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
  - glob: "docs/plans/**"
  - glob: ".claude/agents/**"
confidence: medium
message: |
  ⚠️ INV-057: REQ-2026-066 独立 verifier Stage 1 经验
  来源: experience/REQ-2026-066-independent-verifier-stage-1.md
---

## 详细说明

## 问题 / 模式

- **CLI agent 名不存在会静默 fallback**：如果只调用 `claude --agent verifier` 而不先检查 `.claude/agents/verifier.md`，验证可能实际跑在默认 agent 上。
- **subagent 成本不应默认进入常规流程**：独立 verifier 有 API 成本和启动延迟，Stage 1 证据充分前应让 `auto-review` / `auto-qa` 默认 legacy，显式设置 `HARNESS_VERIFIER_MODE=subagent` 才切换。
- **输出结构必须容错**：真实 verifier 可能返回裸 JSON、Markdown JSON code block，或 `verifierResult.verdict` 这类非标准形状；runner 应归一化，而不是要求 verifier 永远完美。

<!-- 来源: context/experience/REQ-2026-066-independent-verifier-stage-1.md -->