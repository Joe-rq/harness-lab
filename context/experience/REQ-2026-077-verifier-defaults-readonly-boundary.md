# REQ-2026-077 verifier 默认值与 envelope 只读边界经验

## 场景

多入口 CLI 很容易在不同时间点形成默认值漂移。REQ-077 前,`verifier-session.mjs` 默认 `subagent`,而 `auto-review.mjs` / `auto-qa.mjs` 默认 `legacy`;Stage 3 观察期会混入不同系统的数据,导致后续指标不可解释。

## 关联材料

- REQ: `requirements/completed/REQ-2026-077-verifier-defaults-readonly-boundary.md`
- Design: `docs/plans/REQ-2026-077-design.md`
- Code Review: `requirements/reports/REQ-2026-077-code-review.md`
- QA: `requirements/reports/REQ-2026-077-qa.md`

## 问题 / 模式

- 默认值必须集中声明,尤其是跨多个 CLI 入口的环境变量。
- "生成 verifier envelope"不能伪装成审查通过;它是 handoff package,不是 pass/fail report。
- 只读边界可以拆成两层验证:runtime 物理权限由历史实测证明,默认本地路径则用自动化测试证明不会执行命令或启动外部 CLI。
- 测试外部 subagent 分支时,用 fake executable 验证参数传递,避免把私有工作区上下文发给外部服务。

## 关键决策

- 决策 1:新增 `scripts/verifier-mode.mjs` 集中 `DEFAULT_VERIFIER_MODE`、合法模式和只读工具边界。
- 决策 2:三入口默认统一为 `envelope`,而不是 `legacy` 或 `subagent`;这符合用户对 S3-CP1 的 envelope 默认决策,也避免默认外发。
- 决策 3:`auto-review` / `auto-qa` 在 envelope 模式只生成 JSON package,不生成 Markdown 通过报告;需要旧报告时显式 `HARNESS_VERIFIER_MODE=legacy`。
- 决策 4:subagent 测试使用 fake `claude` 和 fake `node`,验证显式委托但不触达网络。

## 解决方案

1. 用 `resolveVerifierMode()` 统一读取和校验 `HARNESS_VERIFIER_MODE`。
2. 在 `verifier-session.mjs` 默认输出 envelope package,记录 `handoff.status=pending-independent-verification`。
3. 让 `auto-review.mjs` / `auto-qa.mjs` 默认委托 envelope,legacy 模式保留旧行为。
4. 在 `tests/governance.test.mjs` 加 6 个回归测试覆盖默认值、非法值、envelope、legacy 和 subagent。

## 复用建议

- 新增跨入口环境变量时,先写中心 helper 和测试,再接入各 CLI。
- 任何"待人工/独立 agent 消费"的产物都应在文件名和内容里标明 pending/handoff,避免被审计系统误解为已验证。
- 需要测试会外发的 CLI 分支时,优先用 fake executable 证明命令行契约,真实外部复测另走用户授权。
