# Code Review: REQ-2026-060

## Findings

未发现阻断性问题。

## Review Notes

- `source-command-feature` / `bugfix` / `refactor` 的前置检查已从全局 `INDEX.md` 改为运行 `npm run req:status` 检查当前 worktree，符合 worktree 本地进度隔离模型。
- 新增 `source-command-worktree-req`，覆盖创建 worktree、进入目录、检查当前/全局状态、创建并启动 REQ、合并和删除 worktree 的完整 Claude Code 操作路径。
- `harness-install` 默认 skills 模块已复制 `.agents/skills/source-command-*`，包含新的 `source-command-worktree-req`，目标项目迁移后能获得同一套 source-command 引导。
- `harness-setup` command 与 skill 同步说明默认模块包含 Claude Code source-command skills，避免迁移说明与真实安装清单漂移。
- README 明确“一个 worktree 一个 active REQ”，并说明日常 REQ 类型 skill 与 worktree 专用 skill 的分工。
- `tests/governance.test.mjs` 新增安装器复制 `source-command-worktree-req` 的断言，并将 harness-setup command/skill 契约纳入 required phrases。

## Residual Risk

- 新 worktree skill 只提供操作引导，不自动执行 `git worktree add/remove`；这是刻意保守，避免 agent 未经确认创建或删除工作目录。
- 多 worktree 同时 `req:create` 的编号撞号问题仍依赖用户从最新主线创建 worktree 或先预留 REQ；本 REQ 只在 skill 中提示风险，不改变编号算法。

## Conclusion

实现与设计一致，可以进入 QA。
