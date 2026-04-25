---
name: feature
description: 创建 feature 型 REQ，自动填充用户痛点、业务背景、Scope Control 必填提示等特化字段。
---

# /feature

## 目标

引导用户创建 feature 型 REQ，自动填充适合新功能开发场景的内容模板。

## 前置检查

1. 确认 `requirements/` 目录存在。不存在 → 提示先运行 `/harness-setup`
2. 确认 `package.json` 中有 `req:create` 脚本。不存在 → 提示先运行 `/harness-setup`
3. 确认当前无活跃 REQ（`requirements/INDEX.md` 中 `## 当前活跃 REQ` 下为"无"）。有活跃 REQ → 提示先完成或搁置当前 REQ

## 执行步骤

### Step 1: 收集功能信息

使用 AskUserQuestion 询问：

1. **功能名称**（必填）：简短描述要实现的功能，如"用户邮箱验证"
2. **用户痛点**（必填）：用户当前遇到什么问题？如"用户可以用未验证的邮箱注册"
3. **业务背景**（可选）：为什么现在要做？有什么外部驱动？

### Step 2: 创建 REQ 骨架

运行：

```bash
npm run req:create -- --title "feat: [功能名称]"
```

记录生成的 REQ ID（格式：REQ-YYYY-NNN）。

### Step 3: 读取并重写 REQ 文件

读取生成的 REQ 文件，获取动态值（reqId、日期），然后用 Write 工具重写整个文件为以下特化内容：

**替换规则**：
- `{reqId}` → 实际的 REQ ID
- `{title}` → "feat: [功能名称]"
- `{today}` → 当前日期 YYYY-MM-DD
- `{feature_name}` → 用户提供的功能名称
- `{pain_point}` → 用户提供的痛点
- `{business_context}` → 用户提供的业务背景（如有），否则填"待补充"

**特化内容模板**：

```markdown
# {reqId}: feat: {title}

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
用户痛点：{pain_point}
业务背景：{business_context}

## 目标
- 实现 {feature_name}
- 补充相关测试
- 更新相关文档

## 非目标
- 不做 [相关但超出本次范围的功能]
- 不做 UI/UX 重设计（除非本功能需要）

## 颗粒度自检
- [ ] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？
- [ ] 涉及模块/目录 ≤ 4？
- [ ] 能否用一句话描述"解决了什么问题"？
- [ ] 如果失败，能否干净回滚？

## 范围
- 涉及目录 / 模块：待确认
- 影响接口 / 页面 / 脚本：待确认

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：[请列出本次可修改的范围]
- 可新增的测试 / 脚本：[请列出]

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：[请列出不在范围内的部分]
- 不可引入的依赖 / 操作：[请列出]

**边界条件**：
- 时间 / 环境 / 数据约束：[如有]
- 改动规模或发布边界：[如有]

## 验收标准
- [ ] 功能按设计实现
- [ ] 相关测试通过
- [ ] 文档已更新
- [ ] 现有功能不受影响

## 设计与实现链接
- 设计稿：`docs/plans/{reqId}-design.md`（Feature 建议创建设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/{reqId}-code-review.md`
- QA：`requirements/reports/{reqId}-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify`
- 需要的环境：本仓库
- 需要的人工验证：手动验证功能行为符合预期

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [ ] 旧功能保护：新功能是否破坏了现有功能？
- [ ] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [ ] 完整性：是否有遗漏的子功能？
- [ ] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否服务于最初的用户痛点？
- [ ] 设计对齐：实现是否符合设计文档？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：功能遗漏（对照验收标准检查）、与现有功能冲突
- 回滚方式：`git revert` 或功能开关关闭

## 关键决策
- {today}：Feature 型 REQ，建议创建设计文档
```

### Step 4: 提示用户确认

输出创建的 REQ 信息，提示用户：
1. 检查自动填充的内容是否符合实际需求
2. **重点补充 Scope Control 的 CAN/CANNOT**（feature 型最易功能蔓延）
3. 补充"颗粒度自检"
4. 考虑是否需要创建设计文档（`docs/plans/{reqId}-design.md`）
5. 确认后运行 `npm run req:start -- --id {reqId} --phase implementation`

## 输出

向导完成后，输出：

1. **创建的 REQ ID 和文件路径**
2. **REQ 类型**：feature
3. **已预填充的字段**：用户痛点、业务背景、目标、Scope Control 提示
4. **需要重点补充**：Scope Control CAN/CANNOT、颗粒度自检
5. **下一步建议**：补充 Scope Control，确认内容后运行 `req:start`

## 约束

- 不跳过 `req:create` 和 `req:start` 的验证逻辑
- 不自动填充颗粒度自检（由用户根据实际改动判断）
- 不自动勾选 skip-design-validation（Feature 建议创建设计文档）
- 如果 `req:start` 因内容不足被拒绝，提示用户补充后重试
- 使用 Write 重写整个 REQ 文件，不使用 Edit 逐节替换（避免章节重复问题）
