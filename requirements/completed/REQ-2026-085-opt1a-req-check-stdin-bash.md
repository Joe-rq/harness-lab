# REQ-2026-085: OPT-1A — req-check stdin 契约 + Bash 写入门禁

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`optimization-roadmap-2026-06.md` 的 OPT-1 暴露两处地基裂缝，均削弱"REQ 强制门禁"这一核心承诺：

1. **env-var 死代码导致过度阻断**：`scripts/req-check.js` 通过 `process.env.CLAUDE_TARGET_FILE` 读取目标文件（`getTargetFileFromEnv`），但 Claude Code 实际通过 stdin JSON（`tool_input.file_path`）传参，该环境变量恒为空 → `isRequirementsOrDocsFile()` 白名单（本应放行 `requirements/`、`docs/plans/`、`.claude/`）从未生效 → 无活跃 REQ 时连填写 REQ 内容、写设计稿都被误拦（与设计意图相反）。
2. **Bash 写文件绕过门禁**：`.claude/settings.example.json` 的 PreToolUse matcher 仅 `Write|Edit`，`echo > file` / `tee` / `sed -i` / heredoc 等 Bash 写路径完全不经过 `req-check.js`。

本 REQ（OPT-1A）修这两处。模块类型导致的 `MODULE_TYPELESS_PACKAGE_JSON` 警告与 hook 输出格式迁移归 OPT-1B（REQ-2026-086）。

## 目标
1. `req-check.js` 从 stdin JSON 解析输入，按 `tool_name` 分流：`Write|Edit|NotebookEdit` 取 `file_path` 过白名单再做 REQ 检查；`Bash` 取 `command` 跑写模式启发式，命中才检查、纯读放行。
2. PreToolUse matcher 由 `Write|Edit` 扩为 `Write|Edit|NotebookEdit|Bash`（`req-check.js` 与 `scope-guard.mjs` 两 hook 同步）。
3. `scope-guard.mjs` 已读 stdin，扩展 Bash 分支：解析写命令目标路径转虚拟 `relPath`，复用 `evaluateRange()` 做范围判定。
4. `tests/governance.test.mjs` 覆盖三类用例：Bash 写绕过被拦、Bash 纯读放行、白名单目录放行（修复死代码回归）。

## 非目标
- 不改 `package.json` 的 `"type"`、不改脚本后缀（`.mjs` 迁移归 REQ-2026-086）。
- 不迁移 hook 阻断输出格式（`hookSpecificOutput.permissionDecision` 迁移归 REQ-2026-086；本 REQ 维持现有 `exit 2` / `decision:block` 兼容输出）。
- 不追求 Bash 写检测 100% 完备（`perl -e` / `python -c` 等任意解释器写文件理论上不可封）；策略为覆盖高频模式 + 文档明示剩余缺口（文档声明归 REQ-2026-086）。
- 不修 Claude Code 平台自身的 subagent / `claude -p` 不触发 PreToolUse 缺口（上游问题）。

## 颗粒度自检
- [x] 目标数 ≤ 4？（4）
- [~] 涉及文件数 ≤ 4？（实际 7，超颗粒度：matcher 扩面必须同步 settings.local.json + .codex/hooks.json（`testHookConfigConsistency` 强制）+ example.json 三处；docs-sync 强制 CONTRIBUTING；与代码改动强耦合，无法在不破坏端到端的前提下拆分。install 目标项目传播归 REQ-2026-086）
- [x] 涉及模块/目录 ≤ 4？（2：scripts/ + tests/ + .claude/）
- [x] 能否用一句话描述"解决了什么问题"？能——让 REQ 门禁真正覆盖 Bash 写路径，并修复白名单死代码导致的误拦。
- [x] 如果失败，能否干净回滚？能——matcher 还原 `Write|Edit` 即恢复原状。

## 范围
- 涉及文件（OPT-1A 本仓端到端 + 文档同步，强耦合，实际 7 文件）：
  - `scripts/req-check.js`（stdin 契约 + Bash 分流，核心重写）
  - `scripts/scope-guard.mjs`（Bash 写目标 → 范围判定）
  - `.claude/settings.example.json`（模板 matcher 扩 Bash）
  - `.claude/settings.local.json`（本仓生效 matcher 扩 Bash）
  - `.codex/hooks.json`（与 settings.local.json 同步，`testHookConfigConsistency` 强制）
  - `tests/governance.test.mjs`（Bash 绕过/放行/白名单回归 + 修正 slugged 测试喂 stdin）
  - `CONTRIBUTING.md`（REQ 门禁 hook 输入契约说明，`governance-automation` docs-sync 要求）
