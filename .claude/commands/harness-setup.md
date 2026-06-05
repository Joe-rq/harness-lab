---
name: harness-setup
description: 一键将 harness-lab 治理框架接入到当前项目。支持模块选择、冲突检测、PreToolUse hook 配置和 CLI 安装回退。适用于已有项目快速接入治理框架。
---

# /harness-setup

## 目标

将 harness-lab 治理框架接入到当前 Git 项目，并让安装结果与当前仓库的真实治理契约一致。

## 前置检查

1. **Git 仓库检测**
   - 当前目录必须包含 `.git/`
   - 如果不是 Git 仓库，先提示用户运行 `git init`

2. **现有治理文件检测**
   - 检查是否存在：`AGENTS.md`, `CLAUDE.md`, `requirements/`, `.claude/progress.txt`
   - 如果存在，记录冲突文件列表
   - 当前安装器的真实策略是默认跳过已有文件，避免覆盖目标项目内容

## 推荐执行方式

在目标项目中运行：

```bash
node /path/to/harness-lab/scripts/harness-install.mjs --defaults
```

如果目标项目的 `package.json` 在子目录（例如 `app/package.json`），仍在 Git 根目录运行安装器，并显式指定脚本绑定位置：

```bash
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --package-dir app
```

包含治理 hooks：

```bash
node /path/to/harness-lab/scripts/harness-install.mjs --defaults --with-hook
```

如果 harness-lab 以 npm 包形式安装，`package.json` 暴露 `harness-install` bin 后，也可以使用：

```bash
npx harness-install --defaults
npx harness-install --defaults --package-dir app
npx harness-install --defaults --with-hook
```

## 模块

**核心模块（必须安装）**：
- `AGENTS.md` - 治理规则主入口
- `CLAUDE.md` - 会话入口协议
- `requirements/` - REQ 生命周期管理
- `.claude/progress.txt` - 跨会话进度交接

**默认模块**：

| 模块 | 说明 | 默认 |
|------|------|------|
| `docs/` | 设计稿和规范目录 | yes |
| `context/` | 业务/技术/经验索引 | yes |
| `skills/` 与 `.agents/skills/source-command-*` | 阶段导航技能、Claude Code source-command skills（含 `worktree-req`） | yes |
| CLI 脚本 | `req-cli.mjs`, `req-audit.mjs`, `governance-health.mjs`, `req-validation.mjs`, `error-classifier.mjs`, `event-store.mjs`, `worktree-utils.mjs`, `docs-verify.mjs`, `check-governance.mjs`, `docs-sync-rules.json`, `template-guard.mjs` | yes |
| 治理 hooks | `.claude/settings.example.json`, `scripts/session-start.js`, `scripts/req-check.js`, 本地 hook 配置 | no，需 `--with-hook` |

## 安装器真实行为

1. **源目录**
   - 默认使用安装脚本所在仓库作为源目录
   - 可通过 `--source /path/to/harness-lab` 显式指定

2. **冲突处理**
   - 检测已存在文件
   - 默认跳过已存在文件
   - 当前不实现覆盖/取消的交互式分支

3. **初始化配置**
   - 创建或补齐 `requirements/` 目录结构
   - 默认保留目标项目已有 REQ、报告和经验历史；仅在 `--clean-template-history` 下清理带模板标记的历史文件
   - 初始化 `.claude/progress.txt`
   - 生成 `requirements/reports/harness-setup-report.md`

4. **配置 hooks（如果选择）**
   - 创建或更新 `.claude/settings.local.json`
   - 添加 `SessionStart + PreToolUse` 的 `command` hooks
   - `PreToolUse` 为硬阻断：无活跃 REQ、空模板 REQ 或 draft REQ 时拒绝 `Write/Edit`
   - macOS/Linux 使用 Git 根目录定位脚本；Windows 使用 Node.js 跨平台脚本

5. **绑定目标项目命令**
   - 如果目标项目已有真实 `lint / test / build`，自动复用这些脚本
   - 如果 `verify` 缺失，按已有真实脚本自动组合可行的 `npm run lint && npm run test && npm run build` 子集
   - 对缺失的标准命令写入 `node scripts/template-guard.mjs <name>` placeholder guard
   - 自动补齐 `req:*`, `docs:*`, `check:governance` 等治理脚本
   - 默认只绑定根目录 `package.json`
   - 可通过 `--package-dir app` 或 `--package-json app/package.json` 绑定子目录 package；治理文件仍安装在当前 Git 项目根目录
   - 如果未检测到可绑定 package，会在报告中给出 `node scripts/req-cli.mjs` fallback 和候选 package 建议

## 接入后检查

安装完成后，优先检查：

1. `requirements/reports/harness-setup-report.md`
2. `package.json` 中自动绑定的脚本
3. `.claude/settings.local.json`（仅启用 hooks 时）

下一步：

```bash
npm run req:create -- --title "Your first requirement"
```

如果没有可绑定的 `package.json`，使用：

```bash
node scripts/req-cli.mjs create --title "Your first requirement"
```

然后补齐 REQ 的真实背景、目标、验收标准，再执行：

```bash
npm run req:start -- --id REQ-YYYY-NNN --phase implementation
```

## 注意事项

- `req:create` 只会生成骨架，不代表 REQ 已可直接实施
- 如果启用 PreToolUse hook，无活跃 REQ、空模板 REQ 或 draft REQ 都会阻断 Write/Edit
- Claude Code 下遵循“一个 worktree 一个 active REQ”；需要并行新开 REQ 时使用 `source-command-worktree-req`
- 紧急小改动可用 `.claude/.req-exempt` 临时豁免，完成后应删除
- 自动绑定只会复用标准脚本名，不猜测 `test:unit`、`check`、`build:prod` 等非标准脚本语义
- `npx harness-install` 依赖包分发时暴露 `bin`，本地开发时优先使用 `node scripts/harness-install.mjs`
- 默认安装是治理引导，不是完整镜像；`scope-guard`、`watchdog`、`risk-tracker`、测试、CI 和 `.claude/commands/` 不在默认安装清单中
