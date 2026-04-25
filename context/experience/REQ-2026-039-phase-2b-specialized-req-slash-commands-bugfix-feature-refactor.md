# 2026-04-25 Phase 2B: specialized REQ slash commands (bugfix/feature/refactor)

## 场景

通用 REQ 模板对所有类型一视同仁，bugfix 要填"用户故事"占位符、feature 要填"复现步骤"占位符。分析 7 个已完成 REQ 后发现三类分化模式：bugfix（简短背景+skip-design+低风险）、feature（详细背景+Scope Control 必填+需设计文档）、refactor（技术债描述+行为不变约束+常豁免设计文档）。

## 关联材料

- REQ: `requirements/in-progress/REQ-2026-039-phase-2b-specialized-req-slash-commands-bugfix-feature-refactor.md`
- Code Review: `requirements/reports/REQ-2026-039-code-review.md`
- QA: `requirements/reports/REQ-2026-039-qa.md`

## 问题 / 模式

- **模板源分裂风险**：`REQ_TEMPLATE.md` 是参考文档，`req-cli.mjs` 的 `buildReqContent()` 是实际执行的硬编码模板，两者已不同步（缺少颗粒度自检和反馈与质量检查章节）。如果再引入第三个模板源会失控
- **INV-039 章节重复**：用 Edit 逐节替换 REQ 模板时，`old_string` 捕获下一节标题导致章节丢失。解决方案：Write 重写整个文件
- **REQ 路线图原方案路径问题**：路线图写 `skills/req/bugfix.md`，但实际 slash command 在 `.claude/commands/`，两套路径会让人混乱

## 关键决策

- **slash command 路径选 `.claude/commands/` 而非 `skills/req/`**：统一到已有路径，避免双入口混乱。skills/ 是阶段导航（plan/review/qa/ship），commands/ 是用户触发的操作命令
- **用 Write 重写整个 REQ 而非 Edit 逐节填**：避免 INV-039 章节重复问题，且保留 reqId/日期等动态值
- **项目适配器拆至后续 REQ**：适配器"可用"定义模糊（产出什么？修改 settings？注入 context？），且 3 个 command 已占 4 实体
- **不改 req-cli.mjs 的 buildReqContent()**：单一模板引擎，多层内容策略——通用骨架 + slash command 特化内容

## 解决方案

1. 创建 3 个 slash command（/bugfix、/feature、/refactor），每个遵循相同的五步流程：前置检查 → 收集信息 → req:create 创建骨架 → Write 重写为特化内容 → 提示确认
2. 特化内容的关键差异点：背景字段、目标默认值、非目标策略、Scope Control 填写提示、skip-design-validation 是否预勾选、验收标准默认项
3. 11 个现有测试全部通过，无回归

## 复用建议

- **first-req 向导的项目类型识别表可复用**：Phase 2A 的项目类型信号（package.json + react → React 等）可直接用于适配器 REQ
- **slash command 的"收集信息 → 创建骨架 → Write 重写"模式可泛化**：未来新增类型（如 /hotfix、/migration）只需复制此模式
- **注意 req-cli.mjs 和 REQ_TEMPLATE.md 的不同步问题**：未来 Phase 应考虑将模板从硬编码提取为配置文件，彻底消除双源
