# REQ-2026-019: 移除入口文档中的版本历史

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 AGENTS.md 和 CLAUDE.md 中包含"版本历史"部分，每次 REQ 完成都需要更新这些入口文档。这带来了问题：

1. **重复信息**：Git 已经记录了完整的改动历史，入口文档再记录是冗余
2. **维护负担**：每个 REQ 完成后都要更新两个入口文档
3. **价值有限**：用户很少从入口文档查看版本历史，更多使用 Git log
4. **触发循环同步**：docs-sync-rules 要求 INDEX.md 变更时同步到入口文档，但版本历史更新又触发新的同步需求

有价值的信息应该记录在：
- **Git log**：完整的改动历史
- **REQ 文件**：每个改动的详情
- **context/experience/**：可复用的经验沉淀

## 目标
- 删除 AGENTS.md 和 CLAUDE.md 中的版本历史部分
- 简化 docs-sync-rules.json，移除对入口文档的版本历史同步要求
- 减少未来 REQ 的维护负担

## 非目标
- 不删除 context/experience/ 目录
- 不改变 REQ 文件结构
- 不改变 Git 提交历史

## 范围
- 涉及目录 / 模块：`AGENTS.md`, `CLAUDE.md`, `scripts/docs-sync-rules.json`
- 影响接口 / 页面 / 脚本：无

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`AGENTS.md`, `CLAUDE.md`, `scripts/docs-sync-rules.json`
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：REQ 文件、context/experience/
- 不可引入的依赖 / 操作：无

## 验收标准
- [ ] AGENTS.md 中不再有版本历史部分
- [ ] CLAUDE.md 中不再有版本历史部分
- [ ] docs-sync-rules.json 简化后 req:complete 不再要求同步到入口文档

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-019-design.md`（不适用，文档清理）
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-019-code-review.md`
- QA：`requirements/reports/REQ-2026-019-qa.md`
- Ship：不适用（文档结构简化）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run check:governance`
- 需要的环境：Node.js
- 需要的人工验证：确认入口文档不再包含版本历史

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：用户可能习惯了从入口文档查看版本历史
- 回滚方式：恢复版本历史部分

## 关键决策
- 2026-03-30：版本历史记录在 Git 和 REQ 文件中，入口文档不再维护
- 2026-03-30：经验沉淀保留在 context/experience/ 目录

<!-- Source file: REQ-2026-019-remove-version-history-from-entry-docs.md -->
