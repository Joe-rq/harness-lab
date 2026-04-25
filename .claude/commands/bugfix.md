---
name: bugfix
description: 创建 bugfix 型 REQ，通过 req:create --type bugfix 自动填充特化内容。
---

# /bugfix

## 目标

引导用户快速创建 bugfix 型 REQ。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`
3. 确认当前无活跃 REQ（`requirements/INDEX.md` 中 `## 当前活跃 REQ` 下为"无"）。有活跃 REQ → 提示先完成或搁置当前 REQ

## 执行步骤

### Step 1: 收集 Bug 信息

使用 AskUserQuestion 询问：

1. **Bug 简述**（必填）：一句话描述 Bug 现象，如"登录页面点击提交后无响应"
2. **影响范围**（必填）：哪些功能/用户受影响，如"所有使用邮箱登录的用户"

### Step 2: 创建 bugfix REQ

运行：

```bash
npm run req:create -- --title "fix: [Bug 简述]" --type bugfix
```

### Step 3: 补充 Bug 详情

用 Edit 将 REQ 中的占位符替换为用户提供的实际信息：
- `[请描述]`（背景-Bug 现象）→ 用户的 Bug 简述
- `[请描述]`（背景-影响范围）→ 用户的影响范围

### Step 4: 提示用户确认

提示用户：
1. 检查自动填充的内容是否符合实际情况
2. 补充"颗粒度自检"
3. 确认后运行 `npm run req:start -- --id {reqId} --phase implementation`

## 输出

1. 创建的 REQ ID 和文件路径
2. REQ 类型：bugfix
3. 已预填充：Bug 特化目标、skip-design-validation、回归测试验收标准
4. 下一步：补充颗粒度自检，运行 `req:start`
