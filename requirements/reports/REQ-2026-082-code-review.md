# REQ-2026-082 Code Review

## 状态

- 通过

## 审查范围

- `.claude/settings.example.json`
- `scripts/harness-install.mjs`
- `scripts/scope-guard.mjs`
- `tests/governance.test.mjs`
- `AGENTS.md`
- `README.md`
- `.claude/commands/harness-setup.md`
- `.agents/skills/source-command-harness-setup/SKILL.md`

## 结论

- 默认 hook 示例现在在 Write/Edit PreToolUse 下同时运行 `req-check.js` 与 `scope-guard.mjs`。
- `harness-install --with-hook` 会复制 `scope-guard.mjs`、写入目标项目 hook 配置，并授予对应命令权限。
- `scope-guard.mjs` 保留旧 REQ 无范围声明时放行的兼容行为；当 REQ 声明只读、无代码改动或禁止修改源码/测试/配置时，切换为 fail-closed，仅允许报告产物路径。
- 安装器报告、README、AGENTS 和 harness-setup skill 已同步说明：`scope-guard` 属于基础 PreToolUse hook，不再列为默认未安装高级脚本。

## 风险复核

- 风险：自然语言识别误伤讨论 scope-guard 行为的治理 REQ。
- 处理：只从非目标、范围、风险与回滚、验收项“无代码改动”以及范围内 CANNOT 小节提取只读边界，避免背景或目标中的问题描述触发只读模式。

## 未发现问题

- 未发现新增依赖。
- 未修改 `.codex/hooks.json`。
- 未修改 `.claude/settings.local.json` 高级 hook 集合。