- 不含：`scripts/harness-install.mjs`（目标项目 matcher 传播归 REQ-2026-086）

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件 / 模块：上述 4 个文件
- 可新增的测试 / 脚本：`tests/governance.test.mjs` 内新增用例

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`package.json`、`scripts/req-cli.mjs`、`scripts/harness-install.mjs`、`scripts/session-start.js`、`scripts/harness-doctor.mjs`、`README.md`、`AGENTS.md`（均归 REQ-2026-086）
- 不可引入的依赖 / 操作：新增 npm 依赖；改任何 `package.json`

**边界条件**：
- 改动规模：4 文件，单文件主逻辑重写限于 `req-check.js`
- 发布边界：模板仓库自身 + `--with-hook` 安装链路同步生效

## 验收标准
- [x] When 无活跃 REQ 且无豁免，且 Bash 命令包含对 repo 内路径的 `>` / `>>` / `| tee` / `sed -i` 写入，`req-check.js` shall 以 `exit 2` 阻断
- [x] When 无活跃 REQ，且 Bash 命令为纯读（`ls` / `grep` / `cat file`），`req-check.js` shall `exit 0` 放行且无额外输出
- [x] When 无活跃 REQ，且 Write 目标位于 `requirements/` / `docs/plans/` / `.claude/`，`req-check.js` shall `exit 0` 放行（白名单恢复）
- [x] When 有活跃 REQ 且 Bash 写目标在 REQ 声明范围外，`scope-guard.mjs` shall 阻断并记 `.claude/scope-violations.log`
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-085-design.md`
- 相关规范：`docs/plans/optimization-roadmap-2026-06.md` OPT-1

## 报告链接
- Code Review：`requirements/reports/REQ-2026-085-code-review.md`
- QA：`requirements/reports/REQ-2026-085-qa.md`
- Ship：不适用（模板仓库，无独立发布）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：Node.js（模板仓库自身）
- 需要的人工验证：构造 stdin JSON 喂入 `req-check.js` 验证四类行为（Bash 写拦 / Bash 读放行 / 白名单放行 / 范围外拦）

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] **目标实现**：四个目标（stdin 分流 / matcher / scope-guard Bash / 测试）是否全部达成
- [x] **旧功能保护**：Write/Edit 的既有 REQ 门禁行为不变；npm test 全绿
- [x] **逻辑正确性**：Bash 启发式是否误杀纯读命令；白名单匹配是否路径边界正确
- [x] **完整性**：四类验收场景是否都有对应实现与测试
- [x] **可维护性**：Bash 写检测模式是否集中可扩展

**输出要求**：记录到 `requirements/reports/REQ-2026-085-qa.md`

#### 对齐检查（record 阶段）
- [x] **目标对齐**：实现是否服务于"门禁真正覆盖 Bash + 修白名单死代码"
- [x] **设计对齐**：是否与 design 稿一致；偏离是否记录
- [x] **验收标准对齐**：五条验收是否都有实现与验证

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- Bash 写检测采用启发式正则，未覆盖 `perl -e` / `python -c` 等解释器写；退出条件：REQ-2026-086 文档声明剩余缺口 + 后续若引入 OS 级兜底（文件权限/容器化）可收窄。清理触发点：无（属设计内边界，非临时）。

## 风险与回滚
- 风险：Bash 启发式误杀合法命令（如向 `/tmp` 写临时文件）；对冲：路径判定限定 repo 内，`supervised` harness-mode 可整体降级为仅提醒
- 回滚方式：`settings.example.json` matcher 还原为 `Write|Edit`，`req-check.js` 还原 env-var 读取

## 关键决策
- 2026-06-21：OPT-1 拆为 A/B 两 REQ。A（本 REQ）先做——堵 Bash 绕过 + 修白名单死代码，是最紧迫的承诺完整性问题；B（REQ-2026-086）后做——`.mjs` 后缀、hook 输出格式迁移、doctor 自检、文档声明。
- 2026-06-21：Bash 写检测走"高频模式启发式 + 未匹配放行"，不追完备；依据 boucle.sh 头号失效模式与"理论不可封"的现实。
