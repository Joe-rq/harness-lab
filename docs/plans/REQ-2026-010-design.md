# REQ-2026-010 Design

## Background

harness-lab 是 AI 项目的治理框架，需要被引入到其他项目中。当前接入方式需要手动复制多个文件，步骤繁琐且容易遗漏。

**核心问题**：
1. 手动复制文件容易遗漏
2. 缺乏冲突检测机制
3. PreToolUse hook 配置复杂
4. 没有统一的接入体验

## Goal

- 创建 `/harness-setup` skill，一键接入治理框架
- 交互式选择安装模块
- 自动检测并避免覆盖
- 可选配置 hooks

## Scope

### In scope

- `.claude/commands/harness-setup.md` - 可调用的 skill
- `scripts/harness-install.mjs` - CLI 安装脚本（备选方案）
- 模块清单和安装逻辑

### Out of scope

- 非 Claude Code 环境支持
- CI/CD 配置
- 自动绑定 lint/test/build 命令

## Design

### 模块划分

#### 1. 核心模块（必须安装）

| 文件/目录 | 说明 |
|----------|------|
| `AGENTS.md` | 治理规则主入口 |
| `CLAUDE.md` | 会话入口协议 |
| `requirements/` | REQ 生命周期管理 |
| `.claude/progress.txt` | 跨会话进度交接 |

#### 2. 可选模块

| 文件/目录 | 说明 | 默认 |
|----------|------|------|
| `docs/` | 设计稿和规范目录 | ✅ 推荐 |
| `context/` | 业务/技术/经验索引 | ✅ 推荐 |
| `skills/` | 阶段导航技能 | ✅ 推荐 |
| `scripts/req-cli.mjs` | REQ CLI 工具 | ✅ 推荐 |
| `scripts/docs-*.mjs` | 文档验证脚本 | ✅ 推荐 |
| `scripts/docs-sync-rules.json` | 文档同步规则 | ✅ 推荐 |
| PreToolUse hook | 强制 REQ 检查 | ❌ 可选 |

#### 3. 初始化操作

- 创建空的 `.claude/progress.txt`
- 创建 `requirements/in-progress/` 和 `requirements/completed/` 目录
- 更新 `requirements/INDEX.md`（清空活跃 REQ）
- 配置 `.claude/settings.local.json`（如果选择 hook）

### 交互流程

```
┌─────────────────────────────────────────────────────────┐
│  /harness-setup                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: 环境检测                                        │
│  ├── 检测是否为 Git 仓库                                 │
│  ├── 检测现有治理文件                                    │
│  └── 如果有冲突，提示用户选择：跳过/覆盖/取消            │
│                                                          │
│  Step 2: 模块选择                                        │
│  ├── [x] 核心模块（必须）                                │
│  ├── [x] docs/ 目录                                      │
│  ├── [x] context/ 目录                                   │
│  ├── [x] skills/ 目录                                    │
│  ├── [x] CLI 脚本                                        │
│  └── [ ] PreToolUse hook（需要 REQ 检查）               │
│                                                          │
│  Step 3: 文件复制                                        │
│  └── 复制选中的文件到目标项目                            │
│                                                          │
│  Step 4: 初始化配置                                      │
│  ├── 创建目录结构                                        │
│  ├── 配置 hook（如果选择）                               │
│  └── 生成接入报告                                        │
│                                                          │
│  Step 5: 后续引导                                        │
│  ├── 提示绑定真实命令                                    │
│  └── 提示创建第一个 REQ                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Skill 文件结构

```markdown
---
name: harness-setup
description: 一键将 harness-lab 治理框架接入到当前项目。支持交互式选择模块、冲突检测、hook 配置。
---

# /harness-setup

## 目标
将 harness-lab 治理框架接入到当前项目。

## 执行步骤
1. 检测环境
2. 交互式选择模块
3. 复制文件
4. 初始化配置
5. 生成报告

## 模块清单
[... 模块列表 ...]

## 输出
- 安装的文件列表
- 需要手动完成的步骤
- 下一步建议
```

### CLI 脚本设计

```bash
# 交互模式
npm run harness:install

# 非交互模式（使用默认选项）
npm run harness:install -- --defaults

# 仅安装核心模块
npm run harness:install -- --core-only

# 包含 hook
npm run harness:install -- --with-hook

# 指定源目录
npm run harness:install -- --source /path/to/harness-lab
```

### 冲突检测逻辑

```javascript
// 检测现有文件
const existingFiles = checkExistingFiles(targetDir, modules);

if (existingFiles.length > 0) {
  // 提示用户选择处理方式
  // - Skip: 跳过已有文件
  // - Overwrite: 覆盖已有文件
  // - Cancel: 取消安装
}
```

## Product Review

### User Value

- 解决的问题：治理框架接入繁琐，容易遗漏配置
- 目标用户：希望使用 harness-lab 的项目维护者
- 预期收益：5 分钟内完成接入，减少配置错误

### Recommendation

- **Proceed** - 核心用户体验改进

## Engineering Review

### Architecture Impact

- 影响模块：新增 `.claude/commands/` 和 `scripts/harness-install.mjs`
- 依赖方向：无新增依赖
- 边界：安装工具独立于治理核心

### Verification

- 自动验证：
  - skill 文件格式检查
  - CLI 脚本语法检查
- 人工验证：
  - 在新项目中测试安装流程
  - 冲突检测场景测试
- 回滚：删除安装的文件即可

## Implementation Checklist

- [ ] 创建 `.claude/commands/harness-setup.md`
- [ ] 创建 `scripts/harness-install.mjs`
- [ ] 定义模块清单
- [ ] 实现冲突检测逻辑
- [ ] 实现交互式选择
- [ ] 实现 hook 配置
- [ ] 生成接入报告
- [ ] 测试安装流程
