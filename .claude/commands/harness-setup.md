---
name: harness-setup
description: 一键将 harness-lab 治理框架接入到当前项目。支持交互式选择模块、冲突检测、PreToolUse hook 配置。适用于已有项目快速接入治理框架。
---

# /harness-setup

## 目标

将 harness-lab 治理框架接入到当前项目，实现一键安装、交互式配置、冲突检测。

## 前置检查

开始安装前，确认以下条件：

1. **Git 仓库检测**
   - 检查当前目录是否为 Git 仓库
   - 如果不是，提示用户先初始化 Git

2. **现有治理文件检测**
   - 检查是否存在：`AGENTS.md`, `CLAUDE.md`, `requirements/`, `.claude/progress.txt`
   - 如果存在，记录冲突文件列表

## 执行步骤

### Step 1: 冲突处理

如果检测到现有治理文件：

```
检测到以下文件已存在：
- AGENTS.md
- requirements/INDEX.md

请选择处理方式：
1. 跳过已有文件（推荐）
2. 覆盖已有文件
3. 取消安装
```

### Step 2: 模块选择

使用 AskUserQuestion 工具询问用户要安装的模块：

**核心模块（必须安装）**：
- `AGENTS.md` - 治理规则主入口
- `CLAUDE.md` - 会话入口协议
- `requirements/` - REQ 生命周期管理
- `.claude/progress.txt` - 跨会话进度交接

**可选模块**：

| 模块 | 说明 | 默认 |
|------|------|------|
| `docs/` | 设计稿和规范目录 | ✅ |
| `context/` | 业务/技术/经验索引 | ✅ |
| `skills/` | 阶段导航技能 | ✅ |
| CLI 脚本 | req-cli.mjs, docs-*.mjs | ✅ |
| PreToolUse hook | 强制 REQ 检查 | ❌ |

### Step 3: 文件复制

根据用户选择，从 harness-lab 源目录复制文件到目标项目。

**源目录检测顺序**：
1. 环境变量 `HARNESS_LAB_SOURCE`
2. 当前项目的 `node_modules/harness-lab/`
3. 询问用户指定源目录

**复制规则**：
- 跳过 `.git/` 目录
- 跳过 `node_modules/` 目录
- 跳过用户选择不安装的模块
- 如果选择"跳过已有文件"，不覆盖冲突文件

### Step 4: 初始化配置

1. **创建目录结构**：
   ```
   requirements/
   ├── INDEX.md（已复制）
   ├── REQ_TEMPLATE.md（已复制）
   ├── in-progress/（创建空目录）
   ├── completed/（创建空目录 + README.md）
   └── reports/（创建空目录 + README.md）
   ```

2. **初始化 progress.txt**：
   ```text
   Current active REQ: none
   Current phase: idle
   Last updated: [当前日期]

   Summary:
   - Harness Lab 治理框架已接入

   Next steps:
   - 创建第一个 REQ

   Blockers:
   - None.
   ```

3. **配置 PreToolUse hook**（如果选择）：
   - 创建或更新 `.claude/settings.local.json`
   - 添加 PreToolUse hook 配置

### Step 5: 生成接入报告

创建 `requirements/reports/harness-setup-report.md`：

```markdown
# Harness Lab 接入报告

**日期**：[日期]
**源版本**：[harness-lab 版本]

## 已安装模块

- [x] 核心模块
- [x] docs/
- [x] context/
- [x] skills/
- [x] CLI 脚本
- [ ] PreToolUse hook

## 文件清单

[列出所有复制的文件]

## 后续步骤

1. 在 `package.json` 中绑定真实命令：
   ```json
   {
     "scripts": {
       "lint": "eslint .",
       "test": "vitest run",
       "build": "npm run build",
       "verify": "npm run lint && npm run test && npm run build"
     }
   }
   ```

2. 创建第一个 REQ：
   ```bash
   npm run req:create -- --title "Your first requirement"
   ```

3. 开始使用治理流程

## 注意事项

- 如果选择了 PreToolUse hook，每次修改文件前会检查 REQ 状态
- 小改动（<3 个文件）不会触发警告
- 可以使用 `.claude/.req-exempt` 临时豁免检查
```

## CLI 备选方案

如果用户不在 Claude Code 环境中，可以使用 CLI 脚本：

```bash
# 安装 harness-lab
npm install -D harness-lab

# 运行安装脚本
npx harness-install

# 或使用选项
npx harness-install --defaults        # 使用默认选项
npx harness-install --core-only       # 仅安装核心模块
npx harness-install --with-hook       # 包含 PreToolUse hook
```

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| 非 Git 仓库 | 提示先运行 `git init` |
| 找不到源目录 | 询问用户指定源目录 |
| 文件复制失败 | 记录失败的文件，继续复制其他文件 |
| hook 配置失败 | 跳过 hook 配置，在报告中说明 |

## 输出

安装完成后，输出以下信息：

1. **已安装模块列表**
2. **需要手动完成的步骤**（如绑定命令）
3. **下一步建议**（创建第一个 REQ）
4. **报告文件路径**
