# 2026-06-10 Fix scope guard enforcement and hook installation drift

## 场景

源仓库本地 hook 已经启用了 `scope-guard.mjs`，但 `harness-install --with-hook` 和 `.claude/settings.example.json` 只分发 `req-check.js`。目标项目因此只能检查“有没有可实施 REQ”，不能阻断“活跃 REQ 存在但本次写入超出 scope”的情况。只读审计 REQ 尤其危险：REQ 明确写了“无代码改动 / 禁止修改源码”，但因为没有机器可识别的 allow-list，旧 scope-guard 会向后兼容放行。

## 关联材料

- REQ: `requirements/completed/REQ-2026-082-scope-guard-hook-installation-drift.md`
- Design: 豁免（bugfix，无独立设计稿）
- Code Review: `requirements/reports/REQ-2026-082-code-review.md`
- QA: `requirements/reports/REQ-2026-082-qa.md`

## 问题 / 模式

- 本地模板仓库能力和安装器分发能力可能漂移：源仓库自己安全，但目标项目仍拿到旧级别防护。
- `req-check` 只能证明 REQ 存在且可实施，不能证明本次写入符合 REQ 的 CAN/CANNOT。
- “无 scope 声明则放行”的向后兼容策略遇到只读 REQ 时会变成漏洞，应对明确只读边界 fail-closed。
- 自然语言识别要避免误伤：讨论“只读 REQ”的治理修复 REQ，不等于当前 REQ 自身是只读。

## 关键决策

- 将 `scope-guard.mjs` 纳入基础 PreToolUse hook，而不是继续归类为高级 hook。原因是它和 `req-check.js` 共同构成“能否写”的最低安全线。
- 只对非目标、范围、风险与回滚、验收项“无代码改动”以及范围内 CANNOT 小节识别只读边界，避免背景和目标里的问题描述误触发。
- 对只读 REQ 默认只允许 `requirements/reports/**`，并允许显式报告路径；普通旧 REQ 无范围声明仍保持放行，降低迁移破坏面。

## 解决方案

1. 安装器 hook 模块复制 `scope-guard.mjs`，`configureHook()` 在 Write/Edit 下按 `req-check.js` 后、其他项目自定义 hook 前追加 `scope-guard.mjs`。
2. `scope-guard.mjs` 同时支持 allow/deny 路径解析，并在只读边界下切换为 fail-closed。
3. 安装报告、README、AGENTS、source-command skill 同步说明：`scope-guard` 是基础 hook，`watchdog/risk-tracker/auto-review` 才是默认未安装高级脚本。
4. 回归测试覆盖安装器复制/配置、只读 REQ 阻断源码/测试/配置、只读报告产物放行、旧 REQ 无 scope 放行。

## 复用建议

- 新增治理 hook 时，必须同时检查 `.claude/settings.example.json`、`harness-install` 文件清单、`configureHook()`、安装报告、README/command/skill 文档和 fixture 测试。
- 对“只读、审计、报告-only、无代码改动”类 REQ，不能只依赖 agent 自觉；hook 应默认只允许声明的产物路径。
- 如果要在 REQ 中讨论某种边界规则，识别器应限定章节，避免把背景里的“问题描述”当成当前 REQ 的约束。
