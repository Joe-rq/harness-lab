# REQ-2026-028: 补充关键路径测试

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前测试覆盖了 REQ 生命周期主流程，但缺少以下关键路径测试：
1. `req:block` 命令：阻塞 REQ 流程
2. `req:complete --docs-gate`：文档门禁检查

这些路径在实际使用中频繁触发，缺少测试可能导致回归问题。

## 目标
- 添加 `req:block` 命令测试
- 添加 `req:complete --docs-gate` 测试
- 提升测试覆盖率

## 非目标
- 不追求 100% 覆盖率
- 不测试边缘场景（如并发、大文件等）

## 范围
- 涉及目录 / 模块：tests/governance.test.mjs
- 影响接口 / 页面 / 脚本：无

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（测试用例，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：tests/governance.test.mjs
- 可新增的测试 / 脚本：测试用例

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：生产代码
- 不可引入的依赖 / 操作：外部测试框架

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：测试增强

## 验收标准
- [ ] 添加 `req:block` 命令测试用例
- [ ] 添加 `req:complete --docs-gate` 测试用例
- [ ] 所有测试通过（`npm test`）

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-028-design.md`（豁免）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-028-code-review.md`
- QA：`requirements/reports/REQ-2026-028-qa.md`
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
- 风险：无风险，仅添加测试
- 回滚方式：git revert

## 关键决策
- 2026-04-01：来自评审结论 P2 行动项

<!-- Source file: REQ-2026-028-critical-path-tests.md -->
