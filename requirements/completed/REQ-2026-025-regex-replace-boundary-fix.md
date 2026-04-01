# REQ-2026-025: 修复正则替换边界风险

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`setReqStatusAndPhase` 函数使用简单正则 `/^- 当前状态：.*$/m` 匹配任意位置的状态行。如果 REQ 文档其他位置（如代码示例、引用）包含相同模式，会被误替换。

**风险场景**：
```markdown
## 状态
- 当前状态：draft

## 背景
以下是错误示例：
- 当前状态：示例状态  <-- 会被误替换！
```

## 目标
- 限定状态/阶段替换仅在 `## 状态` 章节内
- 添加边界测试用例验证修复

## 非目标
- 不改变 REQ 模板结构
- 不影响其他替换函数

## 范围
- 涉及目录 / 模块：scripts/req-cli.mjs
- 影响接口 / 页面 / 脚本：setReqStatusAndPhase 函数

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（函数级修复，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/req-cli.mjs、tests/governance.test.mjs
- 可新增的测试 / 脚本：边界测试用例

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本文件
- 不可引入的依赖 / 操作：外部 npm 包

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：小规模函数修复

## 验收标准
- [ ] `setReqStatusAndPhase` 只替换 `## 状态` 章节内的状态行
- [ ] 文档其他位置的相同模式不会被替换
- [ ] 添加边界测试用例
- [ ] `npm test` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-025-design.md`（豁免）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-025-code-review.md`
- QA：`requirements/reports/REQ-2026-025-qa.md`
- Ship：不需要发布

## 验证计划
- 计划执行的命令：npm test
- 需要的环境：Node.js
- 需要的人工验证：代码审查

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，函数级修复
- 回滚方式：git revert

## 关键决策
- 2026-04-01：来自评审结论 P1 行动项

<!-- Source file: REQ-2026-025-regex-replace-boundary-fix.md -->
