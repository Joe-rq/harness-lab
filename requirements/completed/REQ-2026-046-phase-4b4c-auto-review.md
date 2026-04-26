# REQ-2026-046: Phase 4B+4C — Auto QA & Auto Review

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 4A 确保了审查 Agent 的隔离性。现在需要自动化审查本身——AI 能自动运行测试、检查代码质量、生成 QA 和 Code Review 报告。这是"自审查"的核心：机械验证替代人工判断。

## 目标
- auto-qa.mjs：读取 REQ 验证计划，自动执行验证命令，生成 QA 报告
- auto-review.mjs：读取 git diff，对照 REQ 范围检查，运行基础代码检查，生成 Code Review 报告
- self-review.md：slash command 触发自审查流程（调用 auto-qa + auto-review）

## 非目标
- 不替代 npm test（auto-qa 是额外的质量层）
- 不做深度安全扫描（如 SAST）
- 不修改现有 hooks

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（3 个新文件）
- [x] 涉及模块/目录 ≤ 4？（scripts/ + .claude/commands/）
- [x] 能否用一句话描述"解决了什么问题"？→ AI 自动审查自己的代码质量
- [x] 如果失败，能否干净回滚？→ 删除 3 个文件即可

## 范围

> 声明本 REQ 允许修改的文件/目录（scope-guard 据此拦截越界操作）。
> 支持通配符：`*`（单层匹配）、`**`（任意深度）。无声明则不拦截（向后兼容）。

- 涉及文件：
  - `scripts/auto-qa.mjs`
  - `scripts/auto-review.mjs`
  - `.claude/commands/self-review.md`

### 约束（Scope Control，可选）

**豁免项**：
- [ ] skip-design-validation（小改动无需设计文档）
- [x] skip-experience（本 REQ 无值得沉淀的复用经验）
- [ ] skip-req-validation（紧急修复跳过 REQ 内容检查）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/auto-qa.mjs（新建）、scripts/auto-review.mjs（新建）、.claude/commands/self-review.md（新建）
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：现有 hooks 和脚本
- 不可引入的依赖 / 操作：无

## 验收标准
- [ ] auto-qa.mjs 能读取 REQ 验证计划，执行验证命令，生成 QA 报告
- [ ] auto-review.mjs 能读取 git diff，检查安全模式，生成 Code Review 报告
- [ ] /self-review slash command 可触发自动审查流程
- [ ] 生成的报告格式与现有 reports/ 目录下的一致

## 设计与实现链接
- 设计稿：无
- 相关规范：unified-roadmap.md Phase 4

## 报告链接
- Code Review：`requirements/reports/REQ-2026-046-code-review.md`
- QA：`requirements/reports/REQ-2026-046-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：
  - `node scripts/auto-qa.mjs --req REQ-2026-045` → 应生成 QA 报告
  - `node scripts/auto-review.mjs --req REQ-2026-045` → 应生成 Code Review 报告
  - `npm test` → 全部通过
- 需要的环境：无特殊要求
- 需要的人工验证：检查报告格式和内容合理性

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] **目标实现**：自动 QA 和 Code Review 是否可用？
- [ ] **旧功能保护**：现有 hooks 和测试是否正常？
- [ ] **逻辑正确性**：报告生成逻辑是否准确？
- [ ] **完整性**：是否覆盖了基本的检查项？
- [ ] **可维护性**：检查规则是否易于扩展？

#### 对齐检查（record 阶段）
- [ ] **目标对齐**：实现是否服务于自审查目标？
- [ ] **设计对齐**：是否符合路线图 Phase 4.2+4.3？
- [ ] **验收标准对齐**：所有验收标准是否都有对应实现？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：验证命令可能因环境差异失败
- 回滚方式：删除 3 个新文件

## 关键决策
- 2026-04-26：auto-qa 和 auto-review 作为 CLI 脚本（node 直接运行），而非 hook。它们由 /self-review slash command 或用户手动触发。
