---
name: bugfix
description: 创建 bugfix 型 REQ，自动填充 Bug 现象、影响范围、回归测试等特化字段，并预勾选 skip-design-validation。
---

# /bugfix

## 目标

引导用户快速创建 bugfix 型 REQ，自动填充适合 Bug 修复场景的内容模板。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`
3. 确认当前无活跃 REQ（`requirements/INDEX.md` 中 `## 当前活跃 REQ` 下为"无"）。有活跃 REQ → 提示先完成或搁置当前 REQ

## 执行步骤

### Step 1: 收集 Bug 信息

使用 AskUserQuestion 询问：

1. **Bug 简述**（必填）：一句话描述 Bug 现象，如"登录页面点击提交后无响应"
2. **影响范围**（必填）：哪些功能/用户受影响，如"所有使用邮箱登录的用户"
3. **已知的复现线索**（可选）：如有复现步骤或错误信息可在此提供

### Step 2: 创建 REQ 骨架

运行：

```bash
npm run req:create -- --title "fix: [Bug 简述]"
```

记录生成的 REQ ID（格式：REQ-YYYY-NNN）。

### Step 3: 读取并重写 REQ 文件

读取生成的 REQ 文件，获取动态值（reqId、日期），然后用 Write 工具重写整个文件为以下特化内容：

**替换规则**：
- `{reqId}` → 实际的 REQ ID
- `{title}` → "fix: [Bug 简述]"
- `{today}` → 当前日期 YYYY-MM-DD
- `{bug_description}` → 用户提供的 Bug 简述
- `{impact}` → 用户提供的影定范围
- `{repro_hint}` → 用户提供的复现线索（如有），否则填"待定位"

**特化内容模板**：

```markdown
# {reqId}: fix: {title}

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
Bug 现象：{bug_description}
影响范围：{impact}

## 目标
- 定位 Bug 根因
- 实现修复
- 添加回归测试防止复发

## 非目标
- 不做影响范围外的改动
- 不重构相关代码（除非 Bug 本身由代码质量问题引起）

## 颗粒度自检
- [ ] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？
- [ ] 涉及模块/目录 ≤ 4？
- [ ] 能否用一句话描述"解决了什么问题"？
- [ ] 如果失败，能否干净回滚？

## 范围
- 涉及目录 / 模块：待定位
- 影响接口 / 页面 / 脚本：{impact}

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：待定位（Bug 根因确定后补充）
- 可新增的测试 / 脚本：回归测试

**禁止（CANNOT）**：
- 不可修改与 Bug 无关的文件
- 不可引入新依赖

**边界条件**：
- 修复应最小化，只改必要的代码

## 验收标准
- [ ] Bug 不再复现
- [ ] 回归测试通过
- [ ] 相关功能不受影响
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/{reqId}-code-review.md`
- QA：`requirements/reports/{reqId}-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本仓库
- 需要的人工验证：手动复现确认 Bug 已修复

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：Bug 是否已修复？回归测试是否已添加？
- [ ] 旧功能保护：修复是否引入新问题？
- [ ] 逻辑正确性：修复是否针对根因而非症状？
- [ ] 完整性：是否处理了相关边界情况？
- [ ] 可维护性：修复代码是否清晰？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：修复是否只针对声明的 Bug？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，Bug 修复范围小
- 回滚方式：`git revert`

## 关键决策
- {today}：Bug 修复 REQ，skip-design-validation 已预勾选
```

### Step 4: 提示用户确认

输出创建的 REQ 信息，提示用户：
1. 检查自动填充的内容是否符合实际情况
2. 补充"颗粒度自检"（涉及文件数等）
3. 确认后运行 `npm run req:start -- --id {reqId} --phase implementation`

## 输出

向导完成后，输出：

1. **创建的 REQ ID 和文件路径**
2. **REQ 类型**：bugfix
3. **已预填充的字段**：Bug 现象、影响范围、目标（定位→修复→回归测试）、skip-design-validation
4. **下一步建议**：补充颗粒度自检，确认内容后运行 `req:start`

## 约束

- 不跳过 `req:create` 和 `req:start` 的验证逻辑
- 不自动填充颗粒度自检（由用户根据实际改动判断）
- 如果 `req:start` 因内容不足被拒绝，提示用户补充后重试
- 使用 Write 重写整个 REQ 文件，不使用 Edit 逐节替换（避免章节重复问题）
