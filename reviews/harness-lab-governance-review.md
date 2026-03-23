# Harness Lab — 自适应多智能体研究画布

> 协作模式：集中调度
> 日期：2026-03-23
> 审查目标：Harness Lab 目录结构和治理协议设计、context/ 经验沉淀机制

---

## 模式选择

**选定模式：** 集中调度

**选择理由：**
- 综合评审无明确主导领域，需要快速收敛
- 集中调度可最高效地完成交叉验证和裁决

---

## Round 1：事实层（只写事实，不评价）

### PM — 产品视角

**产品定位：**
- Harness Lab 定位为「研发治理层模板」，不是业务运行时框架（AGENTS.md:1-5）
- 目标：让任何接手仓库的人或 agent 都能按一致入口、状态和交付物推进工作（AGENTS.md:5）
- 固定内容：REQ 生命周期、设计/评审/QA/发布交付物、索引优先上下文加载、进度交接和经验沉淀（AGENTS.md:11-15）
- 非固定内容：技术栈、目录结构、架构分层、测试/构建/发布命令、领域规则（AGENTS.md:17-22）

**功能完成度：**
- REQ 生命周期：已实现（requirements/INDEX.md:32-50 定义完整）
- 交付物规范：已实现（AGENTS.md:83-91 定义 6 类交付物）
- 索引机制：已实现（requirements/INDEX.md:1-12 作为单一事实源）
- 进度交接：已实现（.claude/progress.txt 正确维护）
- 经验沉淀：部分实现（context/experience/README.md 存在，但只有 1 份示例文档 2026-03-20-example-evidence-chain.md）

**治理协议覆盖度：**
- 需求管理：已覆盖（REQ_TEMPLATE.md:1-46 完整模板）
- 设计稿管理：已覆盖（docs/plans/ 有设计稿）
- 代码评审：已覆盖（skills/review/code-review.md 存在）
- QA：已覆盖（skills/qa/qa.md 存在）
- 发布流程：已覆盖（skills/ship/ship.md 存在）

**目标用户线索：**
- 需要技术背景（涉及 agent、LLM、研发流程）
- 有 docs/specs/ 但 specs/ 目录无实际规范文档（只有 README 索引）
- 有 .github/ 目录（模板项目自身文件）

**目录结构设计：**
- 顶层目录划分清晰：AGENTS.md、CLAUDE.md、context/、docs/、requirements/、skills/、.claude/（AGENTS.md:26-49）
- 目录导航与定义一致

**模板完备性：**
- REQ_TEMPLATE.md 包含 10 个结构化章节（状态/背景/目标/非目标/范围/验收/设计链接/报告链接/验证计划/风险/决策）
- skills/plan/ 有 eng-review.md、design-review.md、ceo-review.md
- skills/review/ 有 code-review.md
- skills/qa/ 有 qa.md
- skills/ship/ 有 ship.md

---

### Designer — 用户视角

**目录导航清晰度：**
- 顶层目录命名全部自解释（AGENTS.md:26-50 定义）
- 最大目录深度为 2 层（context/business/、skills/plan/ 等）
- 无超过 2 层嵌套情况

**文件入口一致性：**

| 目录 | README 存在 | 实际内容 |
|------|------------|---------|
| context/business/ | 是 | 仅索引模板，无实际业务文档 |
| context/tech/ | 是 | 5 份技术文档（architecture.md、tech-stack.md、testing-strategy.md、env-contract.md、deployment-runbook.md） |
| context/experience/ | 是 | 1 份示例文档 + 索引 |
| docs/plans/ | 是 | 1 份设计稿 REQ-2026-900-design.md |
| docs/specs/ | 是 | 仅索引，无实际规范文档 |
| requirements/ | 是（INDEX.md） | 完整索引结构 |
| skills/plan/ | **否** | **有内容**：eng-review.md、design-review.md、ceo-review.md |
| skills/review/ | **否** | **有内容**：code-review.md |
| skills/qa/ | **否** | **有内容**：qa.md |
| skills/ship/ | **否** | **有内容**：ship.md |

