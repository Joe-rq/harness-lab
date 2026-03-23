# 2026-03-23 Docs Impact And Complete Gate MVP

## 场景

`docs:verify` 能发现文档漂移，但它仍然是“最后再跑一次”的被动校验。
对 agent-first 工作流，更重要的是让文档义务在实现中途就可见，并在完成 REQ 前被强制收口。

## 关联材料

- REQ：`requirements/completed/REQ-2026-005-docs-impact-and-complete-gate-mvp.md`
- Design：`docs/plans/REQ-2026-005-design.md`
- Code Review：`requirements/reports/REQ-2026-005-code-review.md`
- QA：`requirements/reports/REQ-2026-005-qa.md`

## 问题 / 模式

- 只有 `docs:verify` 时，agent 很容易在实现结束后才第一次知道“还要补文档”
- 如果 complete 阶段不接 gate，REQ 可能在文档义务未清理时就被移入 completed
- 如果 impact / verify / complete 各自实现一套规则，三者很快会互相漂移

## 解决方案

1. 抽出 `analyzeDocsImpact` 作为共享内核。
2. 用 `npm run docs:impact` 先把 triggered rules、已满足文档和缺失文档列出来。
3. 让 `req:complete` 复用同一套分析结果，在缺失文档时拒绝完成。
4. 用成对 fixture 验证 fail / pass 两种场景，而不是只看当前仓库能否通过。

## 复用建议

- 如果仓库主要面向 agent，把“文档影响面”设计成独立入口，比单纯加更多 lint 规则更有效
- 影响面分析、验证和完成 gate 要共享同一套规则和解析逻辑，否则长期会互相打架
- 在当前环境里需要 git changed files 时，继续沿用 shell 先产出状态快照、Node 只负责读取的模式更稳
