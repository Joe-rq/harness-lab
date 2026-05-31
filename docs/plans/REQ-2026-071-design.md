# REQ-2026-071 设计：Stage 2 event ledger high-frequency writers

## 背景

REQ-2026-070 已提供 `scripts/event-store.mjs`。本 REQ 将它接入真实治理入口，让事件账本开始积累可投影事实。

## 接入点

| 接入点 | 事件类型 | source | payload |
|--------|----------|--------|---------|
| `session-start.js` | `session_started` | `hook` | `progressFound`、`activeReq`、`phase` |
| `req-cli.mjs create` | `req_created` | `cli` | `fileName`、`title` |
| `req-cli.mjs start` | `req_started` | `cli` | `fileName`、`phase` |
| `req-cli.mjs block` | `req_blocked` | `cli` | `fileName`、`phase`、`reason` |
| `req-cli.mjs complete` | `req_completed` | `cli` | `fileName`、`phase` |

虽然路线图要求接入 1-2 个高频点，本 REQ 顺手覆盖完整 REQ lifecycle，因为都在 `req-cli.mjs` 同一边界内，拆开会增加重复封装。

## 写入策略

新增小函数：

```js
recordEvent(type, fields)
```

约束：

- 调用 `appendEvent`。
- 自动传入 `rootDir`。
- 失败只 `console.warn`，不 `process.exit`。
- payload 只放小型治理事实。

## 安装器同步

一旦 `session-start.js` / `req-cli.mjs` import `event-store.mjs`，目标项目迁移时必须复制该文件：

- CLI module files 增加 `scripts/event-store.mjs`
- Hook module files 也增加 `scripts/event-store.mjs`

否则只安装 hook 或 CLI 时会出现运行时 import 缺失。

## 测试策略

- 扩展 req-cli lifecycle fixture：create/start/complete 后读取 `.claude/events/*.jsonl`，确认事件类型存在。
- 扩展 block fixture：确认 `req_blocked` 事件存在。
- 增加 session-start fixture：运行 `node scripts/session-start.js` 后确认 `session_started` 事件存在。
- 保持现有断言不变，证明事件写入不破坏原行为。

## 后续衔接

S2-CP3/S2-CP4 将基于这些事件实现 projection；届时再决定哪些事件是重建 progress 的必要输入。
