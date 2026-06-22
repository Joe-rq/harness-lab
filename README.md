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
- **零外部依赖**：无 npm 依赖，无供应链风险，一键接入
- **轻量高效**：零运行时依赖，约 1 万行治理脚本覆盖完整链路
- **透明可审计**：所有数据均为 Markdown 文件，Git 友好

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
npx harness-install --defaults
npx harness-install --defaults --dry-run
npx harness-install --defaults --package-dir app
npx harness-install --defaults --with-hook
```

默认安装是治理引导，不是完整镜像；`watchdog`、`risk-tracker`、测试、CI 和 `.claude/commands/` 等高级治理能力不在默认安装清单中。
默认 CLI 清单包含 `worktree-utils.mjs` 等运行时依赖，安装器回归测试会在迁移后的临时项目中实际执行 `req-cli.mjs` 与跨平台 hook，避免只复制入口脚本却遗漏依赖。

**平台支持**：
- 支持 Windows、macOS、Linux
- Windows 环境使用 Node.js 跨平台脚本（无需 bash）

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

5. **创建第一个 REQ**：
   ```bash
   npm run req:create -- --title "Your first requirement"
   ```

   没有可绑定 `package.json` 时，使用直接入口：
   ```bash
   node scripts/req-cli.mjs create --title "Your first requirement"
   ```

   或使用交互式向导（Claude Code 环境）：
   ```
   /first-req
   ```

6. **写实 REQ 内容**：`req:create` 只会生成骨架。开始实施前，需要先补齐真实背景、目标、验收标准

7. **开始治理流程**

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
npm run req:block -- --id REQ-YYYY-NNN --reason "等待依赖"

# 查看当前 REQ 状态（人类可读）
npm run req:status

# 查看当前 REQ 状态（JSON，供外部编排器消费）
npm run req:status -- --json

# 按 REQ ID 查询任意 REQ 状态（含 completed / blocked）
npm run req:status -- --json --id REQ-YYYY-NNN

# 创建经验文档（完成前必须）
npm run req:experience -- --id REQ-YYYY-NNN

# 完成
npm run req:complete -- --id REQ-YYYY-NNN

# 元反思（verify 阶段）
npm run req:reflect -- --id REQ-YYYY-NNN

# 对齐检查（record 阶段）
npm run req:align -- --id REQ-YYYY-NNN
```

**结构化错误分类**：治理 Hook 输出使用统一的错误格式，包含错误代码、错误类型和恢复策略。错误代码对照：

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
| `npm test` | 运行仓库级自动化回归测试 |
| `npm run docs:impact` | 查看 changed files 触发的文档义务 |
| `npm run docs:impact:json` | JSON 格式输出（供 agent/CI 消费） |
| `npm run docs:verify` | 检查文档链接和同步约束 |
| `npm run check:governance` | 检查治理结构完整性（含 hook 配置一致性和 R4 覆盖检查） |
| `npm run req:audit` | 审计 REQ 完成态、报告链接、验收复选框和 INDEX/progress 一致性 |
| `npm run governance:health` | 输出治理健康总览（REQ、报告、经验、不变量、脚本绑定） |
| `npm run harness:doctor` | 诊断项目接入健康状态 |
| `npm run req:status -- --all` | 查看所有 worktree / 全局索引中的活跃 REQ |

