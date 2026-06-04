# 2026-06-04 Stage 3 §7 评估表口径定义 + event-store schema 扩展

## 场景

Stage 3 决策门需要填写 §7 评估表，但原路线图只有 6 个维度名称，没有事件数据源、分子分母、启用条件和不可用 fallback。REQ-2026-075 把这张表从主观估算改成事件账本可计算的指标，同时给 event-store 补上 schema version、payload schema 和 rotation。

## 关联材料

- REQ: `requirements/completed/REQ-2026-075-stage-3-7-event-store-schema.md`
- Design: `docs/plans/REQ-2026-075-design.md`（如有）
- Metrics: `docs/plans/REQ-2026-075-evaluation-metrics.md`
- Code Review: `requirements/reports/REQ-2026-075-code-review.md`
- QA: `requirements/reports/REQ-2026-075-qa.md`

## 问题 / 模式

- 决策表如果没有数据口径，后续一定会退化成“凭感觉填表”，即使表格看起来很治理化。
- append-only event log 很容易先只记录 lifecycle，等到需要分析失败率、拦截率、冲突次数时才发现没有遥测。
- 给事件加 `version` 后，写入端可以严格，读取端需要对旧数据局部兼容，否则一次 schema 扩展会把历史账本变成不可读。
- rotation 不能只考虑写入，还要同步扩展读取路径；否则归档成功反而等于查询丢数据。

## 关键决策

- 先定义 `EVENT_TYPE_SCHEMAS` map，再让 `validateEvent` 按 type 校验 payload。这样新增事件 type 是局部改动，不需要把校验逻辑散在多个分支里。
- 新事件统一写 `version: "1.0"`，旧事件在 `readEvents` 中 auto-fill 为 `"0.9"` 并 warn。严格写入和兼容读取分开，既保护新数据质量，也不丢历史证据。
- `stats --metrics` 输出 raw counts + enabled 状态，而不是在分母不足时输出一个看似精确的 0。不可用数据必须显式 N/A 化，避免后续决策误读。
- rotation 后 `readEvents` 同时读取 `.claude/events/` 和 `.claude/events-archive/`。归档是存储策略，不应该改变调用方看到的事件集合。

## 解决方案

1. 在 `scripts/event-store.mjs` 集中声明 13 个新事件 type，覆盖 verifier、冲突、人工决策、成本告警和 S3 观察期事件。
2. 在 `docs/plans/REQ-2026-075-evaluation-metrics.md` 写清 6 维度的分子、分母、阈值、启用条件和 fallback，并让 `computeEvaluationMetrics()` 对齐文档。
3. 用 `MAX_EVENT_LINES` 实现可调 rotation，并在测试中把上限调小触发归档路径。
4. 扩展 `tests/event-store.test.mjs` 覆盖 version 注入、schema 拒绝、13 个 type 写入、rotation 后读取、metrics 输出和 legacy 0.9 兼容。

## 复用建议

- 做任何“评估表 / 决策门 / 观察期”之前，先问每个指标是否有事件源、分子分母和启用条件；没有就先补 telemetry，不要先进入观察期。
- schema 迁移要遵守“写入严格、读取兼容”的分层。兼容逻辑最好只留在 read path，不要降低 validate/write path 的约束。
- 给 append-only 日志加 rotation 时，测试必须验证归档后的全量读取，不只验证 archive 文件存在。
- 相关经验：`context/experience/REQ-2026-070-event-schema-append-api.md`、`context/experience/REQ-2026-071-event-ledger-writers.md`、`context/experience/REQ-2026-073-worktree-event-aggregation.md`。
