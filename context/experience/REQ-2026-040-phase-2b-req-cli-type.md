# 2026-04-25 Phase 2B 补充：req-cli --type 参数化

## 场景

Phase 2B 的 3 个 slash command（/bugfix、/feature、/refactor）将模板逻辑放在 prompt 中指导 Claude 用 Write 重写 REQ 文件——这是 prompt 保证而非代码保证。同时存在三源模板管理（REQ_TEMPLATE.md / req-cli.mjs / slash command），buildReqContent 缺少颗粒度自检和反馈章节。

## 关联材料

- REQ: `requirements/in-progress/REQ-2026-040-phase-2b-req-cli-type.md`
- Code Review: `requirements/reports/REQ-2026-040-code-review.md`
- QA: `requirements/reports/REQ-2026-040-qa.md`

## 问题 / 模式

- **模板源分裂**：三个地方管理模板内容，改一处忘改另一处。将模板统一回 req-cli.mjs 一个源头是正确方向
- **prompt 不可靠性**：slash command 指导 Claude 用 Write 重写——Claude 可能不遵循。代码保证 > prompt 保证
- **buildCommonSections 抽取**：报告链接和阻塞章节是所有类型共享的，抽取为函数避免重复

## 关键决策

- **path 3 方案（每类型一个构建函数）**：比 if/else 分支更清晰，新增类型只需加一个函数
- **slash command 退化为薄壳**：收集信息 → req:create --type → Edit 补占位符，核心逻辑在代码中

## 解决方案

1. req-cli.mjs 加 `--type` 参数，`buildReqContent` 按 type 路由到特化构建函数
2. 4 个构建函数共享 `buildCommonSections`（报告链接、阻塞章节）
3. 所有类型补全颗粒度自检和反馈与质量检查章节
4. slash command 简化为收集信息 + 调用 req:create --type

## 复用建议

- **新增 REQ 类型只需 3 步**：写 buildXxxReqContent 函数 → 在 builders 字典注册 → 创建对应 slash command
- **buildCommonSections 模式可推广**：共享章节抽取为函数，减少维护负担