这些命令会结合当前 git 改动做 `diff-aware` 文档同步检查，用来约束入口文档、治理脚本和交付物说明保持一致。
GitHub Actions 也会在 `push` / `pull_request` 上自动运行 `npm test`、`npm run docs:verify` 和 `npm run check:governance`，把仓库级治理检查变成默认门禁。
`req:audit --all` 默认输出摘要，避免历史 warning 长列表淹没新增问题；需要完整明细时使用 `node scripts/req-audit.mjs --all --verbose`，需要抽样查看时使用 `--max-findings N`。JSON 输出保留 `{ ok, findings }`，并额外提供 `summary` 供自动化消费。
`requirements/audit-baseline.json` 记录已知 legacy warning 基线；它不是 suppression，`findings` 仍完整保留。`req:audit` 和 `governance:health` 会展示当前 warning 是否超出基线，帮助发现新增治理债务。
`governance:health` 会区分 legacy/current warning，并展示 top finding code 和 baseline 状态，帮助判断治理债务主要集中在哪类规则。
Stage 2 事件账本已完成退出确认。基础 API 位于 `scripts/event-store.mjs`，提供治理事件 schema、append-only JSONL 写入、读取排序、schema 校验、progress projection 和 worktree-aware 聚合；`session-start.js` 和 `req-cli.mjs` 会以 best-effort 方式写入会话启动与 REQ 生命周期事件，并优先从事件投影读取当前进度，`progress.txt` 保留为缓存/回退输入。`req:status --all` 优先展示 `.claude/events` 与 `.claude/worktrees/*/events` 的只读聚合结果，并只报告冲突、不自动合并状态。对应回归测试为 `tests/event-store.test.mjs` 和 `governance.test.mjs` 的事件写入、projection 与 worktree aggregation 断言，已纳入 `npm test`。
对于目标项目，`harness-install` 现在会尝试自动绑定已有真实 `lint / test / build`，并在缺失时写入 placeholder guard，避免接入后只剩 README 提示；治理脚本使用 git-status-backed 命令，`req:complete` / `docs:verify` / `check:governance` 都会读取 `.claude/.xxx-status`。
安装器默认保留目标项目已有 REQ、报告和经验历史；如需清理带 Harness Lab 模板标记的历史文件，必须显式传入 `--clean-template-history`。
`npm test` 还覆盖 `/harness-setup` command、`source-command-harness-setup` skill 和 `harness-install` package bin 的契约同步，防止一键接入说明与真实分发入口漂移。
安装器测试会在复制完成后的 fixture 中实际运行 `node scripts/req-cli.mjs status`、`node scripts/session-start.js` 和带豁免的 `node scripts/req-check.js`，确保迁移结果不是只有文件存在，而是核心入口可执行。
SessionStart 与 PreToolUse hook 入口已统一为跨平台的 `scripts/session-start.js` / `scripts/req-check.js` / `scripts/scope-guard.mjs`，旧的 `*.sh` 版本不再分发；如果你的本地配置仍指向 `.sh`，请同步替换为 `node scripts/*.js` / `node scripts/*.mjs`（参考 `.claude/settings.example.json`）。

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

**Harness 模式**：通过 `.claude/harness-mode` 文件切换（默认 `collaborative`）：
- `collaborative`：hook 阻断 + 提醒
- `supervised`：仅提醒不阻断
- `autonomous`：静默记录，不打断流程

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

这些命令属于被接入的业务项目，必须反映那个项目的真实验证链路。Harness Lab 只负责帮你复用、补齐或显式标出缺口，不替你决定业务项目应该怎么构建和测试。
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
  - `perl -e` / `python -c` 等任意解释器写文件（理论不可封；req-check 仅覆盖高频模式 `>` / `>>` / `tee` / `sed -i` / `rm` / `mv` / `cp` / `touch` / `mkdir` / `ln` / heredoc）
  - 剩余缺口建议 OS 级兜底：文件权限（只读 checkout）、容器化隔离、CI 侧独立校验

**worktree 支持**：
- 可用 `git worktree` 为每个 REQ 创建独立工作目录并行推进
- 每个 worktree 拥有独立的 `.claude/worktrees/{branch}/progress.txt`
- `harness-install` 默认会迁移 `worktree-utils.mjs`，启用 hook 时跨平台 `session-start.js` / `req-check.js` 也能读取 worktree 专属 progress 与 `.req-exempt`
- `INDEX.md` 可同时记录多个活跃 REQ
- 主仓库（非 worktree）模式行为完全不变

**Claude Code 使用约定**：
- 一个 worktree 只能有一个 active REQ；多个并行 REQ 使用多个 worktree
- 推荐优先用 Claude Code 原生入口：`claude --worktree {name}` 或 `claude -w {name}`
- Claude Code 默认会在 `.claude/worktrees/{name}/` 下创建隔离 worktree；需要自定义目录或复用分支时再手动 `git worktree add`
- 新 worktree 需要 `.env` 等 gitignored 本地文件时，使用 `.worktreeinclude` 声明要复制的文件
- 日常 `feature` / `bugfix` / `refactor` source-command skills 只检查当前 worktree 的 `npm run req:status`
- 需要并行新开 REQ 时使用 `source-command-worktree-req` 引导创建 worktree、创建 REQ、启动 REQ 和收尾
- `npm run req:status -- --all` 用于查看所有 worktree / 全局索引中的活跃 REQ

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
