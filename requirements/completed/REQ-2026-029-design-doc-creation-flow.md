# REQ-2026-029: 优化设计文档创建流程

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 `req:create` 无条件创建设计文档模板（`docs/plans/REQ-xxx-design.md`），但很多 REQ 使用 `skip-design-validation` 豁免，导致空模板文件留在磁盘上从未被填充或提交。

**问题**：
- 空模板文件污染仓库
- 豁免是事后标记，无客观标准
- 用户可能养成"总是豁免"的坏习惯

## 目标
- `req:create` 不再自动创建设计文档模板
- `req:start` 时根据豁免状态决定是否检查设计文档
- 减少空模板文件的创建

## 非目标
- 不改变豁免机制的使用方式
- 不添加客观判断规则（如文件数量阈值）

## 范围
- 涉及目录 / 模块：scripts/req-cli.mjs
- 影响接口 / 页面 / 脚本：`req:create`、`req:start` 命令

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（流程优化无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/req-cli.mjs、scripts/req-validation.mjs
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本文件
- 不可引入的依赖 / 操作：外部 npm 包

**边界条件**：
- 改动规模或发布边界：流程优化

## 验收标准
- [ ] `req:create` 不再创建设计文档模板文件
- [ ] `req:start` 无豁免时提示"请先创建设计文档"
- [ ] `req:start` 有豁免时跳过设计文档检查
- [ ] 现有测试通过
- [ ] 新增流程测试用例

## 设计与实现链接
- 设计稿：无（流程调整）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-029-code-review.md`
- QA：`requirements/reports/REQ-2026-029-qa.md`
- Ship：不需要发布

## 验证计划
- 计划执行的命令：npm test
- 需要的环境：Node.js
- 需要的人工验证：手动测试 req:create 和 req:start 流程

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，流程调整
- 回滚方式：git revert

## 关键决策
- 2026-04-01：发现问题：空模板文件累积
- 2026-04-01：决策：延迟创建，按需生成

<!-- Source file: REQ-2026-029-design-doc-creation-flow.md -->
