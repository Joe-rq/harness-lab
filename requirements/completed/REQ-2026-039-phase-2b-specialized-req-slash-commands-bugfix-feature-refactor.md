# REQ-2026-039: Phase 2B: specialized REQ slash commands (bugfix/feature/refactor)

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 2A 完成后，用户可以通过 `/first-req` 向导和 `req:create` 创建通用 REQ。但通用模板对所有类型一视同仁——bugfix 要填"用户故事"占位符、feature 要填"复现步骤"占位符，用户每次都要手动调整。

分析 7 个已完成 REQ 后发现三类明显分化模式：bugfix（简短背景+skip-design+低风险）、feature（详细背景+Scope Control 必填+需设计文档）、refactor（技术债描述+行为不变约束+常豁免设计文档）。特化 slash command 可以让每种类型的 REQ 自动填充最匹配的内容，减少 60%+ 的手动调整。

## 目标
- 创建 3 个特化 slash command（/bugfix、/feature、/refactor），引导用户创建对应类型的 REQ
- 每个命令的自动填充内容与其类型匹配，类型间有明显差异
- 复用现有 `req:create` 流程，不引入新的模板源分裂

## 非目标
- 不做项目类型适配器（拆至后续 REQ，定义模糊且超 4 实体）
- 不修改 `req-cli.mjs` 的 `buildReqContent()`（单一模板引擎，多层内容策略）
- 不做类型感知的 `req:start` 验证差异化（当前通用验证已足够）

## 颗粒度自检
- [x] 目标数 ≤ 4？3 个
- [x] 涉及文件数 ≤ 4？3 个
- [x] 涉及模块/目录 ≤ 4？1 个（.claude/commands/）
- [x] 能否用一句话描述"解决了什么问题"？不同类型 REQ 有各自特化的创建体验
- [x] 如果失败，能否干净回滚？删除 3 个文件即可

## 范围
- 涉及目录 / 模块：`.claude/commands/`
- 影响接口 / 页面 / 脚本：新增 3 个 slash command，无已有接口变更

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（3 个 markdown 指令文件，无需设计文档）

**允许（CAN）**：
- 可新增的文件：`.claude/commands/bugfix.md`、`.claude/commands/feature.md`、`.claude/commands/refactor.md`

**禁止（CANNOT）**：
- 不可修改 `scripts/req-cli.mjs`
- 不可修改 `requirements/REQ_TEMPLATE.md`
- 不可修改 `scripts/req-validation.mjs`

**边界条件**：
- slash command 是 prompt 模板，不含可执行逻辑
- 通过 `npm run req:create` 创建骨架 → Claude 用 Write 重写 → `npm run req:start` 验证

## 验收标准
- [ ] `/bugfix` 能引导创建 bugfix 型 REQ，包含"Bug 现象"、"影响范围"字段，skip-design-validation 已勾选
- [ ] `/feature` 能引导创建 feature 型 REQ，包含"用户痛点"字段，Scope Control CAN/CANNOT 有填写提示
- [ ] `/refactor` 能引导创建 refactor 型 REQ，包含"技术债"字段，非目标包含"不做功能行为变更"
- [ ] 三种类型创建的 REQ 均能通过 `req:start` 验证（背景、目标、验收标准无占位符）
- [ ] 3 个 command 文件格式与现有 first-req.md/harness-setup.md 一致（frontmatter + markdown body）

## 设计与实现链接
- 设计稿：豁免（3 个 markdown 指令文件，无需设计文档）
- 相关规范：路线图 `docs/plans/unified-roadmap.md` Phase 2B 章节、现有 slash command 格式参考 `.claude/commands/first-req.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-039-code-review.md`
- QA：`requirements/reports/REQ-2026-039-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本仓库
- 需要的人工验证：运行 `/bugfix`、`/feature`、`/refactor` 各创建 1 个测试 REQ，确认内容差异

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：slash command 指导的 Write 重写可能丢失动态值（reqId、日期）
- 回滚方式：`git rm .claude/commands/bugfix.md feature.md refactor.md`，删除 3 个文件即可

## 关键决策
- 2026-04-25：slash command 路径选择 `.claude/commands/` 而非 `skills/req/`，统一到已有路径
- 2026-04-25：用 Write 重写整个 REQ 文件而非 Edit 逐节填，避免 INV-039 章节重复问题
- 2026-04-25：项目适配器拆至后续 REQ，因定义模糊且 3 个 command 已占 4 实体