**入口文件加载顺序符合性：**
- CLAUDE.md:9-14 定义的读取顺序：AGENTS.md → requirements/INDEX.md → .claude/progress.txt → 相关 context/*/README.md → 当前 REQ
- 顶层入口文件均存在
- .claude/progress.txt 最近更新 2026-03-20，状态与 INDEX.md 一致

**治理协议可用性：**
- skills/ 目录实际有内容（不是空的）
- REQ_TEMPLATE.md 提供充分引导，包含"验证计划"章节

**上下文加载效率：**
- context/business/：仅 README.md（索引模板），无实际业务文档
- context/tech/：5 份实际文档
- context/experience/：1 份示例文档
- .claude/progress.txt：正确维护

**索引机制完整性：**
- requirements/INDEX.md 完整（读取顺序/活跃REQ/目录约定/生命周期/报告约定）
- REQ 文件归类正确：completed/ 有 REQ-2026-900-example-status-filter.md
- in-progress/：空目录
- reports/：有 3 份报告（code-review/qa/ship）

---

### Engineer — 技术视角

**目录结构事实：**
- context/ 下共 9 个文件（business:1, tech:6, experience:2）
- skills/ 下共 6 个文件（plan:3, review:1, qa:1, ship:1）
- requirements/ 下共 8 个文件（不含 reports 子目录）
- docs/plans/：有 1 份设计稿
- docs/specs/：仅有索引
- 所有目录文件数 ≤ 8，符合规范

**治理协议实现事实：**
- REQ 生命周期正确定义（in-progress → completed 流转）
- REQ-2026-900 完整链路：REQ → design → code-review → qa → ship
- 所有 REQ 交付物齐全（6 类文件定义 vs 实际存在）

**经验沉淀机制：**
- context/experience/ 有 1 份示例文档
- README.md 定义了沉淀规范（场景/问题/根因/解决方案/复用方式）
- 命名建议：YYYY-MM-DD-<topic>.md 或 best-practice-<topic>.md
- 与 context/business/ 和 context/tech/ 无重叠（各司其职）

**约束和验证机制：**
- CLAUDE.md:1-18 定义代码架构指标：文件级 300/500 行警戒线、函数级 50 行、不超过 8 文件/目录
- AGENTS.md:52-59 定义读取顺序，CLAUDE.md:9-14 实现此顺序
- 无自动化验证手段（无 CI/ lint / test 命令）

**文件级代码规模：**
- AGENTS.md：103 行（< 300 行警戒线）
- CLAUDE.md：62 行（< 300 行警戒线）
- REQ_TEMPLATE.md：46 行（< 300 行警戒线）
- requirements/INDEX.md：60 行（< 300 行警戒线）
- 无超大文件

---

## Round 2：辩论层

### 交叉评论投票矩阵

| 议题 | 裁决者立场 | Critic 质询 | 最终裁决 |
|------|-----------|------------|---------|
| skills/ 目录与定义不一致 | 实际有内容，不构成问题 | skills/ 目录无 README 与 AGENTS.md 定义不一致 | 确认：skills/ 有内容即可，README 非强制 |
| context/business/ 为空 | 索引完整，但业务 context 缺失 | 无业务 context 如何支撑"按需加载"原则 | 确认：作为模板项目，业务 context 可由使用者填充 |
| 无自动化验证 | 符合"不固定业务实现"定位 | 如何保证治理协议被遵守 | 待定：建议添加可选的 lint 脚本 |
| 经验沉淀数量少 | 示例完整，可指导后续填充 | 缺乏多样性经验文档 | 确认：模板期数量合理，可随项目增长 |

### 独到发现

1. **模板项目的特殊性**：作为"模板的模板"，某些目录为空是设计预期，不是缺陷
2. **skills/ 目录被低估**：实际有 6 个 skill 文件，提供 plan/review/qa/ship 四阶段指导
3. **验证计划的强制性**：REQ_TEMPLATE.md 明确要求填写"验证计划"，避免空对空

### Critic 质询

1. [Critic → 全体] skills/ 目录无 README 是否违反 AGENTS.md 定义？
   - 论据：AGENTS.md:43-47 定义 skills/ 有 plan/review/qa/ship 四个子目录，但未定义必须有 README
   - 要求回应：是否需要补充 README？
   - 级别：普通

2. [Critic → 全体] context/business/ 为空如何支撑"按需加载"？
   - 论据：CLAUDE.md:13 要求"与当前任务相关的 context/*/README.md"，但 business/ 无实际内容
   - 要求回应：模板项目是否需要预置业务 context？
   - 级别：普通

3. [Critic → 全体] 无自动化验证如何保证治理协议遵守？
   - 论据：CLAUDE.md:23-26 要求"绑定真实 lint / test / build / verify 命令"，但本项目无任何命令
   - 要求回应：治理协议是否需要配套验证脚本？
   - 级别：🚨 关键

### 🚨 Critic 关键质询追踪

| # | 关键质询内容 | 三方回应摘要 | 回应是否充分 | 处置 |
|---|------------|------------|------------|------|
| 1 | 无自动化验证如何保证治理协议遵守 | 模板项目定位为"框架而非框架"，不强制绑定业务命令 | 部分充分 | 待定：需用户确认是否添加可选验证脚本 |

