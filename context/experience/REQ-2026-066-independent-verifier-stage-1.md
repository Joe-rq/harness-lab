# REQ-2026-066 独立 verifier Stage 1 经验

## 场景

Stage 1 的目标不是构建完整多 agent runtime，而是证明 reviewer / QA 可以从 worker 上下文中隔离出来，并且通过工具白名单保持只读。这个阶段的关键是证据隔离和可回退，而不是自动修复或任务图。

## 关联材料

- REQ：`requirements/completed/REQ-2026-066-stage-1-verifier-session-schema.md`
- Code Review：`requirements/reports/REQ-2026-066-code-review.md`
- QA：`requirements/reports/REQ-2026-066-qa.md`
- 路线图：`docs/plans/multi-agent-roadmap.md`

## 问题 / 模式

- **CLI agent 名不存在会静默 fallback**：如果只调用 `claude --agent verifier` 而不先检查 `.claude/agents/verifier.md`，验证可能实际跑在默认 agent 上。
- **subagent 成本不应默认进入常规流程**：独立 verifier 有 API 成本和启动延迟，Stage 1 证据充分前应让 `auto-review` / `auto-qa` 默认 legacy，显式设置 `HARNESS_VERIFIER_MODE=subagent` 才切换。
- **输出结构必须容错**：真实 verifier 可能返回裸 JSON、Markdown JSON code block，或 `verifierResult.verdict` 这类非标准形状；runner 应归一化，而不是要求 verifier 永远完美。
- **外部复测需要授权边界**：`claude --bare --agent verifier` 会向外部 API 发送上下文。沙箱内失败后，不应绕过审批；如果要复现，必须让用户明确授权。

## 关键决策

- **决策 1：runner 先校验 agent 文件存在**。理由：防止 Claude CLI 静默 fallback，保证测试对象确实是 verifier agent。
- **决策 2：`verifier-session.mjs` 默认 subagent，自动化入口默认 legacy**。理由：runner 是显式验证工具；常规 review/QA 需要成本可控和可回退。
- **决策 3：只传 artifact 路径，不传 worker 推理过程**。理由：独立 verifier 的价值来自上下文隔离，不能在 prompt 中重新注入 worker 的思考链。
- **决策 4：S1 收口，不扩张到任务图**。理由：Stage 1 已证明独立验证价值；跨 session 状态问题应进入 Stage 2 事件账本，而不是在 verifier runner 里解决。

## 验证

- `node --check scripts/verifier-session.mjs`：PASS
- `node --check scripts/auto-review.mjs`：PASS
- `node --check scripts/auto-qa.mjs`：PASS
- `HARNESS_VERIFIER_MODE=legacy node scripts/verifier-session.mjs --req REQ-2026-066`：PASS
- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- 多 agent 路线要以 checkpoint 收口：Stage 1 只交付 independent verifier，Stage 2 再处理事件账本。
- 对外部 LLM CLI 的验证证据要记录命令、输出形状、费用、延迟和失败模式；否则后续无法判断是能力问题还是环境问题。
- fallback 不只是备份路径，也是在治理框架里控制成本和风险的产品决策。
