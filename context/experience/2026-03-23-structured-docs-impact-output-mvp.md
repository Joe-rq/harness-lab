# 2026-03-23 Structured Docs Impact Output MVP

## 场景

`docs:impact` 已经能让人看到当前文档义务，但 agent / CI 不适合解析控制台文本。

## 关联材料

- REQ：`requirements/completed/REQ-2026-006-structured-docs-impact-output-mvp.md`
- Design：`docs/plans/REQ-2026-006-design.md`
- Code Review：`requirements/reports/REQ-2026-006-code-review.md`
- QA：`requirements/reports/REQ-2026-006-qa.md`

## 问题 / 模式

- 纯文本 impact 输出对人友好，但对自动化脆弱
- 如果文本 / JSON / complete gate 各自维护一套逻辑，最终一定会出现漂移
- 结构化输出一旦被下游消费，就会自然变成契约

## 解决方案

1. 在现有 `--impact-only` 上增加 `--format json`。
2. 保留 `docs:impact` 文本输出，另加 `docs:impact:json` 稳定入口。
3. JSON 只暴露最小必要字段：
   - `changed_files`
   - `evaluated_rules`
   - `missing_rules`
   - `findings`
   - `errors`
4. 继续复用 `analyzeDocsImpact`，避免文本与 JSON 结果分叉。

## 复用建议

- 先给 agent / CI 一个小而稳的 payload，不要一上来输出过多实现细节
- 如果输出会被长期依赖，尽早把字段契约写进 README 或独立 schema
- 当人类入口和机器入口并存时，优先共享同一份分析内核，而不是复制逻辑
