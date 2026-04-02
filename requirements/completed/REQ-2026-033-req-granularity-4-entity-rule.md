# REQ-2026-033: REQ 颗粒度 4 实体原则

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

现有治理框架缺少"一个 REQ 应该多大"的明确上限：

1. **规则不完整**：CLAUDE.md 只规定"3+ 文件需要 REQ"，但没规定"一个 REQ 最多涉及多少实体"
2. **实践问题**：可能出现 4 目标但 8 文件的 REQ，违反"最佳对话模式 = 4 实体以内"原则
3. **判断模糊**：新项目引入时缺乏颗粒度判断依据

核心洞察：「最佳的对话模式，依然是一个 Session，只处理 4 个实体以内。」

## 目标

- **目标 1**：在 CLAUDE.md 中明确"一个 REQ 涉及实体数 ≤ 4"的上限规则
- **目标 2**：在 REQ_TEMPLATE.md 中添加颗粒度自检清单
- **目标 3**：更新"是否需要 REQ"判断表，区分"需要 REQ"和"需要拆分"

## 非目标

- 不在 `req:create` 时自动检测实体数（未来可扩展）
- 不改变现有的"3+ 文件需要 REQ"触发条件
- 不引入新的 CLI 命令

## 范围

- 涉及目录 / 模块：
  - `CLAUDE.md`（添加颗粒度规则）
  - `requirements/REQ_TEMPLATE.md`（添加自检清单）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（小改动，2 个文件，内容已明确）

**允许（CAN）**：
- 修改 CLAUDE.md 添加颗粒度规则
- 修改 REQ_TEMPLATE.md 添加自检清单

**禁止（CANNOT）**：
- 修改现有 REQ 的内容
- 引入新的自动化检查逻辑

**边界条件**：
- 改动规模：2 个文档文件
- 向后兼容：现有 REQ 不受影响

## 验收标准

- [x] CLAUDE.md 包含"4 实体原则"说明
- [x] CLAUDE.md 更新判断表，区分"需要 REQ"和"需要拆分"
- [x] REQ_TEMPLATE.md 包含颗粒度自检清单（5 项）
- [x] `npm test` 通过
- [x] `npm run check:governance` 通过

## 设计与实现链接

- 设计稿：本文档即设计（小改动无需单独设计稿）
- 相关规范：CLAUDE.md 中的"实施前检查点"章节

## 报告链接

- Code Review：`requirements/reports/REQ-2026-033-code-review.md`
- QA：`requirements/reports/REQ-2026-033-qa.md`
- Ship：不适用（文档改进）

## 验证计划

- 计划执行的命令：
  - `npm test` - 确保测试通过
  - `npm run check:governance` - governance 检查通过
- 需要的环境：本地 Node.js 环境
- 需要的人工验证：检查文档内容是否清晰

## 阻塞 / 搁置说明（可选）

- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚

- 风险：
  - 规则过于严格可能增加 REQ 数量
  - "实体"定义不够清晰可能导致判断分歧
- 回滚方式：
  - 恢复 CLAUDE.md 和 REQ_TEMPLATE.md 到上一版本

## 关键决策

- 2026-04-02：创建 REQ-2026-033，基于"4 实体原则"讨论
- 2026-04-02：决定实体定义 = 文件 + 模块 + 概念
- 2026-04-02：决定不在 CLI 自动检测（保持轻量）

<!-- Source file: REQ-2026-033-req-granularity-4-entity-rule.md -->
