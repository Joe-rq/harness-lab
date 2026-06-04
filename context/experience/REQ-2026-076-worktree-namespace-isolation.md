# 2026-06-04 Worktree 事件路径命名空间隔离

## 场景

REQ-2026-073 已经能按 worktree 聚合事件 projection,但写入路径仍按 sessionId 落到同一个 `.claude/events` 目录。REQ-2026-076 把 worktree 从事件字段提升到文件路径命名空间,让多 worktree 并行时不会共享同一个事件文件。

## 关联材料

- REQ: `requirements/completed/REQ-2026-076-stage-3-worktree-namespace-isolation-and-stage-2-revalidation.md`
- Design: `docs/plans/REQ-2026-076-design.md`
- Code Review: `requirements/reports/REQ-2026-076-code-review.md`
- QA: `requirements/reports/REQ-2026-076-qa.md`

## 问题 / 模式

- 只在事件 payload 里写 `worktree` 不等于隔离;文件路径仍共享时,并行写入和后续审计都会混在一起。
- 迁移 append-only 日志路径时,读端必须比写端更宽:新写入走新路径,读取同时兼容旧路径和 archive。
- main worktree 最容易被重复显示:旧 `.claude/events` 和新 `.claude/worktrees/main/events` 必须在 projection 层合并。

## 关键决策

- 默认写入 `.claude/worktrees/{namespace}/events/{sessionId}.jsonl`,保留显式 `eventsDir` 作为测试和兼容入口。
- namespace 对短路径保持可读,对长路径加 hash 后缀,避免简单截断导致碰撞。
- `req:status --all` 继续只读:重复 active REQ 只进入 `conflicts`,不自动合并或修改任何文件。

## 解决方案

1. 新增 `getWorktreeNamespace` / `getWorktreeEventsDir`,并让 `getEventFilePath` 默认走 worktree namespace。
2. 扩展 `readEvents` 扫描旧 main、namespace、archive 三类路径。
3. 调整 `buildWorktreeProgressProjections`,把旧 main 与新 main namespace 合并成一个 main projection。
4. 用测试 fixture 复跑 S2-CP5/S2-CP6:三个 worktree 独立写入,两个 worktree 重复 active 同一 REQ 只输出 conflict。

## 复用建议

- 路径迁移优先采用"新写入走新路径,读端兼容新旧路径"模式,不要直接搬旧文件。
- 多 namespace 状态聚合要把 main 作为特殊兼容层处理,否则迁移期很容易出现重复 main。
- 对治理日志类功能,测试必须断言文件路径本身,只断言事件 payload 不足以证明隔离。
