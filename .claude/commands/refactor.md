---
name: refactor
description: 创建 refactor 型 REQ，通过 req:create --type refactor 自动填充特化内容。
---

# /refactor

## 目标

引导用户创建 refactor 型 REQ。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`
3. 确认当前无活跃 REQ（`requirements/INDEX.md` 中 `## 当前活跃 REQ` 下为"无"）。有活跃 REQ → 提示先完成或搁置当前 REQ

## 执行步骤

### Step 1: 收集重构信息

使用 AskUserQuestion 询问：

1. **重构目标**（必填）：要重构什么？如"将 session 管理从中间件抽取为独立模块"
2. **当前问题**（必填）：为什么需要重构？如"session 逻辑散布在 5 个文件中"
3. **为什么现在做**（可选）：触发原因

### Step 2: 创建 refactor REQ

运行：

```bash
npm run req:create -- --title "refactor: [重构目标]" --type refactor
```

### Step 3: 补充重构详情

用 Edit 将 REQ 中的占位符替换为用户提供的实际信息：
- `[请描述技术债或流程缺口]`（背景-当前问题）→ 用户的当前问题
- `[请描述触发原因]`（背景-为什么现在做）→ 用户的触发原因
- `[模块/流程]`（目标-重构）→ 用户的重构目标

### Step 4: 提示用户确认

**重点提醒**：
1. 确认"非目标"中的"不做功能行为变更"是否符合预期
2. 如果涉及文件数 ≥4，考虑是否拆分 REQ
3. 补充"颗粒度自检"
4. 确认后运行 `npm run req:start -- --id {reqId} --phase implementation`

## 输出

1. 创建的 REQ ID 和文件路径
2. REQ 类型：refactor
3. 已预填充：技术债描述占位、行为不变约束、skip-design-validation
4. 核心约束提醒：重构后所有测试必须通过，行为不能变
