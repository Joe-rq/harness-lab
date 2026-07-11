# REQ-2026-090: P0 canonical path 与多写目标门禁

## 状态
- 当前状态：completed
- 当前阶段：ship

## 背景
2026-07-10 全景评审确认，`req-check.js` 与 `scope-guard.mjs` 各自维护一份 Bash 写操作识别器，而且只返回单个 `targetPath`。路径判断使用字符串前缀或未经 canonicalization 的相对路径，因此 `../`、目录前缀碰撞、Windows 分隔符、符号链接祖先和复合命令可能绕过治理白名单或 REQ scope；`cp/mv/ln/sed -i` 与多重重定向还会漏掉实际写目标。

REQ-089 已闭合公开分发与安装链路。本 REQ 继续执行剩余 P0 中风险最高的门禁项，让“已声明支持的 Write/Bash 模式”具有共享、可解释、可测试的路径与多目标语义。

## 目标
- 建立共享写目标策略模块，统一直接文件工具和 Bash 命令的写目标识别与 canonical path 结果。
- 让 req-check 白名单和 scope-guard 对所有已识别目标做一致判断，任一目标越界都不能被第一个合法目标掩盖。
- 为无法完整解析的已识别写命令定义兼容策略：有显式 scope/只读边界时阻断，无 scope 的旧 REQ 保持兼容，显式豁免仍可用。
- 用对抗 fixture 固化 traversal、前缀碰撞、Windows 分隔符、符号链接、文件操作、原地编辑与复合重定向行为。

## 非目标
- 不实现完整 POSIX/PowerShell shell parser，不宣称可识别 `python -c`、`perl -e` 等任意解释器写入。
- 不把 Hook 提升为 OS 安全沙箱；平台不可强制边界继续如实记录。
- 不在本 REQ 统一 supervised/collaborative/autonomous 风险矩阵或 doctor profile；属于 P1。
- 不修改 REQ lifecycle、event-store、verifier、deploy-guard 或 worktree 状态架构。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（7 个实现文件；共享模块必须同时进入两个 Hook、npm tarball、安装 manifest、契约测试和用户边界文档，否则会产生不可运行或继续漂移的中间态，记录为原子例外）
- [x] 涉及模块/目录 ≤ 4？（共享 policy、两个 Hook、分发/测试、README）
- [x] 能否用一句话描述“解决了什么问题”？（合法首目标掩盖后续越界目标，以及非 canonical 路径绕过门禁）
- [x] 如果失败，能否干净回滚？（共享模块及两个消费者可整体回滚；不迁移用户状态）

## 范围
- 涉及文件：
  - `scripts/write-target-policy.mjs`（新增）
  - `scripts/req-check.js`
  - `scripts/scope-guard.mjs`
  - `scripts/harness-install.mjs`
  - `package.json`
  - `tests/governance.test.mjs`
  - `README.md`
- 涉及目录 / 模块：PreToolUse 路径策略、Bash 写目标识别、默认安装/发布、治理 fixture
- 影响接口 / 页面 / 脚本：Claude Code `Write|Edit|NotebookEdit|Bash` Hook 输入；无 UI

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：仅上述 7 个实现文件，以及本 REQ 的 design/review/QA/ship/experience 交付物。
- 可新增的测试 / 脚本：可新增共享 `write-target-policy.mjs`；测试只写入系统临时 fixture。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`req-cli.mjs`、`event-store.mjs`、`deploy-guard.mjs`、`harness-doctor.mjs`、Hook 配置和用户既有 session/worktree 数据。
- 不可引入的依赖 / 操作：不得新增第三方 shell parser；不得 commit、push、publish；不得删除历史兼容路径。

**边界条件**：
- 环境：Node.js 20+；路径策略使用 Node 标准库，在当前 OS 上处理实际 realpath，并对反斜杠输入做平台中立归一化。
- 兼容：纯读 Bash 仍零摩擦；无 scope 的旧 REQ 延续 allow；有 scope 时 unresolved/out-of-scope fail closed；`.claude/.req-exempt` 与 worktree exempt 均放行。
- 发布：共享策略必须加入 npm allowlist 与默认 CLI/Hook 安装清单，并由真实 tarball fixture 验证。

