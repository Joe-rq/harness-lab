# REQ-2026-077 设计文档

> 关联 REQ: [REQ-2026-077](../../requirements/completed/REQ-2026-077-verifier-defaults-readonly-boundary.md)  
> 关联观察报告: [2026-06-03-multi-angle-roadmap-deduction.md](../../requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md)  
> 设计日期: 2026-06-04

## 1. 设计目标

REQ-077 修复 verifier 三入口默认值分裂,并把 `envelope` 从路线图约定补成可执行的只读默认模式。完成后,`verifier-session.mjs`、`auto-review.mjs`、`auto-qa.mjs` 在没有设置 `HARNESS_VERIFIER_MODE` 时都解析为 `envelope`;只有显式设置 `legacy` 才走旧本地 review/QA,只有显式设置 `subagent` 才启动外部 verifier agent。

## 2. 模式契约

| 模式 | 行为 | 默认? |
|------|------|-------|
| `envelope` | 生成 verifier handoff package,包含 envelope、prompt 和只读工具边界;不执行命令、不调用外部 CLI | 是 |
| `legacy` | 保留旧本地 auto-review / auto-qa 行为 | 否 |
| `subagent` | 调用 `claude --bare --agent verifier` | 否 |

模式解析集中到 `scripts/verifier-mode.mjs`,暴露:

- `DEFAULT_VERIFIER_MODE = 'envelope'`
- `ALLOWED_VERIFIER_MODES = ['legacy', 'envelope', 'subagent']`
- `getVerifierMode(env)`
- `assertVerifierMode(mode, entrypoint)`

三个入口不得再各自声明默认值。

## 3. Envelope Package

`verifier-session.mjs` 在 envelope 模式下输出 JSON package:

```json
{
  "schemaVersion": "1.0",
  "mode": "envelope",
  "agent": "verifier",
  "readonlyBoundary": {
    "allowedTools": ["Read", "Grep", "Glob", "LS"],
    "disallowedTools": ["Write", "Edit", "Bash", "NotebookEdit", "Task", "Agent", "Workflow"]
  },
  "envelope": {
    "reqId": "REQ-YYYY-NNN",
    "checkType": "full",
    "artifactPaths": ["scripts/foo.mjs"],
    "rootDir": "/repo"
  },
  "prompt": "..."
}
```

包只传路径和约束,不嵌入 artifact 内容或 worker 推理过程。若 `--output requirements/reports --report-suffix code-review`,文件名采用 `REQ-YYYY-NNN-code-review-verifier-envelope.json`。这是待独立 verifier 消费的输入,不是 pass/fail 报告。

## 4. 三入口行为

- `verifier-session.mjs`:默认生成 envelope package;`legacy` 委托旧 `auto-review`;`subagent` 保持现有外部调用。
- `auto-review.mjs`:默认委托 `verifier-session` 生成 `code-review` envelope package;`legacy` 保持原来的本地 report 生成。
- `auto-qa.mjs`:默认委托 `verifier-session` 生成 `qa` envelope package;`legacy` 保持原来的验证命令执行与 QA report 生成。

`auto-review` / `auto-qa` 不在 envelope 模式下生成看似通过的 Markdown 报告,避免把"待独立验证"误记成"已通过"。

## 5. 测试策略

自动化测试放入现有 `tests/governance.test.mjs`,减少新测试入口漂移:

- helper 默认值和合法/非法模式。
- `verifier-session` 默认 envelope 不启动 `claude`,并生成只读边界 package。
- `auto-review` / `auto-qa` 默认 envelope 生成 package,不执行 legacy 本地 report/QA 命令。
- `legacy` 模式仍能生成原有 Markdown report。

Fixture 使用临时 git 仓库构造 uncommitted diff,所有测试本地执行,不访问网络。

## 6. 风险控制

- 默认行为变化会影响维护者习惯;在 `CONTRIBUTING.md` 记录如何显式设置 `HARNESS_VERIFIER_MODE=legacy`。
- `subagent` 不做当前会话复测,避免外发私有上下文;已有 REQ-066 证据仍作为 Stage 1 历史证据。
- 只读边界测试以 envelope package 内容和未执行命令为本地证据,不声称 runtime 物理沙箱重新通过。

## 7. 验证命令

- `node --check scripts/verifier-mode.mjs`
- `node --check scripts/verifier-session.mjs`
- `node --check scripts/auto-review.mjs`
- `node --check scripts/auto-qa.mjs`
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- `node scripts/req-audit.mjs --id REQ-2026-077 --verbose`
