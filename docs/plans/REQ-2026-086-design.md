# REQ-2026-086 设计稿：OPT-1B — 目标项目 matcher 传播 + 缺口声明 + doctor 自检

> 关联 REQ：`requirements/in-progress/REQ-2026-086-opt1b-install-doctor-docs.md`
> 前置：`REQ-2026-085`（OPT-1A，模板仓自身 matcher + stdin 契约已修）

## 1. 问题陈述

OPT-1A 让模板仓自身的 PreToolUse 覆盖了 Bash。但 OPT-1 的承诺完整性要求**目标项目（`--with-hook` 安装）也获得 Bash 门禁**，且**使用者必须知道边界**。当前三个缺口：

### 1.1 安装链未传播
`harness-install.mjs` `configureHook`（生成目标项目 `.claude/settings.local.json`）的 PreToolUse matcher 仍是 `Write|Edit`。目标项目 Bash 写仍绕过 req-check/scope-guard。

### 1.2 缺口未声明
三类不可强制场景无文档：
- subagent 工具调用不触发 PreToolUse（GitHub `anthropics/claude-code#21460`/`#34692`）
- `claude -p` 非交互不触发（`#40506`）
- `perl -e 'print...'` / `python -c 'open().write()'` 等解释器写（理论不可封）

使用者若以为"REQ 门禁覆盖一切写"，会误信治理完整性。

### 1.3 配置漂移不可检测
`harness-doctor.mjs` 不检查 matcher 是否覆盖 Bash、stdin 解析是否生效、平台缺口是否已声明。OPT-1A 的死代码 bug（env-var 恒空）就是长期没自检才发现的。

## 2. 方案

### 2.1 install matcher 传播（`harness-install.mjs` `configureHook`）

`configureHook` 生成目标项目 PreToolUse 配置时，matcher 由 `Write|Edit` 改为 `Write|Edit|NotebookEdit|Bash`，两 hook（req-check + scope-guard）挂在同一 entry（与模板仓 `settings.local.json` 结构一致）。

> 实施前需读 `harness-install.mjs` 确认 `configureHook` 当前 matcher 硬编码位置（grep `Write|Edit`）。同时确认 `testHarnessInstallArtifacts` 是否断言 matcher（前面读到的版本断言 command 不断言 matcher，应无冲突；若断言则同步更新）。

### 2.2 缺口声明（`README.md` + `AGENTS.md`）

`README.md`「已知限制」段（当前含"单用户设计/无并发控制"）追加"REQ 门禁不可强制场景"小节：
- subagent / `claude -p`：上游 PreToolUse 不触发，需 OS 级兜底（文件权限、容器化、CI 侧检查）
- 未覆盖 Bash 写模式：`perl -e`/`python -c`/任意解释器；策略为高频模式启发式 + 文档明示

`AGENTS.md` 强制机制段（PreToolUse Hook 描述处）同步加一句指向 README 缺口声明，避免两处文档漂移。

### 2.3 doctor 自检（`harness-doctor.mjs`）

新增三项检查（接入现有 doctor 输出结构）：
1. **matcher 覆盖**：读本仓 `.claude/settings.local.json` PreToolUse entry，断言至少一个 matcher 含 `Bash`（覆盖 req-check+scope-guard）。未覆盖 → WARN。
2. **stdin self-test**：构造样例 PreToolUse stdin（`{tool_name:'Bash', tool_input:{command:'ls'}}` 纯读 + `{tool_name:'Bash', tool_input:{command:'echo > x'}}` 写），子进程跑 `req-check.js`，断言纯读 exit 0 / 写 exit 2（或 active REQ 状态下的预期）。验证 stdin 契约非死代码。失败 → WARN。
3. **平台缺口提示**：无条件输出 INFO 提示三类不可强制场景（subagent / `claude -p` / 解释器写），引导看 README。

> 实施前需读 `harness-doctor.mjs` 现有检查项结构，新增项接入同样输出格式（PASS/WARN/FAIL + 计数）。

## 3. 测试矩阵（tests/governance.test.mjs 新增）

| # | 场景 | 期望 |
|---|------|------|
| T1 | fixture 项目跑 `harness-install --with-hook`，读生成 settings.local.json | PreToolUse matcher 含 `Bash` |
| T2 | 读 README.md | 含三类不可强制关键词（subagent / `claude -p` / 解释器）|
| T3 | 读 harness-doctor.mjs 源 | 含 matcher 覆盖检查 + stdin self-test + 平台缺口提示三项 |
| T4 | 运行 harness-doctor | 输出含三项检查结果（PASS/WARN） |

## 4. 非目标（重申）
- 不改 .mjs 后缀（缓） / 不迁移 hook 输出格式（缓）
- 不代码封堵 subagent/`claude -p`/解释器写（上游 + 理论限制，只声明 + OS 兜底）

## 5. 风险与回滚
- install matcher 改 Bash → 所有新装项目 Bash 命令多跑两 hook（延迟略增）；对冲：纯读 fast-path（req-check 写检测未命中 exit 0），hook timeout 已配。
- 回滚：configureHook matcher 还原 + doctor 检查项移除。

## 6. 实施顺序
1. 读 `harness-install.mjs` `configureHook` + `harness-doctor.mjs` 现状，细化改点
2. install matcher 扩面 + testHarnessInstallArtifacts 同步（若断言 matcher）
3. README + AGENTS 缺口声明
4. doctor 三项自检
5. tests T1-T4
6. `npm test` + `docs:verify` + `check:governance` + `harness:doctor` 全绿
