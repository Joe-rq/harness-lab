# REQ-2026-072 设计：Stage 2 progress projection

## 背景

Stage 2 已完成事件账本 API 和高频写入点。下一步要让这些事件成为当前进度视图的事实来源，降低 `progress.txt` 在多 session 场景下的单点写入冲突。

## Projection 模型

新增 `buildProgressProjection(options)`，集中放在 `scripts/event-store.mjs`。

输入：

- 当前 worktree 的 `.claude/events/*.jsonl`
- 可选 fallback progress，用于无事件或坏事件时保持兼容

输出：

```js
{
  activeReq: 'REQ-2026-072',
  phase: 'implementation',
  lastUpdated: '2026-05-31',
  summary: [],
  nextSteps: [],
  blockers: [],
  source: 'events'
}
```

事件解释规则：

| 事件类型 | 投影效果 |
|----------|----------|
| `req_created` | summary 增加“已创建 REQ”；activeReq 设为 reqId；phase 默认为 design |
| `req_started` | activeReq 设为 reqId；phase 设为事件 phase 或 implementation |
| `req_blocked` | activeReq 设为 reqId；phase 设为 blocked；blockers 增加 reason |
| `req_completed` | 如完成的是 activeReq，则 activeReq 设为 none；phase 设为 idle；summary 增加完成记录 |
| `session_started` | 不改变 activeReq，只作为未来活跃度事实保留 |

projection 只生成当前进度最小视图，不尝试还原完整历史报告。

## 读取策略

### session-start

顺序：

1. 尝试读取事件 projection。
2. projection 有事件时打印 projection。
3. projection 不可用时回退原 `progress.txt` 解析。
4. 事件读取失败只 warning，不阻断会话启动。

### req:status 默认模式

顺序：

1. 尝试读取 projection。
2. projection 存在 activeReq 时读取该 REQ 并输出当前状态。
3. projection 无 activeReq 时输出无活跃 REQ。
4. projection 不可用时回退原 `progress.txt`。

`req:status --id` 和 `req:status --all` 保持当前语义，避免把 worktree 聚合提前带入本 REQ。

## progress.txt 定位

本 REQ 不删除 `progress.txt`。它作为缓存和兼容回退继续存在，直到 S2 后续退出确认决定是否调整写入策略。

## 测试策略

- event-store 单元测试覆盖事件投影排序与 activeReq/phase 结果。
- governance fixture 覆盖 `session-start.js` 删除 progress 后仍能展示 projection。
- governance fixture 覆盖 `req:status` 默认模式使用 projection，且 `--id` / `--all` 不变。
- 坏事件场景覆盖 read/projection 错误不会让调用方主流程崩溃。

## 后续衔接

S2-CP5/S2-CP6 再处理多 worktree 事件聚合。本 REQ 输出的 projection API 应保持参数化，方便后续传入多个事件文件或 worktree 根目录。
