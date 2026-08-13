# Harness Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> AI 项目的研发治理层模板

## 这是什么

Harness Lab 是一套可内嵌到已有仓库的治理框架：

- **需求流转**：REQ 生命周期管理，从创建到完成全程追踪
- **协作入口**：人和 AI agent 按同一套协议接手工作
- **证据链**：review / QA / ship 报告落盘，可追溯可审计
- **上下文延续**：跨会话恢复工作状态，减少重复沟通

**核心优势**：
- **零第三方运行依赖**：无 npm 依赖，依赖攻击面较小，一键接入
- **轻量高效**：零运行时依赖，约 1 万行治理脚本覆盖完整链路
- **透明可审计**：人工维护的治理资产以 Markdown 为主，运行时状态使用 JSON / JSONL，均可由 Git 和本地工具审阅

GitHub: [Joe-rq/harness-lab](https://github.com/Joe-rq/harness-lab)

## 这不是什么

- 不是业务框架（Web / App / Backend）
- 不替换目标项目的目录结构或运行时
- 不预设 lint / test / build 命令（由接入项目自行绑定）

## 快速开始

### 一键接入

**Claude Code 环境**：

```
/harness-setup
```

**命令行环境**：

```bash
# 在目标项目中运行
node /path/to/harness-lab/scripts/harness-install.mjs --defaults

# 只查看安装计划，不写入目标项目
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --dry-run

# 如果 package.json 位于 app/ 子目录，仍在 Git 根目录运行安装器
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --package-dir app

# 包含 PreToolUse hook
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --with-hook
# --with-hook 会配置 SessionStart + PreToolUse hooks
# PreToolUse 为硬阻断：无活跃 REQ 或 REQ scope 越界时禁止 Write/Edit
```

如果通过包分发方式安装，`package.json` 已暴露 `harness-install` bin，可使用：

```bash
npx --yes --package=harness-lab harness-install --defaults
npx --yes --package=harness-lab harness-install --defaults --dry-run
npx --yes --package=harness-lab harness-install --defaults --package-dir app
npx --yes --package=harness-lab harness-install --defaults --with-hook
```

这里显式区分 npm 包名 `harness-lab` 与 bin 名 `harness-install`，避免 `npx` 把 bin 名误当成另一个包名。发布前回归会从本地 tarball 执行同一个 bin，不依赖源码目录或 registry 缓存。

默认安装是治理引导，不是完整镜像；`watchdog`、`risk-tracker` 等高级 Hook 会随 npm 包发布，便于按 profile 选择，但不在默认安装清单中；测试、CI 和 `.claude/commands/` 也不会复制到目标项目。
默认 CLI 清单包含 status / experience / reflect / align / doctor / invariant 及 `worktree-utils.mjs` 等运行依赖。安装器回归测试会从真实 npm tarball 的 bin 完成安装并执行 REQ 生命周期，避免源码可运行却发布包不可运行。
安装器会写入无时间戳的 `.harness/profile.json`，记录 core/default/custom、实际模块、overlay 与 capability；同一 profile 重复安装时该记录字节稳定。重复安装会保留已有 `.claude/progress.txt` 和自定义 settings；只有复制与安装后验证全部成功时才返回 0 并显示“安装完成”，partial/failed 结果会保留诊断报告并返回非零。

安装完成后还会生成 `.harness/ownership.json`：它只认领 capability profile 中与发布源字节一致的文件，并保存逐文件 SHA-256 与 source version。显式升级时据此区分“未修改、已修改、新增、冲突”，不会因为路径相同就把用户内容当成模板文件。

模块文件、目标 package scripts、core/default profile、基础 Hook overlay、doctor 基础期望和 npm 发布文件均以 `scripts/capability-manifest.mjs` 为单一事实源。`package.json.files` 是 npm 要求的 checked-in 派生字段：修改能力后运行 `npm run capabilities:sync` 生成，再用 `npm run capabilities:check` 验证；installer、doctor 和契约测试不再各自维护完整 command/file map。测试仍保留少量独立语义能力 ID，避免 manifest 与消费者一起漏项时自证绿灯。

**平台支持与证据**：
- 目标支持 Windows、macOS、Linux，最低 Node.js 20；Windows 路径使用 Node.js 脚本，不要求 Bash。
- GitHub Actions 已配置 `ubuntu-latest / macos-latest / windows-latest × Node 20` 代表性矩阵，三格共用 `npm run ci:verify -- --require-node-major 20`，且 `fail-fast: false`。
- “workflow 已配置”不等于“平台已验证”。只有对应 Actions matrix run 成功且上传 `harness-ci-evidence.json` 后，才把该平台标记为通过；本地其他 Node 版本的成功结果只证明本机兼容，不替代 Node 20 runner 证据。

### 手动接入

复制以下文件到目标项目：

- `AGENTS.md`
- `CLAUDE.md`
- `context/`
- `docs/`
- `requirements/`
- `scripts/`
- `skills/`
- `.agents/skills/source-command-*`
- `.claude/`

### 接入后配置

1. **检查自动绑定结果**：如果目标项目已有 `lint`、`test`、`build`，安装器会尽量复用，并自动组合 `verify`

2. **确认 package 绑定位置**：默认绑定根目录 `package.json`；如果业务包在 `app/package.json`，使用 `--package-dir app` 或 `--package-json app/package.json`

3. **替换 placeholder guard**：如果安装器没有找到真实命令，会在目标 `package.json` 中写入 `node scripts/template-guard.mjs <name>` 作为占位提示；这些脚本需要后续替换成真实链路

4. **确认 hook 行为**：如果启用了 `--with-hook`，目标项目会在无活跃 REQ 或 REQ scope 越界时阻止文件修改；紧急小改动可用 `.claude/.req-exempt` 临时豁免

5. **自动配置**：`harness-install` 会自动追加 Harness Lab 运行时状态忽略段到目标 `.gitignore`（`.claude/.xxx-status` / `events/` / `worktrees/` 等，幂等），写入 `.harness/profile.json`，并安装 `harness-doctor.mjs`。`npm run harness:doctor` 会按 profile 只检查已选择能力，并报告缺失文件、record 外完整模块、非法 mode/profile 与 OPT-1 平台缺口；`--json` 输出 `{ profile, summary, checks, exitCode }`。文本和 JSON 只要存在 fail 都返回 1，只有 warn 仍返回 0。已有 progress 与合法 settings 默认保留；非法 settings 会在复制前报错且不被覆盖

   安装完成后先审阅接入 diff，并把它作为独立基线提交或以等价方式从后续业务 REQ 的 diff 中隔离。否则首个 REQ 完成时，diff-aware 文档门禁会把尚未归档的安装改动一并视为该 REQ 的变更并要求对应文档；不要用 `--no-docs-gate` 掩盖这种基线混杂。

6. **创建第一个 REQ**：
   ```bash
   npm run req:create -- --title "修复登录问题"
   ```

   没有可绑定 `package.json` 时，使用直接入口：
   ```bash
   node scripts/req-cli.mjs create --title "修复登录问题"
   ```

   标题可以是纯中文或其他非 ASCII 文字；CLI 会保留原标题，并在无法导出英文 slug 时使用安全的 `requirement` 文件名后缀。只有手工传 `--slug` 时，才要求使用小写 ASCII kebab-case。

   或使用交互式向导（Claude Code 环境）：
   ```
   /first-req
   ```

### 安全升级与恢复

升级必须显式执行。建议先看零写入计划，再应用：

```bash
npx --yes --package=harness-lab harness-install --upgrade --dry-run
npx --yes --package=harness-lab harness-install --upgrade
```

升级只替换相对 ownership baseline 未修改的受管文件，并安全加入新文件；用户修改、无可信 baseline 的旧文件和已删除的 owned 文件都会保留并进入冲突报告。它不修改目标 `package.json`、`.claude/settings.local.json`、progress/events/session、业务文件或历史 REQ，也不会自动删除上游已移除文件。

退出码约定：`0` 表示计划/升级无冲突，`2` 表示发现冲突但用户文件已保留（apply 时其他安全项仍可完成），`1` 表示 profile、路径、备份或写入错误。

实际写入前会在 `.harness/backups/<backup-id>/` 保存旧字节，结果写入 `.harness/upgrade-report.json` 与 `requirements/reports/harness-upgrade-report.md`。有冲突时安全项仍可升级，但 complete version 不推进；按报告处理后再运行 dry-run。恢复同样可先预览：

```bash
npx --yes --package=harness-lab harness-install --restore <backup-id> --dry-run
npx --yes --package=harness-lab harness-install --restore <backup-id>
```

旧项目没有 ownership 时会采用保守模式：与新 source 完全一致的文件可认领，缺失的新文件可加入，其他已有文件一律保留为冲突。这是基于 hash 的三方分类，不是自动内容合并。

新安装会自动把 `.harness/backups/` 加入 `.gitignore`。较早接入的项目如果 Doctor/upgrade 提示该目录未忽略，应先人工审阅并补上这一行，避免把本地恢复副本提交到仓库。

7. **写实 REQ 内容**：`req:create` 只会生成骨架。开始实施前，需要先补齐真实背景、目标、验收标准

8. **开始治理流程**

#### 自动绑定结果怎么看

安装完成后，优先检查这两个地方：

- 目标 `package.json` 里的 `scripts`，例如根目录 `package.json` 或 `app/package.json`
- `requirements/reports/harness-setup-report.md`

常见结果有两种：

**目标项目已经有真实脚本**：

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run",
    "build": "next build",
    "verify": "npm run lint && npm run test && npm run build"
  }
}
```

这表示安装器保留了原有真实命令，并自动补出了 `verify`。

**目标项目缺少真实脚本**：

```json
{
  "scripts": {
    "lint": "node scripts/template-guard.mjs lint",
    "test": "node scripts/template-guard.mjs test",
    "build": "node scripts/template-guard.mjs build",
    "verify": "node scripts/template-guard.mjs verify"
  }
}
```

这表示治理骨架已经接入，但这些命令还需要目标项目自己绑定成真实链路。

上面的 npm scripts 只适用于确有 `package.json` 的项目。Python、Go、Rust 或其他技术栈应从项目现有配置、CI 和维护者说明中确认真实命令；例如 `pytest`、`go test ./...`、`cargo test` 都只是“配置存在时”的候选，不能因识别到技术栈就直接当作通过证据。没有可信命令时，应在 REQ 中明确记录缺口。

## 核心目录

```
.
├── AGENTS.md              # 治理规则主入口
├── CLAUDE.md              # 会话启动协议
├── requirements/          # REQ 状态中心
│   ├── INDEX.md           # 活跃 REQ 索引
│   ├── REQ_TEMPLATE.md    # REQ 模板
│   ├── in-progress/       # 进行中需求
│   ├── completed/         # 已完成需求
│   └── reports/           # review/QA/ship 报告
├── docs/plans/            # 设计稿
├── docs/specs/            # 产品/API 规范
├── context/               # 业务/技术/经验索引
│   └── invariants/        # 经验回流：结构化不变量规则
├── skills/                # 阶段导航技能
├── .agents/skills/        # Claude Code source-command skills
├── scripts/               # CLI 工具
├── .claude/commands/      # 可调用 skills
├── .claude/progress.txt   # 跨会话进度（主仓库）
└── .claude/worktrees/     # worktree 本地进度隔离
```

## 默认工作方式

### 基本原则

1. 先看索引（`requirements/INDEX.md`），不读完整个仓库
2. 先确认活跃 REQ，再决定读哪些内容
3. 需求、设计、实现、评审、验证、发布都要落盘
4. 验证结论只在命令真实执行后成立

### REQ 生命周期

```bash
# 创建
npm run req:create -- --title "Feature name"

