---
name: feature
description: 创建 feature 型 REQ，通过 req:create --type feature 自动填充特化内容。
---

# /feature

## 目标

引导用户创建 feature 型 REQ。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`
3. 确认当前无活跃 REQ（`requirements/INDEX.md` 中 `## 当前活跃 REQ` 下为"无"）。有活跃 REQ → 提示先完成或搁置当前 REQ

## 执行步骤

### Step 1: 收集功能信息

使用 AskUserQuestion 询问：

1. **功能名称**（必填）：简短描述要实现的功能，如"用户邮箱验证"
2. **用户痛点**（必填）：用户当前遇到什么问题？
3. **业务背景**（可选）：为什么现在要做？

### Step 2: 创建 feature REQ

运行：

```bash
npm run req:create -- --title "feat: [功能名称]" --type feature
```

### Step 3: 补充功能详情

用 Edit 将 REQ 中的占位符替换为用户提供的实际信息：
- `[请描述]`（背景-用户痛点）→ 用户的痛点
- `[请描述]`（背景-业务背景）→ 用户的业务背景
- `[功能名称]`（目标）→ 用户的实际功能名称

### Step 4: 提示用户确认

**重点提醒**：
1. Scope Control 的 CAN/CANNOT 必须填写（feature 型最易功能蔓延）
2. 考虑是否需要创建设计文档（`docs/plans/{reqId}-design.md`）
3. 补充"颗粒度自检"
4. 确认后运行 `npm run req:start -- --id {reqId} --phase implementation`

## 输出

1. 创建的 REQ ID 和文件路径
2. REQ 类型：feature
3. 已预填充：用户痛点/业务背景占位、Scope Control 必填提示、建议创建设计文档
4. 下一步：补充 Scope Control CAN/CANNOT，运行 `req:start`
