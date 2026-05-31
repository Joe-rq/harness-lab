# REQ-2026-073 worktree 事件聚合经验

## 场景

当每个 worktree 都能写事件并投影进度后，主仓需要一个只读聚合视图来回答“各条工作线现在在哪里”。这个视图不能把多个 worktree 合并成一个状态，也不能为了查询去写其他 worktree 的文件。

## 关联材料

- REQ：`requirements/completed/REQ-2026-073-stage-2-worktree-aware-event-aggregation.md`
- 设计：`docs/plans/REQ-2026-073-design.md`
- Code Review：`requirements/reports/REQ-2026-073-code-review.md`
- QA：`requirements/reports/REQ-2026-073-qa.md`

## 问题 / 模式

- **聚合是报告，不是合并**：重复 active REQ 只能进入 `conflicts`，不能自动选择赢家。
- **错误要按 worktree 隔离**：一个坏 JSONL 文件不能阻断其他 worktree 的状态展示。
- **`--all` 要保留回退**：没有事件目录时，仍使用原 INDEX active REQ 行为，避免空迁移项目体验倒退。

## 关键决策

- **决策 1：目录契约固定为 `.claude/events` 与 `.claude/worktrees/*/events`**。这样聚合查询不需要知道真实 git worktree 的外部路径。
- **决策 2：聚合 API 复用单 worktree projection**。避免再写一套事件解释逻辑。
- **决策 3：冲突只输出结构化报告**。Stage 2 的目标是可见性和状态继承，不是自动协调。

## 验证

- `node tests/event-store.test.mjs`：PASS
- `node tests/governance.test.mjs`：PASS
- `npm run req:status -- --all`：PASS
- `npm run req:status -- --all --json`：PASS
- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- 聚合 API 返回 `{ worktrees, conflicts }` 比直接返回列表更稳，后续可以添加更多 conflict 类型。
- CLI 文本模式应保持可扫读，JSON 模式保留完整 projection，方便脚本消费。
- fixture 里要同时覆盖正常 worktree 和坏事件 worktree，否则容易把错误隔离漏掉。
