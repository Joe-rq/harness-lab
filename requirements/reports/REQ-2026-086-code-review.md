# REQ-2026-086 Code Review：OPT-1B — 目标项目 matcher 传播 + 缺口声明 + doctor 自检

## 状态
- ✅ 通过（自审）

## 范围合规
- 改动限于声明范围：`harness-install.mjs`（configureHook matcher）/ `harness-doctor.mjs`（三检查）/ `README.md` / `AGENTS.md` / `tests/governance.test.mjs`
- 未触碰 CANNOT：`req-check.js` / `scope-guard.mjs` / `session-start.js` / `package.json` / `.codex/hooks.json` / `.claude/settings*.json` 均未改

## 主要发现
1. **install matcher 传播**：`configureHook` PreToolUse matcher `Write|Edit` → `Write|Edit|NotebookEdit|Bash`。目标项目 `--with-hook` 安装后即获得 Bash 门禁，与模板仓一致（OPT-1A 的本仓修复现在传播到下游）。
2. **doctor self-test 防回归**：`checkReqCheckStdinSelfTest` 用 `spawnSync` 喂 req-check 纯读 stdin 验证 exit 0。这是对 OPT-1A bug（env-var 死代码长期没自检才发现）的直接制度补救——把"stdin 契约存活"变成可机器检测。
3. **平台缺口策略**：subagent / `claude -p` / 解释器写采用"文档声明（README + AGENTS）+ doctor 提示 + OS 级兜底建议"，不代码封堵（上游 PreToolUse 限制 + 理论不可封）。
4. **doctor 输出位置**：诊断报告走 stderr（`printReport` 用 `process.stderr.write`），JSON 模式走 stdout；测试用 `--json` 拿 stdout 验证，规避 stderr 捕获复杂度。

## 风险与回滚
- install matcher 改 Bash → 新装项目 Bash 命令多跑两 hook（延迟略增）；对冲：纯读 fast-path（req-check 写检测未命中即 exit 0），hook timeout 已配。
- 回滚：`configureHook` matcher 还原 `Write|Edit` + doctor 三检查项移除。

## 结论
OPT-1B 完成 OPT-1 的目标项目传播 + 缺口诚实标注 + 配置可检测化。④ hook 输出格式迁移（`hookSpecificOutput`）与 ⑤ `.mjs` 后缀改名显式缓做（记于 REQ 关键决策：④旧格式兼容、⑤高风险低收益）。OPT-1 至此（A+B）核心闭环。