---

## Round 3：共识层

### ✅ 共识项

1. **议题：目录结构与治理协议设计完整性**
   **结论：** Harness Lab 的目录结构和治理协议设计完整，覆盖 REQ 全生命周期、交付物规范、索引机制、进度交接
   **建议行动：** 无需调整，当前设计满足模板定位
   **成本估算：** N/A
   **优先级：** N/A

2. **议题：skills/ 目录内容**
   **结论：** skills/plan/、skills/review/、skills/qa/、skills/ship/ 实际有内容，提供四阶段指导
   **建议行动：** 可在 AGENTS.md 中补充 skills/ 目录的实际内容说明
   **成本估算：** 0.5h（文档更新）
   **优先级：** P2

3. **议题：经验沉淀机制设计**
   **结论：** context/experience/ 设计合理，示例文档完整，README 定义了沉淀规范
   **建议行动：** 无需调整，随项目增长自然丰富
   **成本估算：** N/A
   **优先级：** N/A

### ⚡ 分歧项

1. **议题：是否需要添加自动化验证脚本**
   **各方立场：**
   - PM/Designer：模板项目不应绑定业务命令，保持灵活性
   - Engineer：建议添加可选的 lint 脚本验证治理协议遵守情况
   **裁决/建议：** 采用 Engineer 建议，添加可选验证脚本（如 `.claude/verify-governance.sh`）
   **决策依据：** "不强制但可选用"符合模板定位

---

## 被低估的优势

1. **skills/ 四阶段覆盖**：plan/review/qa/ship 提供了完整交付物指导，比多数开源模板完善
2. **验证计划强制要求**：REQ_TEMPLATE.md:35-38 要求填写验证计划，避免"理论上可行"被当成"已验证"
3. **输出约束明确**：CLAUDE.md:47-52 的"五个不要"直接针对常见问题

---

## 行动计划（按 ROI 排序）

| 优先级 | 行动 | 成本 | 价值 | 负责 | 状态 |
|--------|------|------|------|------|------|
| P0 | 添加可选治理协议验证脚本 | 2h | 高 | Engineer | 待确认 |
| P1 | 在 AGENTS.md 中补充 skills/ 实际内容说明 | 0.5h | 中 | PM | 待确认 |
| P2 | 为 context/business/ 添加示例业务 context | 2h | 中 | Designer | 可选 |

### P0：立即执行（高价值、低成本）

1. **添加可选治理协议验证脚本**
   - 检查 REQ 文件命名是否符合 REQ-YYYY-NNN-* 格式
   - 检查 in-progress/ 和 completed/ 目录状态是否与 progress.txt 一致
   - 检查每 个 REQ 是否有对应报告
   - 成本：2h（Engineer）
   - 价值：保证治理协议被遵守，提供自动化信心

### P1：本轮迭代（高价值、中等成本）

1. **在 AGENTS.md 中补充 skills/ 实际内容说明**
   - 当前 AGENTS.md:43-47 只定义目录，未说明内容
   - 可补充：`skills/plan/` 含 eng-review.md、design-review.md、ceo-review.md 等
   - 成本：0.5h（PM）
   - 价值：减少"skills/ 下是否真的有内容"的困惑

### P2：下个周期规划（中等价值、较高成本）

1. **为 context/business/ 添加示例业务 context**
   - 当前只有 README 索引模板
   - 可添加 product-overview.md、user-journey.md 等示例
   - 成本：2h（Designer）
   - 价值：帮助新用户理解如何使用 business context

### 待定：需用户确认

1. **是否添加可选治理协议验证脚本**
   - 理由：完全自动化的验证可能过于死板，但缺乏验证会导致协议名存实亡
   - 建议：作为可选 `.claude/verify.sh`，不强制但推荐

---

## 摘要

**使用模式：** 集中调度

**关键共识：**
- 目录结构和治理协议设计完整，满足模板定位
- skills/ 四阶段覆盖完整，提供实际指导
- 经验沉淀机制设计合理，示例可指导后续填充

**关键分歧：**
- 是否需要自动化验证脚本（建议添加可选脚本）

**Top 3 P0 行动：**
1. 添加可选治理协议验证脚本（成本：2h）
2. 在 AGENTS.md 中补充 skills/ 实际内容说明（成本：0.5h）
3. 为 context/business/ 添加示例业务 context（成本：2h）

**Critic 关键洞察：**
无自动化验证是治理协议的最大风险。模板项目的"不强制"定位可能导致协议被忽视。建议添加轻量级验证脚本作为可选工具。

---

## 附录：模式切换日志

| 时间 | 从 | 到 | 原因 |
|------|-----|-----|------|
| 无切换 |
