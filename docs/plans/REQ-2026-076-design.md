# REQ-2026-076 设计文档

> 关联 REQ: [REQ-2026-076](../../requirements/completed/REQ-2026-076-stage-3-worktree-namespace-isolation-and-stage-2-revalidation.md)
> 关联观察报告: [2026-06-03-multi-angle-roadmap-deduction.md](../../requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md)
> 设计日期: 2026-06-04

## 1. 设计目标

把 worktree 从事件 payload 字段提升为事件文件路径命名空间,让两个 worktree 即使用同一个 `sessionId` 也不会写入同一个 jsonl 文件。REQ-076 同时承担 S2-CP5/S2-CP6 重新验证:证明多 worktree 独立写入、聚合读取和冲突报告在当前工作区可复现。

## 2. 路径约定

### 2.1 写入路径

新写入默认路径:

```text
.claude/worktrees/{worktreeNamespace}/events/{sessionId}.jsonl
```

其中:

- `worktreeNamespace` 来自 `event.worktree` 或当前 root,必须稳定、可读、可作为目录名
- main worktree 可使用 `main` 或稳定 hash,但同一 worktree 多次运行必须一致
- `sessionId` 仍作为文件名,只在 namespace 内唯一

### 2.2 读取路径

读端必须兼容三类来源:

- 旧主路径:`.claude/events/*.jsonl`
- 新 namespace 路径:`.claude/worktrees/*/events/*.jsonl`
- REQ-075 rotation 路径:`.claude/events-archive/*.jsonl` 以及 namespace 内 archive 路径(如实现采用)

读取行为只合并事件视图,不移动旧文件。

## 3. API 调整

### 3.1 `getEventFilePath`

集中处理 namespace:

```js
getEventFilePath({ rootDir, sessionId, worktree })
```

期望输出稳定路径。调用方不应自行拼 `.claude/worktrees/...`。

### 3.2 `listEventFiles`

扩展扫描范围:

1. 保留 `.claude/events/*.jsonl`
2. 增加 `.claude/worktrees/*/events/*.jsonl`
3. 保留 `.claude/events-archive/*.jsonl`

坏文件仍按现有策略抛错或隔离到 worktree projection error,不得影响无关 worktree。

### 3.3 `buildWorktreeProgressProjections`

聚合来源以 namespace 目录为主。main 旧路径作为兼容来源,用于展示历史主 worktree 事件。

## 4. S2-CP5/S2-CP6 重验策略

测试 fixture 构造:

- worktree A:`REQ-TEST-A` active
- worktree B:`REQ-TEST-B` active
- worktree C:与 A 同 REQ active,触发 duplicate conflict

验证点:

- A/B 写入文件路径不同
- `readEvents` 能读回所有合法事件
- `buildWorktreeProgressProjections` 输出每个 worktree 的 projection
- conflict 只出现在返回值中,不会改写任何事件文件

## 5. 临时债务处理

REQ-075 曾记录 `payload.observation=true` 作为观察期启动过渡标记。本 REQ 不迁移历史事件,但 QA 必须执行:

```bash
rg 'payload\.observation|observation":true|observation=true' .claude requirements docs
```

若仍存在真实事件,需说明是否改写为 `s3_observation_window_start` 或保留为历史兼容记录。

## 6. 风险控制

- 写入路径变更前后都通过 `readEvents` 暴露同一逻辑事件集合
- namespace 计算保持纯函数,不依赖当前时间
- 不删除旧 `.claude/events/*.jsonl`
- `req:status --all` 继续只读,不自动修复冲突

## 7. 验证命令

- `node tests/event-store.test.mjs`
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- `npm run req:status -- --all`
- `node scripts/event-store.mjs stats --metrics`
