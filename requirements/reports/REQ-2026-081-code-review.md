# REQ-2026-081 Code Review

## 状态

- 通过

## 审查范围

- `scripts/risk-tracker.mjs`
- `scripts/check-governance.mjs`
- `.claude/settings.local.json`
- `tests/governance.test.mjs`
- `README.md`

## 结论

- `risk-tracker.mjs` 已将缺失的 hook 脚本纳入 R4：`session-start.js`、`review-gatekeeper.mjs`、`deploy-guard.mjs`、`risk-tracker.mjs`、`watchdog.mjs`、`precompact-notify.mjs`。
- `risk-tracker.mjs` 中 `git rev-parse --show-toplevel` 只保留 1 次调用，`RATCHET_FILE(rootDir)` 改为复用已解析的 root。
- `check-governance.mjs` 已增加 `.claude/settings.local.json` 与 `.codex/hooks.json` 的 hook 类型、matcher、command、timeout 一致性检查。
- `check-governance.mjs` 已增加“所有 hook 脚本必须在 risk-tracker R4 规则中”的覆盖检查。
- `.claude/settings.local.json` permissions.allow 当前 35 条，已从 118 条膨胀状态收敛，保留通配符与 MCP 权限。

## 风险复核

- 未修改 `.codex/hooks.json`，符合非目标。
- 未修改 risk 等级数值或 label，符合 CANNOT。
- 未新增共享模块或外部依赖。
- 后续如果新增 hook 脚本，`npm test` 与 `npm run check:governance` 会同时暴露 R4 漏配和 hook 配置漂移。

## 未发现问题

- 未发现验收标准缺项。
- 未发现与 REQ-082 后续修复冲突；REQ-082 增加的 `scope-guard` 安装链路仍被 R4 覆盖检查保护。
