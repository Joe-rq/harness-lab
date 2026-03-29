# Harness Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> AI 项目的研发治理层模板

## 这是什么

Harness Lab 是一套可内嵌到已有仓库的治理框架：

- **需求流转**：REQ 生命周期管理，从创建到完成全程追踪
- **协作入口**：人和 AI agent 按同一套协议接手工作
- **证据链**：review / QA / ship 报告落盘，可追溯可审计
- **上下文延续**：跨会话恢复工作状态，减少重复沟通

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

# 包含 PreToolUse hook
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --with-hook
```

### 手动接入

复制以下文件到目标项目：

- `AGENTS.md`
- `CLAUDE.md`
- `context/`
- `docs/`
- `requirements/`
- `scripts/`
- `skills/`
- `.claude/`

### 接入后配置

1. **绑定真实命令**：在 `package.json` 中配置 `lint`、`test`、`build`、`verify`

2. **创建第一个 REQ**：
   ```bash
   npm run req:create -- --title "Your first requirement"
   ```

3. **开始治理流程**

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
├── skills/                # 阶段导航技能
├── scripts/               # CLI 工具
├── .claude/commands/      # 可调用 skills
└── .claude/progress.txt   # 跨会话进度
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

# 启动
npm run req:start -- --id REQ-YYYY-NNN

# 阻塞（可选）
npm run req:block -- --id REQ-YYYY-NNN --reason "等待依赖"

# 完成
npm run req:complete -- --id REQ-YYYY-NNN
```

### 模板仓库命令

本仓库自带的治理验证命令：

| 命令 | 用途 |
|------|------|
| `npm test` | 运行仓库级自动化回归测试 |
| `npm run docs:impact` | 查看 changed files 触发的文档义务 |
| `npm run docs:impact:json` | JSON 格式输出（供 agent/CI 消费） |
| `npm run docs:verify` | 检查文档链接和同步约束 |
| `npm run check:governance` | 检查治理结构完整性 |

这些命令会结合当前 git 改动做 `diff-aware` 文档同步检查，用来约束入口文档、治理脚本和交付物说明保持一致。
GitHub Actions 也会在 `push` / `pull_request` 上自动运行 `npm test`、`npm run docs:verify` 和 `npm run check:governance`，把仓库级治理检查变成默认门禁。

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
- 持续迭代的产品仓库
- 多人或多 agent 协作项目
- 需要跨会话延续上下文的项目
- 需要完整闭环的项目（设计→实现→验证→发布→复盘）

**不适合**：
- 一次性脚本
- 临时 demo
- 不需要长期知识沉淀的实验仓库

## 成功标准

接入后，仓库应具备：
- 活跃 REQ 明确可见
- 重要需求有设计稿
- review / QA / ship 有固定落盘位置
- 验证命令真实可执行
- 新会话能快速恢复上下文
- 已完成工作沉淀为可复用经验

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
- 影响接入方式时同步更新 `README.md`、`AGENTS.md`、`CLAUDE.md`
- 新增脚本或命令后运行 `npm run docs:verify`

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT License](./LICENSE)
