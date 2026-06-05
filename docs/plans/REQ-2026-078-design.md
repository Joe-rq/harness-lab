# REQ-2026-078 设计文档

> 关联 REQ: REQ-2026-078  
> 设计日期: 2026-06-05

## 1. 目标

把 S3-CP1 从"前置整改完成"推进到"正式观察期已启动"。本 REQ 只做三件事:应用路线图 section patches、创建 sealed expectation 文件、写第一条 `s3_observation_window_start` 事件。

## 2. 路线图 patch 策略

`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` 已列出 18 个 section patches。本 REQ 将它们压缩为一次路线图修订:

- 顶部增加 TL;DR 和观察期状态。
- §0 增加恢复步骤。
- §1/§3/§6/§7/§8/§9/§10/§11/§12 更新为 S3-CP1 可执行状态。
- §4/§5 同步 REQ-075/076/077 已完成后的事实。

路线图仍禁止任务图实现,直到 S3-CP3 决策门给出明确结论。

## 3. Sealed Expectation

创建:

```text
requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md
```

文件包含 user 填写区、填写规则和对比位置。Agent 不代填主观预测,只留占位。

## 4. 事件写入

REQ-075 已注册 `s3_observation_window_start` schema。本 REQ 通过 `appendEvent` 写入当前 worktree 事件文件,字段包括:

- `start_date`: `2026-05-31`
- `warmup_until`: `2026-06-07`
- `formal_until`: `2026-06-14`
- `mode_default`: `envelope`
- `budget_usd`: `5`
- `source_report`: `requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md`

## 5. 验证

- `rg` 检查路线图和 sealed expectation 关键词。
- `node scripts/event-store.mjs read --json` 检查事件存在。
- `node scripts/event-store.mjs stats --metrics` 检查 stats 可读。
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- `node scripts/req-audit.mjs --id REQ-2026-078 --verbose`
