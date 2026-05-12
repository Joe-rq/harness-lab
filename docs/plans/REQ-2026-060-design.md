# REQ-2026-060 Design: Claude Code worktree REQ guidance

## Problem

Claude Code 用户主要通过 source-command skills 创建 REQ。现有 `feature` / `bugfix` / `refactor` skill 仍以 `requirements/INDEX.md` 的全局活跃 REQ 作为前置检查，这与 worktree 本地进度隔离不一致。

## Approach

采用组合方案：

1. 更新现有 REQ 类型 skill：将“当前无活跃 REQ”改为“当前 worktree 无活跃 REQ”，并提示 `npm run req:status -- --all` 查看全局活跃 REQ。
2. 新增 `source-command-worktree-req`：专门处理并行 REQ 的 worktree 创建、状态检查、REQ 创建/启动和收尾。
3. 更新 `source-command-harness-setup` 和 `harness-install`：迁移时带上新 skill。
4. 更新 README：明确 Claude Code 下一个 worktree 一个 active REQ。

## Scope

In scope:
- `.agents/skills/source-command-feature/SKILL.md`
- `.agents/skills/source-command-bugfix/SKILL.md`
- `.agents/skills/source-command-refactor/SKILL.md`
- `.agents/skills/source-command-worktree-req/SKILL.md`
- `.agents/skills/source-command-harness-setup/SKILL.md`
- `scripts/harness-install.mjs`
- `tests/governance.test.mjs`
- `README.md`

Out of scope:
- `req-cli.mjs` worktree 状态算法
- 自动执行 `git worktree add/remove`
- REQ 编号分配策略

## Verification

- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- 人工检查新 skill 是否能独立指导 Claude Code 用户完成并行 REQ 流程