# 先补齐 REQ 的真实内容，再启动
npm run req:start -- --id REQ-YYYY-NNN

# 阻塞（可选）
npm run req:block -- --id REQ-YYYY-NNN --reason "等待依赖" --condition "依赖交付并验证" --next "恢复 implementation"

# 满足恢复条件后，重新进入 implementation
npm run req:start -- --id REQ-YYYY-NNN --phase implementation

# 查看当前 REQ 状态（人类可读）
npm run req:status

# 查看当前 REQ 状态（JSON，供外部编排器消费）
npm run req:status -- --json

# 按 REQ ID 查询任意 REQ 状态（含 completed / blocked）
npm run req:status -- --json --id REQ-YYYY-NNN

# 创建经验文档（完成前必须；OPT-3 起自动聚合 REQ 背景/git 关联提交/报告结论/事件账本时间线为草稿，人工确认沉淀要点后删除 AUTO-DRAFT 标记）
npm run req:experience -- --id REQ-YYYY-NNN

# 完成
npm run req:complete -- --id REQ-YYYY-NNN

# 元反思（verify 阶段）
npm run req:reflect -- --id REQ-YYYY-NNN

# 对齐检查（record 阶段）
npm run req:align -- --id REQ-YYYY-NNN
```

**结构化错误分类**：REQ 生命周期与 REQ 状态门禁使用带错误代码、类型和恢复策略的错误分类；其他 Hook 按 Claude Hook 协议返回 `decision` / `reason` / `additionalContext`，不承诺所有 Hook 共用同一种文本格式。错误代码对照：

| 代码 | 类型 | 场景 |
|------|------|------|
| E001 | NO_ACTIVE_REQ | 无活跃 REQ |
| E002 | REQ_NOT_FOUND | REQ 文件不存在 |
| E003 | REQ_DRAFT_STATUS | REQ 仍为 draft 状态 |
| E004 | REQ_TEMPLATE_EMPTY | REQ 模板未填充 |
| E005 | DOCS_DRIFT | 文档同步缺失 |
| E006 | MISSING_REPORTS | 缺少必需报告 |
| E007 | MISSING_EXPERIENCE | 缺少经验文档 |
| E008 | EXEMPT_ABUSED | 豁免机制滥用 |

### 模板仓库命令

本仓库自带的治理验证命令：

| 命令 | 用途 |
|------|------|
| `npm run capabilities:check` | 检查 capability manifest 与 npm 发布文件派生结果是否一致 |
| `npm run capabilities:sync` | 从 manifest 确定性更新 `package.json.files`（修改后需审阅 diff） |
| `npm test` | 运行仓库级自动化回归测试 |
| `npm run docs:impact` | 查看 changed files 触发的文档义务 |
| `npm run docs:impact:json` | JSON 格式输出（供 agent/CI 消费） |
| `npm run docs:verify` | 检查文档链接和同步约束 |
| `npm run check:governance` | 检查治理结构完整性（含 hook 配置一致性和 R4 覆盖检查） |
| `npm run req:audit` | 审计 REQ 完成态、报告链接、验收复选框和 INDEX/progress 一致性 |
| `npm run governance:health` | 输出治理健康总览（REQ、报告、经验、不变量、脚本绑定） |
| `npm run harness:doctor` | 诊断项目接入健康状态 |
| `npm run harness:matcher-smoke` | 离线检查 canonical Claude matcher；可附加 `--doctor`、`--prepare`、`--evidence` 形成真实 CLI 证据 |
| `npm run ci:verify` | 无平台 shell 编排地执行 tests / capability / docs / governance / doctor / pack，并可输出机器可读证据 |
| `npm run pilot:observe` | 初始化、追加、汇总和验证外部 pilot 的脱敏 observation；原始数据仅保存在 pilot 项目 |
| `npm run req:status -- --all` | 按真实 Git worktree 拓扑只读聚合 active / suspended REQ 与冲突 |

这些命令会结合当前 git 改动做 `diff-aware` 文档同步检查，用来约束入口文档、治理脚本和交付物说明保持一致。
GitHub Actions 在 `push` / `pull_request` 或手动 `workflow_dispatch` 上用三平台 Node 20 matrix 执行同一 `ci:verify`。该入口通过参数数组依次运行四组测试、capability sync check、docs verify、governance check、Doctor JSON/exit 与候选包隐私检查；每个 matrix 格独立上传不含时间戳和本机路径的 evidence，失败可定位到具体阶段。

Claude matcher 验证分三层：自动化测试验证 `Write|Edit|NotebookEdit|Bash` 的正负集合与 installer 产物，`npm run harness:matcher-smoke -- --doctor --config .claude/settings.example.json` 使用当前真实 Claude CLI 校验配置，interactive smoke 再用 `--prepare /tmp/harness-matcher` 生成一次性 logger，要求同一会话的 Read 不命中、Bash 命中。直接向 Hook 脚本注入 stdin 只能证明脚本行为，不能替代 matcher 分发；`claude -p` 已知不触发 PreToolUse，也不能作为该证据。

外部采用按 [Pilot Protocol](./docs/pilots/README.md) 记录：JavaScript、Python、monorepo 各需两个真实业务 REQ 和 14–28 天 observation。`pilot:observe` 只接受固定枚举事件与 `.harness/pilot/` 相对路径，拒绝任意 payload、路径泄漏、倒序时间和不足 14 天的 complete；豁免率按“使用过豁免的 completed cycles / completed cycles”计算，不用缺失的 Hook 操作数制造假精度。原始 JSONL 默认加入 `.gitignore`，本仓库只收脱敏 summary。
`req:audit --all` 默认输出摘要，避免历史 warning 长列表淹没新增问题；需要完整明细时使用 `node scripts/req-audit.mjs --all --verbose`，需要抽样查看时使用 `--max-findings N`。JSON 输出保留 `{ ok, findings }`，并额外提供 `summary` 供自动化消费。
`requirements/audit-baseline.json` 记录已知 warning 基线；它不是 suppression，`findings` 仍完整保留。`req:audit` 只在 warning bucket 内比较基线；`governance:health` 把 error 与超基线 warning 归为 regressions，把基线内 warning 归为 known debt，避免把历史债务误报成新增回归。
仓库状态统一由 `scripts/state-semantics.mjs` 解释：REQ 区分 active / draft / suspended / completed / public example；blocked/suspended 不占用 active 槽位。Invariant 健康数排除模板，并按 source/id 去重；重复文件仍作为可定位 warning 报告，不会被静默删除。
Stage 2 事件账本已完成退出确认。基础 API 位于 `scripts/event-store.mjs`，提供治理事件 schema、append-only JSONL 写入、读取排序、schema 校验、progress projection 和 worktree-aware 聚合；`session-start.js` 和 `req-cli.mjs` 会以 best-effort 方式写入会话启动与 REQ 生命周期事件。当前 checkout 的 namespaced events 是运行态事实，`.claude/progress.txt` 只作 events 缺失时的兼容缓存，`requirements/INDEX.md` 是当前分支可审阅索引而非跨 worktree 数据库。`req:status --all` 通过 `git worktree list --porcelain` 发现真实 checkout，再只读各 checkout 的本地事件；输出 root、branch、active、suspended 与重复 active 冲突，只报告、不自动合并。旧 linked checkout 错写的 `main` namespace仅作只读兼容，不再产生。对应事件、兼容与真实双 worktree E2E 已纳入 `npm test`。
对于目标项目，`harness-install` 现在会尝试自动绑定已有真实 `lint / test / build`，并在缺失时写入 placeholder guard，避免接入后只剩 README 提示；治理脚本使用 git-status-backed 命令，`req:complete` / `docs:verify` / `check:governance` 都会读取 `.claude/.xxx-status`。
安装器默认保留目标项目已有 REQ、报告和经验历史；如需清理带 Harness Lab 模板标记的历史文件，必须显式传入 `--clean-template-history`。
`npm test` 还覆盖 `/harness-setup` command、`source-command-harness-setup` skill 和 `harness-install` package bin 的契约同步，防止一键接入说明与真实分发入口漂移。
安装器测试会从真实 npm tarball 安装 fixture，通过目标项目的 npm aliases 跑中文 create、start、status、block、resume、experience、reflect、align、complete 和 doctor，并额外验证直接 Node CLI 入口；同时实际运行 `session-start.js` 与带豁免的 `req-check.js`，确保迁移结果不是只有文件存在，而是 README 公开入口可执行。
SessionStart 与 PreToolUse hook 入口已统一为跨平台的 `scripts/session-start.js` / `scripts/req-check.js` / `scripts/scope-guard.mjs`，旧的 `*.sh` 版本不再分发；如果你的本地配置仍指向 `.sh`，请同步替换为 `node scripts/*.js` / `node scripts/*.mjs`（参考 `.claude/settings.example.json`）。

PreToolUse 的 Bash 判断由共享 `write-target-policy.mjs` 提供：明确支持重定向、`tee` / `sponge`、`rm` / `touch` / `mkdir`、`cp` / `mv` / `ln`、`sed` / `perl` 原地编辑及其复合命令。策略会收集全部写目标，并通过 `.` / `..`、反斜杠、绝对路径和现有符号链接祖先的 canonical path 判断范围；只有所有目标均属于治理目录时，req-check 才允许无 REQ 的引导写入。

对已识别但含变量、glob 或缺失 operand 的写命令，策略会标记为 unresolved：有显式 scope 或只读边界时 scope-guard 阻断，无 scope 的历史 REQ 保持兼容。确需执行时应使用有审计记录的 `.claude/.req-exempt`，而不是依赖第一个合法目标绕过后续目标。

### 高级治理机制

以下机制在模板仓库中完整运行，目标项目按需启用。

**Hook 类型**：除基础的 SessionStart + PreToolUse 外，还支持：

| Hook 类型 | 脚本 | 用途 |
|-----------|------|------|
| PostToolUse | `loop-detection.mjs` / `risk-tracker.mjs` / `watchdog.mjs` | 编辑后循环检测、风险追踪、停滞看门狗 |
| PreCompact | `precompact-notify.mjs` | 上下文压缩前生成快照 |
| Stop | `stop-evaluator.mjs` | 防假完成评估 |
| SessionEnd | `session-reflect.mjs` | 会话反思与经验沉淀 |

目标项目通过 `--with-hook` 获得基础 hook（SessionStart + PreToolUse，其中 PreToolUse 包含 REQ 状态检查和 scope-guard）；高级 hook 需参考 `.claude/settings.local.json` 手动添加。

**安装 profile 与 Harness 模式是两件事**：`--with-hook` 只决定安装基础 SessionStart + PreToolUse；高级 Hook 需要手动配置。`.harness/profile.json` 描述“安装了什么”，`.claude/harness-mode`（默认 `collaborative`）描述“风险点如何处置”。八个风险点的 action/effect 统一由 `scripts/hook-policy.mjs` 的完整矩阵决定，各 Hook 只负责适配自身事件协议。

| Hook / 风险点 | collaborative | supervised | autonomous |
|----------------|---------------|------------|------------|
| `req-check`：无有效 REQ / 模板 REQ | 阻断（不读取 mode） | 阻断（不读取 mode） | 阻断（不读取 mode） |
| `scope-guard`：越界、只读或 unresolved 写入 | 阻断 + 恢复提示 | 阻断 + 恢复提示 | 阻断 + 恢复提示 |
| `deploy-guard`：危险命令（高级 Hook） | 提醒并允许 | 阻断 | 阻断 |
| `review-gatekeeper`：审查 Agent 使用可写类型（高级 Hook） | 阻断 + 建议只读类型 | 阻断 + 要求只读类型 | 阻断 + 建议只读类型 |
| `risk-tracker`：R3+ 编辑后（高级 Hook） | 提醒 | 强提醒；PostToolUse 本身不阻断 | 允许并记录 |
| `watchdog`：停滞/循环（高级 Hook） | 友好提醒 | 要求选择恢复策略，但允许 | 执行恢复提示并记录，允许 |
| `stop-evaluator`：疑似未覆盖验收（高级 Hook） | 提醒 | 阻断停止 | 阻断停止 |
| `precompact-notify`（高级 Hook） | 压缩前生成快照 | 压缩前生成快照 | 压缩前生成快照并记录审计事件 |

这张表是 `hook-policy.mjs` 的用户可读投影；契约测试逐格覆盖 8 个风险点 × 3 种模式，并检查所有 mode-aware Hook 都消费同一策略源。

**Verifier 系统**：`HARNESS_VERIFIER_MODE` 环境变量控制 review/QA 独立验证模式（`legacy` / `envelope` / `subagent`），详见 `CONTRIBUTING.md`。

### 模板仓库 vs 目标项目

第一次接入时，最容易混淆的是这两套命令：

**模板仓库命令**：
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`

这些命令只用于验证 `harness-lab` 仓库自身是否健康。

**目标项目命令**：
- `lint`
- `test`
- `build`
- `verify`

这些名称是安装器在 `package.json` 项目中的候选 alias，不是所有技术栈的强制接口。业务项目必须使用自己的真实验证链路；Harness Lab 只负责帮你复用、补齐或显式标出缺口，不替你决定应该怎么构建和测试。多技术栈条件示例见 `context/tech/testing-strategy.md`。
同样地，Harness Lab 会帮你创建 REQ 骨架，但不会替你填写真实需求内容；空模板 REQ 既不能通过 `PreToolUse`，也不能执行 `req:start`。

### 人类维护者最短路径

1. `AGENTS.md`
2. `requirements/INDEX.md`
3. `.claude/progress.txt`
4. 当前 REQ、最近完成 REQ 和必要报告

### AI agent / Codex 完整路径

1. `AGENTS.md`
2. `requirements/INDEX.md`
3. `.claude/progress.txt`
4. 相关 `context/*/README.md`
5. 当前 REQ、设计稿、报告和必要代码

## 适用场景

**适合**：
- 使用 AI 辅助开发的个人软件工程师
- 需要跨会话延续上下文的项目
- 需要完整闭环的项目（设计→实现→验证→发布→复盘）

**不适合**：
- 多人协作项目（无权限、无并发控制）
- 一次性脚本
- 临时 demo
- 不需要长期知识沉淀的实验仓库

**已知限制**：
- 单用户设计：无多租户/权限系统，不适合多人同时操作同一仓库
- 无并发控制：文件系统存储，多人/多 agent 同时写入可能导致数据丢失
- **REQ 门禁不可强制场景**（PreToolUse 上游限制，`npm run harness:doctor` 会提示）：
  - subagent 工具调用不触发 PreToolUse（claude-code #21460 / #34692）
  - `claude -p` 非交互模式不触发（#40506）
  - `perl -e` / `python -c` 等任意解释器写文件（理论不可封；共享策略只覆盖明确列出的高频 shell 写模式，不求值变量、command substitution 或任意脚本代码）
  - 剩余缺口建议 OS 级兜底：文件权限（只读 checkout）、容器化隔离、CI 侧独立校验

**worktree 支持**：
- 可用 `git worktree` 为每个 REQ 创建独立工作目录并行推进
- 每个 worktree 使用 Git worktree admin identity，而不是可变 branch name，写入独立的 `.claude/worktrees/{identity}/events/` 与 `progress.txt`
- `harness-install` 默认会迁移 `worktree-utils.mjs`，启用 hook 时跨平台 `session-start.js` / `req-check.js` 也能读取 worktree 专属 progress 与 `.req-exempt`
- blocked/suspended REQ 进入 suspended 列表，不再被误判为 active；resume/completed 会清除对应 suspended 状态
- `INDEX.md` 可记录当前分支的多个 REQ，但不作为跨 worktree 运行态聚合源
- 主仓库（非 worktree）模式行为完全不变

**Claude Code 使用约定**：
- 一个 worktree 只能有一个 active REQ；多个并行 REQ 使用多个 worktree
- 推荐优先用 Claude Code 原生入口：`claude --worktree {name}` 或 `claude -w {name}`
- Claude Code 默认会在 `.claude/worktrees/{name}/` 下创建隔离 worktree；需要自定义目录或复用分支时再手动 `git worktree add`
- 新 worktree 需要 `.env` 等 gitignored 本地文件时，使用 `.worktreeinclude` 声明要复制的文件
- 日常 `feature` / `bugfix` / `refactor` source-command skills 只检查当前 worktree 的 `npm run req:status`
- 需要并行新开 REQ 时使用 `source-command-worktree-req` 引导创建 worktree、创建 REQ、启动 REQ 和收尾
- `npm run req:status -- --all` 按真实 Git worktree 拓扑查看各 checkout 的 active / suspended 状态、root、branch 与重复 active 冲突；该命令只读，不协调或改写其他 worktree

## 成功标准

接入后，仓库应具备：
- 活跃 REQ 明确可见
- 重要需求有设计稿
- review / QA / ship 有固定落盘位置
- 验证命令真实可执行
- 新会话能快速恢复上下文
- 已完成工作沉淀为可复用经验
- 经验自动回流为不变量规则，在后续操作中主动提醒

## 示例文档

仓库内含脱敏示例，演示完整治理链路：

- [REQ 示例](./requirements/completed/REQ-2026-900-example-status-filter.md)
- [搁置 REQ 示例](./requirements/in-progress/REQ-2026-901-suspended-example.md)
- [设计稿示例](./docs/plans/REQ-2026-900-design.md)
- [Code Review 示例](./requirements/reports/REQ-2026-900-code-review.md)
- [QA 示例](./requirements/reports/REQ-2026-900-qa.md)
- [Ship 示例](./requirements/reports/REQ-2026-900-ship.md)

## Contributing

欢迎基于真实项目实践改进。

提交前：
- 说明要解决的模板问题或使用痛点
- 优先修改索引、模板、skills，而非引入业务特化假设
- 影响接入方式时同步更新 `README.md`、`AGENTS.md`、`CLAUDE.md`、`.claude/commands/harness-setup.md` 和 `.agents/skills/source-command-harness-setup/SKILL.md`
- 新增脚本或命令后运行 `npm run docs:verify`

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT License](./LICENSE)
