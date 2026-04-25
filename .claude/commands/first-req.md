---
name: first-req
description: 交互式首个 REQ 向导，引导新用户在 5 分钟内创建第一个 REQ。自动识别项目类型，推荐模板字段。
---

# /first-req

## 目标

引导新用户快速创建第一个 REQ，降低接入摩擦。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`

## 执行步骤

### Step 1: 项目类型识别

通过以下信号自动识别项目类型：

| 信号 | 项目类型 |
|------|---------|
| 存在 `package.json` + `react` 依赖 | React |
| 存在 `package.json` + `next` 依赖 | Next.js |
| 存在 `package.json` + `vue` 依赖 | Vue |
| 存在 `pyproject.toml` 或 `setup.py` | Python |
| 存在 `go.mod` | Go |
| 存在 `Cargo.toml` | Rust |
| 以上都不匹配 | Generic |

### Step 2: 用 AskUserQuestion 询问 REQ 主题

使用 AskUserQuestion 工具，提供 3 个推荐选项 + 自定义输入：

**推荐选项根据项目类型生成**：

- React/Next.js 项目：组件开发、状态管理、API 集成
- Python 项目：数据处理、API 开发、测试覆盖
- Go 项目：性能优化、并发处理、API 开发
- Generic：Bug 修复、功能开发、代码重构

### Step 3: 创建 REQ

根据用户选择的主题，运行：

```bash
npm run req:create -- --title "[用户选择的主题]"
```

### Step 4: 自动填充 REQ 内容

创建完成后，自动读取生成的 REQ 文件，填充以下内容：

**背景**：基于项目类型和主题生成一段简短描述。

**目标**：根据主题类型推荐 2-3 个目标。

**验收标准**：根据主题类型推荐 2-3 个可验证的标准。

**主题与字段映射**：

| 主题类型 | 推荐目标 | 推荐验收标准 |
|---------|---------|------------|
| 组件开发 | 实现组件、编写测试、补充文档 | 组件可渲染、测试通过、Storybook 可用 |
| Bug 修复 | 定位根因、实现修复、回归测试 | Bug 不再复现、回归测试通过 |
| API 开发 | 实现端点、参数校验、错误处理 | API 可调通、4xx/5xx 处理正确 |
| 测试覆盖 | 识别未覆盖路径、编写测试 | 覆盖率提升至目标值 |
| 代码重构 | 消除重复、改善命名、保持行为 | 重构后测试仍通过 |

### Step 5: 启动 REQ

提示用户确认 REQ 内容是否满意，然后运行：

```bash
npm run req:start -- --id [创建的 REQ ID] --phase implementation
```

## 输出

向导完成后，输出：

1. **创建的 REQ ID 和文件路径**
2. **REQ 当前状态**
3. **下一步建议**：直接开始实施，或先补充更多细节

## 约束

- 不跳过 `req:create` 和 `req:start` 的验证逻辑
- 不自动填充颗粒度自检（由用户自己判断）
- 如果 `req:start` 因内容不足被拒绝，提示用户补充后重试
- 整个流程应在 5 分钟内完成（从运行命令到 REQ 进入 in-progress）
