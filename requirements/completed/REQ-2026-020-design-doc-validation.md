# REQ-2026-020: 设计文档内容验证

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

`check-governance.mjs` 只检查设计文档是否存在，不检查内容是否是模板占位符。`req:start` 只验证 REQ 文件内容，没有验证设计文档。

这和之前 REQ 本身的问题一样——可以在 `docs/plans/REQ-xxx-design.md` 放一个空模板，通过所有治理检查。

## 目标
- 在 `req:start` 阶段增加设计文档内容验证
- 阻断设计文档为空模板的 REQ 进入实施阶段
- 提供豁免机制，允许小改动跳过设计文档要求

## 非目标
- 不验证设计文档质量（只检查"有没有"，不评判"好不好"）
- 不修改 `check-governance.mjs` 的职责范围

## 范围
- 涉及目录 / 模块：`scripts/req-cli.mjs`、`scripts/req-validation.mjs`
- 影响接口 / 页面 / 脚本：`req:start` 命令

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-cli.mjs`、`scripts/req-validation.mjs`
- 可新增的测试 / 脚本：`tests/design-validation.test.mjs`

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`check-governance.mjs`（不在本次范围）
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：小规模改动，仅涉及验证逻辑

## 验收标准
- [ ] `req:start` 检查设计文档是否存在
- [ ] `req:start` 检查设计文档是否包含模板占位符
- [ ] REQ 约束章节标注"设计文档豁免"时跳过验证
- [ ] 测试覆盖：空模板阻断、有内容通过、豁免跳过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-020-design.md`
- 相关规范：REQ-2026-018（报告存在性检查，可复用验证框架）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-020-code-review.md`
- QA：`requirements/reports/REQ-2026-020-qa.md`
- Ship：`requirements/reports/REQ-2026-020-ship.md`（不适用，模板仓库无发布）

## 验证计划
- 计划执行的命令：
  - `npm test` - 运行测试
  - `npm run check:governance` - 治理检查
- 需要的环境：Node.js 20+
- 需要的人工验证：手动测试 `req:start` 阻断/通过场景

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：现有 REQ 可能没有填写完整的设计文档，需要补填
- 回滚方式：移除验证逻辑

## 关键决策
- 2026-03-30：选择方案 1（在 req:start 验证），而非方案 2（在 check-governance 验证）
- 2026-03-30：豁免机制通过 REQ 约束章节标注

<!-- Source file: REQ-2026-020-design-doc-validation.md -->
