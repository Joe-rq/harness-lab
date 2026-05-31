# REQ-2026-070 event schema + append API 经验

## 场景

Stage 2 要把 `progress.txt` 从单文件真相源演进为事件投影缓存。第一步不能直接改 status 主链路，而是先建立可验证的 append-only 事件事实层。

## 关联材料

- REQ：`requirements/completed/REQ-2026-070-stage-2-event-schema-and-append-api.md`
- 设计：`docs/plans/REQ-2026-070-design.md`
- Code Review：`requirements/reports/REQ-2026-070-code-review.md`
- QA：`requirements/reports/REQ-2026-070-qa.md`

## 问题 / 模式

- **不要在同一 REQ 同时建立事实层和改主链路**：事件 schema、append API、progress projection、worktree aggregation 是不同风险层，混在一起会让 QA 难以定位回归。
- **坏事件必须写入前拒绝**：JSONL 一旦混入坏行，后续 projection 的可信度会下降；append API 要先补字段、再校验、最后写入。
- **多 writer 读取要稳定排序**：Stage 2 后续会读取多个 session/worktree 文件，排序必须有固定 tie-breaker，不能依赖文件系统顺序。

## 关键决策

- **决策 1：S2-CP1 只做 schema + API**。高频写入点接入留给 S2-CP2，避免同时触碰现有 progress 语义。
- **决策 2：事件类型不封死枚举**。本 REQ 只校验 token 格式和 source 枚举，实际事件类型由接入 REQ 文档化。
- **决策 3：payload 必须是小型对象**。事件账本记录治理事实，不记录聊天正文、prompt 或大块 artifact 内容。

## 验证

- `node tests/event-store.test.mjs`：PASS
- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- 事件系统第一步应先证明 append/read/validate 的纯函数边界，再把 hook/CLI 接进来。
- JSONL 事件读取时要把文件名和行号放进错误信息；这是后续排查坏事件的最低成本路径。
- 性能测试即使简单，也能防止 append API 后续被同步重活拖慢 hook。
