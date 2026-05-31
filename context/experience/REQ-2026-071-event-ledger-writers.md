# REQ-2026-071 event ledger 高频写入点经验

## 场景

事件账本 API 可用后，必须尽快接入真实治理入口，否则后续 projection 没有事实来源。但接入点不能改变现有 `progress.txt` 主链路，否则同一 REQ 会同时承担写入事实层和替换状态源两类风险。

## 关联材料

- REQ：`requirements/completed/REQ-2026-071-stage-2-event-ledger-high-frequency-writers.md`
- 设计：`docs/plans/REQ-2026-071-design.md`
- Code Review：`requirements/reports/REQ-2026-071-code-review.md`
- QA：`requirements/reports/REQ-2026-071-qa.md`

## 问题 / 模式

- **写事件不能先破坏主流程**：Stage 2 前半段应 best-effort，避免事件目录权限或 schema bug 让 `req:start` / `session-start` 失败。
- **新增 import 必须同步安装器**：只改本仓运行正常不够，目标项目通过 harness-install 复制后也必须有 `event-store.mjs`。
- **同一边界内的 lifecycle 事件可一起接**：create/start/block/complete 都在 `req-cli.mjs`，共享同一个 `recordEvent` 封装，拆成多 REQ 反而重复。

## 关键决策

- **决策 1：事件写入 best-effort**。projection 阶段再决定关键事件是否硬失败。
- **决策 2：session-start 和 req-cli 同 REQ 接入**。一个 hook 入口 + 一个 CLI lifecycle 入口已经满足路线图 1-2 个高频写入点。
- **决策 3：payload 只放小型治理事实**。避免把聊天正文、prompt 或大块 artifact 变成事件账本负担。

## 验证

- `node tests/event-store.test.mjs`：PASS
- `node tests/governance.test.mjs`：PASS
- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- hook/CLI 写事件时，用一层本地 `recordEvent` 包住 append API，统一失败策略。
- 安装器测试要检查“导入依赖也被复制”，不只检查入口脚本存在。
- 事件 payload 的字段要服务 projection，不要为了“以后可能有用”提前塞大字段。
