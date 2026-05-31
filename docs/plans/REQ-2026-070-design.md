# REQ-2026-070 设计：Stage 2 event schema and append API

## 背景

Stage 2 的目标是把治理状态从单文件快照演进为可追加事件账本。当前 `progress.txt` 仍是人和 hook 的可读入口，但它不适合作为多 session / 多 worktree 的唯一真相源。本 REQ 先实现事件事实层，后续 REQ 再做 projection。

## 目标

1. 定义最小治理事件 schema。
2. 提供 append-only JSONL 写入 API。
3. 提供读取多个 writer 文件并稳定排序的 API。
4. 用测试证明坏事件拒绝、写入性能和多文件合并能力。

## 非目标

- 不替换 `progress.txt`。
- 不接入 `session-start.js` 或 `req-cli.mjs` 高频写入点；该接入属于 S2-CP2。
- 不实现 worktree 聚合查询。
- 不引入数据库、锁服务或后台进程。

## 事件文件布局

默认路径：

```text
.claude/events/
  session-<sessionId>.jsonl
```

测试和后续调用可通过 `eventsDir`、`writerId` 显式指定文件。每个 writer 写自己的 JSONL 文件，避免多个 session 写同一个文件。

## 最小 schema

```json
{
  "id": "evt_...",
  "ts": "2026-05-31T00:00:00.000Z",
  "type": "req_started",
  "reqId": "REQ-2026-070",
  "phase": "implementation",
  "source": "cli",
  "sessionId": "session-main",
  "worktree": "main",
  "payload": {}
}
```

字段约束：

- `id`：必填，默认由 API 生成，格式稳定且可排序性不作为语义依赖。
- `ts`：必填 ISO 时间，默认当前时间。
- `type`：必填，kebab/snake token；事件类型不在本 REQ 内做枚举封死。
- `source`：必填，允许 `hook` / `cli` / `manual` / `agent` / `test`。
- `sessionId`：必填，默认从环境变量或 fallback 生成。
- `worktree`：必填，默认当前 root 路径。
- `payload`：必填对象，可为空；禁止非对象和大块正文。
- `reqId`、`phase`：可选，但如果存在必须是字符串。

## API

```js
appendEvent(event, options) -> event
validateEvent(event) -> { ok, issues }
readEvents(options) -> event[]
getEventFilePath(options) -> string
```

`appendEvent` 流程：

1. 补齐默认字段。
2. 校验完整事件。
3. 创建 events 目录。
4. 以一行 JSON 追加到 writer 文件。
5. 返回实际写入事件。

`readEvents` 流程：

1. 读取指定 events 目录下的 `*.jsonl`。
2. 忽略空行。
3. JSON parse 失败时抛出带文件名和行号的错误。
4. 对每个事件执行 schema 校验。
5. 按 `ts`、`id`、`sourceFile`、`sourceLine` 稳定排序。

## 错误策略

- 坏事件在 append 前拒绝，不能产生半行或坏行。
- 读取时遇到坏 JSON / 坏 schema 直接报错；projection 不能建立在不可信事件上。
- API 抛普通 `Error`，message 包含字段名，便于 CLI 或 hook 包装。

## 测试策略

- append 自动补齐字段并写 JSONL。
- 缺 `type`、坏 `payload`、坏 `source` 被拒绝且文件不存在或为空。
- 两个 writer 文件读取后可稳定排序。
- append 单次耗时 < 50ms。
- `npm test` 串入 event-store 测试，防止后续破坏 schema。

## 后续衔接

- S2-CP2：接入 `session-start.js` 与 `req-cli.mjs` 的 1-2 个高频写入点。
- S2-CP3/S2-CP4：基于 `readEvents` 实现 progress projection。
- S2-CP5/S2-CP6：基于 writer 文件和 worktree 字段实现跨 worktree 聚合。
