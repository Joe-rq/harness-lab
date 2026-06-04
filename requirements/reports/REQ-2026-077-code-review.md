# REQ-2026-077 Code Review

## Findings

未发现阻断性问题。

## Review Notes

- `scripts/verifier-mode.mjs` 将 `HARNESS_VERIFIER_MODE` 默认值、合法值和只读工具边界集中声明,消除了三入口各自维护默认值导致的漂移根因。
- `scripts/verifier-session.mjs` 的默认路径改为生成 JSON envelope package,并明确 `handoff.status=pending-independent-verification`;这避免把"待独立验证输入"误表达为 pass/fail 结论。
- `auto-review.mjs` / `auto-qa.mjs` 现在默认委托 `verifier-session.mjs` 生成 envelope package;`legacy` 模式仍保留原来的本地 Markdown report 和 QA 命令执行行为。
- `subagent` 仍是显式 opt-in,且测试使用 fake `claude`/fake `node` 证明参数传递和 env mode,没有外发私有仓库上下文。
- `tests/governance.test.mjs` 新增 6 个 verifier 模式回归,覆盖默认值、非法模式、envelope 只读边界、legacy fallback、subagent delegation。

## Residual Risk

- 默认 `auto-review` / `auto-qa` 不再产出 Markdown pass/fail 报告,维护者需要显式 `HARNESS_VERIFIER_MODE=legacy` 才得到旧报告;已在 `CONTRIBUTING.md` 写明。
- 当前只做本地 envelope 边界回归,不重新调用外部 Claude CLI;runtime 物理只读沙箱仍引用 REQ-066 已落盘证据。
- 工作区仍包含 REQ-075/076 未提交治理文件;本 review 只审 REQ-077 范围内的 verifier 入口、测试和文档改动,未评价 075/076 内容。

## Conclusion

实现符合 REQ-077 目标,可以进入 QA 与完成流程。
