# REQ-2026-045: Phase 4A — Review Agent Isolation

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 3 提供了安全护栏（scope-guard、risk-tracker、harness-mode）。现在需要 AI 自审查能力——关键是审查 Agent 和实现 Agent 必须隔离。审查 Agent 物理上不能编辑文件，确保审查的独立性和可信度。

## 目标
- 检测 review/audit 类型子 Agent 的创建
- 强制审查 Agent 使用只读 subagent_type（Explore/Plan）
- 阻断使用 general-purpose 类型的审查 Agent

## 非目标
- 不修改 subagent_type 的工具定义（Claude Code 内部机制）
- 不检查 Agent prompt 内容（关键词检测仅限 name/description）
- 不替代 auto-qa/auto-review 脚本（Phase 4B+4C）

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（2 个文件）
- [x] 涉及模块/目录 ≤ 4？（scripts/ + .claude/）
- [x] 能否用一句话描述"解决了什么问题"？→ 审查 Agent 必须只读，不能编辑文件
- [x] 如果失败，能否干净回滚？→ 删除脚本和 hook 注册即可

## 范围

> 声明本 REQ 允许修改的文件/目录（scope-guard 据此拦截越界操作）。
> 支持通配符：`*`（单层匹配）、`**`（任意深度）。无声明则不拦截（向后兼容）。

- 涉及文件：
  - `scripts/review-gatekeeper.mjs`
  - `.claude/settings.local.json`

### 约束（Scope Control，可选）

**豁免项**：
- [ ] skip-design-validation（小改动无需设计文档）
- [x] skip-experience（本 REQ 无值得沉淀的复用经验）
- [ ] skip-req-validation（紧急修复跳过 REQ 内容检查）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/review-gatekeeper.mjs（新建）、.claude/settings.local.json
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：现有脚本
- 不可引入的依赖 / 操作：无

## 验收标准
- [ ] Review Agent 使用 general-purpose 类型时被阻断
- [ ] Review Agent 使用 Explore/Plan 类型时被放行
- [ ] 非 Review Agent（无审查关键词）被放行
- [ ] harness-mode 影响 block 语气（collaborative 温和 / supervised 严格）

## 设计与实现链接
- 设计稿：无（简单 hook，无需独立设计文档）
- 相关规范：unified-roadmap.md Phase 4

## 报告链接
- Code Review：`requirements/reports/REQ-2026-045-code-review.md`
- QA：`requirements/reports/REQ-2026-045-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：
  - `echo '{"tool_name":"Agent","tool_input":{"name":"reviewer","description":"Code review","subagent_type":"general-purpose"}}' | node scripts/review-gatekeeper.mjs` → 应阻断
  - `echo '{"tool_name":"Agent","tool_input":{"name":"reviewer","description":"Code review","subagent_type":"Explore"}}' | node scripts/review-gatekeeper.mjs` → 应放行
  - `echo '{"tool_name":"Agent","tool_input":{"name":"researcher","description":"Research topic"}}' | node scripts/review-gatekeeper.mjs` → 应放行
  - `npm test` → 全部通过
- 需要的环境：无特殊要求
- 需要的人工验证：无

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] **目标实现**：审查 Agent 是否被强制使用只读类型？
- [ ] **旧功能保护**：现有 hooks 是否正常工作？
- [ ] **逻辑正确性**：关键词检测是否准确？是否误判？
- [ ] **完整性**：是否处理了所有边界情况？
- [ ] **可维护性**：代码是否清晰？

#### 对齐检查（record 阶段）
- [ ] **目标对齐**：实现是否服务于审查隔离目标？
- [ ] **设计对齐**：是否符合路线图 Phase 4.1 的设计？
- [ ] **验收标准对齐**：所有验收标准是否都有对应实现？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：关键词检测可能误判（false positive/negative）
- 回滚方式：删除 review-gatekeeper.mjs 和 settings.local.json 中的 hook 注册

## 关键决策
- 2026-04-26：使用 name/description 关键词检测而非 prompt 检测（prompt 太长，hook 有超时限制）
