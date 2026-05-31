# REQ-2026-073 设计：Stage 2 worktree-aware event aggregation

## 背景

S2-CP4 已让当前 worktree 可从事件流投影当前进度。S2-CP5/S2-CP6 要补上主仓只读聚合能力，让用户看到多个 worktree 的活跃 REQ 和阶段，同时避免跨 worktree 写同一个状态文件。

## 事件目录约定

聚合只扫描当前仓库根目录下的这些位置：

- `.claude/events/*.jsonl`：主 worktree
- `.claude/worktrees/{worktreeId}/events/*.jsonl`：worktree 本地事件

本 REQ 不负责把真实 git worktree 自动迁移到该目录，只提供聚合查询契约和测试 fixture。后续接入流程可复用这个目录约定。

## 聚合 API

在 `scripts/event-store.mjs` 新增：

```js
buildWorktreeProgressProjections({ rootDir })
```

返回：

```js
{
  worktrees: [
    {
      worktree: 'main',
      eventsDir: '/repo/.claude/events',
      projection: { activeReq: 'none', phase: 'idle' },
      error: null
    }
  ],
  conflicts: []
}
```

冲突检测只报告，不合并：

- 同一个 REQ 同时在多个 worktree active
- 同一个 worktree projection 读取失败

## CLI 行为

`req:status --all` 改为优先读取 worktree projection 聚合：

- 文本模式：按 worktree 输出 active REQ / phase；无事件时回退原 INDEX 行为。
- JSON 模式：输出 `{ worktrees, conflicts }`；无事件时回退原 `{ active_reqs }`。

`req:status` 默认模式和 `req:status --id` 不变。

## 测试策略

- event-store 单元测试构造 main + 两个 worktree 事件目录，确认 projection 独立、排序稳定。
- governance 测试覆盖 `req:status --all` 文本与 JSON 输出。
- 坏事件 fixture 只让对应 worktree 返回 error，不影响其他 worktree。

## 后续衔接

S2-CP7 退出确认时复核：事件 schema、写入点、projection、worktree 聚合是否已经满足 Stage 2 成功定义。
