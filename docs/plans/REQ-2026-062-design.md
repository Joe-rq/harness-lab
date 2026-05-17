# REQ-2026-062 Design

## Background

MediAppHub 的真实提交历史暴露出五类治理缺口：completed REQ 内部状态和编号不一致、报告链接错号、安装器清理目标项目历史、QA 证据只停留在结论、路线图预编号与实际 REQ 编号漂移。Harness Lab 需要把这些问题变成自动化审计和保守门禁。

## Goal

- 新增只读 `req:audit`，覆盖 REQ 完成态自洽、报告链接、验收复选框、重复编号、INDEX/progress 一致性。
- 将 closure audit 接入 `req:complete`，将全量 audit 接入 `check:governance`。
- 安全化 `harness-install`，默认保留目标项目历史，支持 dry-run 和显式模板历史清理。
- 补齐 QA 证据、临时债务、显式编号创建和治理健康报告。

## Scope

### In scope

- `scripts/req-audit.mjs`：新增只读审计模块和 CLI。
- `scripts/req-cli.mjs`：接入 `req:audit`、QA 证据检查、`req:create --id`、临时债务模板。
- `scripts/harness-install.mjs`：dry-run、清理安全化、目标项目 scripts 对齐。
- `scripts/check-governance.mjs`、`scripts/governance-health.mjs`、`package.json`、模板和测试更新。

### Out of scope

- 自动修复 REQ 或报告内容。
- 多用户并发锁。
- 外部服务集成。

## Product Review

### User Value

- 解决的问题：减少 agent 或维护者在高频 REQ 推进中手工同步出错。
- 目标用户：个人开发者、接手目标项目的 AI agent、迁移 Harness Lab 的维护者。
- 预期收益：在提交前发现状态漂移、安装器误删风险和 QA 证据缺口。

### Recommendation

- Proceed。

## Engineering Review

### Architecture Impact

- 审计逻辑独立在 `req-audit.mjs`，供 CLI、`req:complete` 和 governance health 复用。
- 安装器保持无外部依赖，dry-run 复用现有 copy / package 更新 / hook 配置计划。
- QA 证据检查只读解析报告内容，不运行外部验证。

### Interfaces

- `node scripts/req-audit.mjs [--all] [--id REQ-YYYY-NNN] [--format json]`
- `npm run req:audit`
- `npm run governance:health`
- `node scripts/governance-health.mjs --format json`
- `npm run req:create -- --id REQ-YYYY-NNN --title "..."`
- `node scripts/harness-install.mjs --dry-run`
- `node scripts/harness-install.mjs --clean-template-history`

### Verification

- 自动验证：`npm test`, `npm run docs:verify`, `npm run check:governance`。
- 专项测试：构造错号 REQ、未 completed 状态、未勾选验收项、QA 缺证据、安装器 dry-run、目标历史保留、显式编号冲突。
- 人工验证：查看文本输出是否可读。
- 回滚：`git revert` 本 REQ 提交。
