# REQ-2026-074 设计：Stage 2 exit confirmation

## 背景

Stage 2 已完成事件账本、写入点、progress projection 和 worktree 聚合。退出确认的目标是证明这些能力组合已经满足路线图成功定义，并给 Stage 3 决策门留下清晰入口。

## 检查清单

| 检查项 | 证据 |
|--------|------|
| S2-CP1 事件 schema + append API | `REQ-2026-070`、`scripts/event-store.mjs`、`tests/event-store.test.mjs` |
| S2-CP2 高频写入点 | `REQ-2026-071`、`session-start.js`、`req-cli.mjs` lifecycle 事件 |
| S2-CP3/S2-CP4 progress projection | `REQ-2026-072`、`buildProgressProjection`、session-start/status projection |
| S2-CP5/S2-CP6 worktree 聚合 | `REQ-2026-073`、`buildWorktreeProgressProjections`、`req:status --all` |
| 治理门禁 | `npm test`、`docs:verify`、`check:governance`、`req-audit` |

## 输出物

- `requirements/reports/REQ-2026-074-stage-2-exit.md`
- `requirements/reports/REQ-2026-074-code-review.md`
- `requirements/reports/REQ-2026-074-qa.md`
- `context/experience/REQ-2026-074-stage-2-exit.md`
- 路线图 S2-CP7 勾选，并把当前阶段推进到 Stage 3 观察/决策门

## 通过标准

- Stage 2 成功定义成立：多 session / 多 worktree 可以追加事件，`progress.txt` 可由事件投影重建，worktree 状态可聚合查看。
- `check:governance` 和 `req-audit` 没有 current 增量。
- `.claude/.req-exempt` 在最终状态不存在。

## 非通过条件

- 任一 S2 REQ 缺少 QA / review / experience。
- 任一最终门禁失败。
- 路线图、`requirements/INDEX.md`、`.claude/progress.txt` 互相冲突。
