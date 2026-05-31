# REQ-2026-072 progress projection 经验

## 场景

事件账本开始写入后，下一步不是立即删除 `progress.txt`，而是先让关键读取入口优先消费 projection，并保留缓存回退。这样可以验证事件事实层是否足够支撑当前状态，同时避免一次性切换主真相源带来的回归风险。

## 关联材料

- REQ：`requirements/completed/REQ-2026-072-stage-2-progress-projection.md`
- 设计：`docs/plans/REQ-2026-072-design.md`
- Code Review：`requirements/reports/REQ-2026-072-code-review.md`
- QA：`requirements/reports/REQ-2026-072-qa.md`

## 问题 / 模式

- **projection 逻辑要集中**：事件解释规则放在 `event-store.mjs`，入口脚本只消费结果，避免 `session-start` 和 `req:status` 各自实现一套状态机。
- **先回退再替换**：坏事件、无事件或历史项目迁移时，`progress.txt` 继续作为缓存/回退输入。
- **不要提前做聚合**：默认 status 只处理当前 worktree，`--all` 和跨 worktree 聚合留给后续 REQ，否则语义会变复杂。

## 关键决策

- **决策 1：projection 返回最小进度视图**。只包含 activeReq、phase、summary、nextSteps、blockers，不还原完整历史上下文。
- **决策 2：REQ 创建和实现由同一 REQ 承载**。S2-CP3 是检查点，S2-CP4 是同一能力的实现阶段。
- **决策 3：读取失败只 warning/回退**。Stage 2 退出前不让事件账本成为新的单点故障。

## 验证

- `node tests/event-store.test.mjs`：PASS
- `node tests/governance.test.mjs`：PASS
- `npm test`：PASS
- `npm run req:status`：PASS
- `node scripts/session-start.js`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- 事件投影 API 应接受 `events` 或 `rootDir`，便于单元测试直接传内存事件，也便于后续 worktree 聚合传文件集合。
- 入口脚本接入 projection 时，先保持原有输出结构，减少下游用户和测试的感知变化。
- `progress.txt` 降级应分阶段完成：先读 projection，再决定是否由 projection 生成缓存。