## 验收标准
- [x] 两个 Hook 只使用同一个写目标分类/路径 canonicalization 实现，不再维护重复 Bash classifier。
- [x] 直接文件工具和 Bash 路径正确处理 `.`、`..`、反斜杠、绝对路径、repo 前缀碰撞与现有符号链接祖先；repo 外路径不进入治理白名单。
- [x] 已支持的 redirect/tee/rm/touch/mkdir/cp/mv/ln/sed-perl inplace/复合命令返回全部写目标，且任一目标越界都会被 scope-guard 阻断。
- [x] req-check 仅在所有已解析目标都属于 `requirements/**`、`docs/plans/**` 或 `.claude/**` 时跳过 REQ；混合治理路径与业务路径必须执行 REQ 门禁。
- [x] 有显式 scope 或只读边界时，已识别但 unresolved、canonical 后越界或 scope 不匹配的写入被阻断；无 scope 旧 REQ与纯读 Bash 保持兼容。
- [x] scope-guard 尊重全局/worktree `.req-exempt`；豁免行为不新增静默后门，仍沿用现有豁免审计机制。
- [x] npm 发布包和默认安装包含共享策略模块；packed fresh-install Hook 可加载并运行。
- [x] 对抗测试覆盖 traversal、prefix collision、Windows separator、symlink ancestor、cp/mv/ln/sed、多重重定向、混合目标、unresolved 和 exemption；已声明场景零漏拦。
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm pack --dry-run --json` 全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-090-design.md`
- 评审依据：`reviews/harness-lab-review-2026-07-10.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-090-code-review.md`
- QA：`requirements/reports/REQ-2026-090-qa.md`
- Ship：`requirements/reports/REQ-2026-090-ship.md`

## 验证计划
- 计划执行的命令：`node --check`（三个 Hook/policy）；`npm test`；`npm run docs:verify`；`npm run check:governance`；`npm pack --dry-run --json --ignore-scripts`。
- 需要的环境：本仓库、Node.js 20+、git、npm；不依赖外网。
- 需要的人工验证：审阅支持模式与歧义策略是否和 README 一致；审阅所有目标的阻断原因是否可定位。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：共享 policy、全目标判断和 canonicalization 均有直接证据。
- [x] 旧功能保护：纯读、无 scope legacy、治理目录引导和豁免行为无回归。
- [x] 逻辑正确性：每类支持写命令的 source/destination 语义明确，未知目标不被误当纯读。
- [x] 完整性：源码、安装 manifest、npm allowlist、README、fixture 同步。
- [x] 可维护性：两个 Hook 不再复制 classifier；策略输出为结构化 targets/unresolved。

#### 对齐检查（record 阶段）
- [x] 目标对齐：只解决剩余 P0 门禁完整性，不提前实施 P1 mode/profile 架构。
- [x] 设计对齐：实现和设计稿的解析/路径/决策流一致。
- [x] 验收标准对齐：每条验收均有命令或对抗 fixture。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- Shell 识别保持“明确支持模式 + unresolved”策略，不追求通用解析器；退出条件是 pilot 发现新的高频漏拦模式，而非预先扩大语法面。

## 风险与回滚
- 风险：过度 fail-closed 误拦旧项目；通过“仅显式 scope/只读边界对 unresolved 阻断”控制兼容风险。
- 风险：简单 tokenizer 误判引号/option；测试覆盖引号、`--`、常见 flags 和复合分隔符，无法解析时返回 unresolved 而不伪装成 pure read。
- 风险：真实符号链接与不存在目标的 canonicalization 不一致；通过 nearest-existing-ancestor realpath 和 symlink fixture 验证。
- 回滚方式：整体移除共享策略模块并恢复两个 Hook 原 classifier；package/installer/README/测试同步回滚。

## 关键决策
- 2026-07-11：选择共享“write target + canonical path”策略，而不是继续维护两个正则副本。
- 2026-07-11：多目标采取 all-targets-must-pass；第一个合法目标不能掩盖后续越界目标。
- 2026-07-11：歧义策略按 scope 强度分级，有显式 scope/只读时阻断，无 scope legacy allow；豁免是唯一显式绕过入口。
- 2026-07-11：不把外部解释器写入包装为已支持能力，README 继续声明 best-effort 与 OS 边界。

<!-- Source file: REQ-2026-090-p0-canonical-path-multi-target-guard.md -->
