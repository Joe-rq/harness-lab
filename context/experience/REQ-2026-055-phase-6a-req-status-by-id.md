# 2026-05-01 Phase 6a: req:status --id 按 REQ ID 查询状态

## 场景

Phase 6a 实现了 `req:status --json`，但只能输出"当前活跃 REQ"。外部编排器在任务完成、blocked、重试、恢复时，需要按 REQ ID 查询历史状态做幂等恢复和 reconciliation。REQ-2026-055 实现了 `--id` 参数，让编排器能按 ID 查询任意 REQ 状态。

## 关联材料

- REQ: `requirements/completed/REQ-2026-055-phase-6a-req-status-by-id.md`
- Code Review: `requirements/reports/REQ-2026-055-code-review.md`
- QA: `requirements/reports/REQ-2026-055-qa.md`

## 问题 / 模式

- **函数提取时机**：statusCommand 内的字段提取逻辑（readiness 计算、block_reason 解析、criteria 提取）在 `--id` 和默认模式中完全相同，是提取共用函数的明确信号。不提前提取会导致两个分支代码重复。
- **字段名语义差异**：默认模式用 `active_req`（强调"当前活跃"），`--id` 模式用 `req`（强调"这个 REQ"）。编排器消费时应注意区分：`active_req` 暗示这是当前工作焦点，`req` 只是查询结果。

## 关键决策

- **决策 1：查询逻辑复用 `getReqPathById`**（遍历 in-progress + completed，按文件内状态字段输出）。理由：不按目录名推断状态，completed 目录下的 REQ 状态由文件内容决定。
- **决策 2：`--all` 列表查询留到 6b**。理由：YAGNI，先做单点查询验证需求，全量列表等真实编排器消费证据再开。
- **决策 3：提取 `buildReqStatusObject` 共用函数**。理由：避免默认模式和 `--id` 模式之间的代码重复，降低维护成本。

## 解决方案

1. 在 statusCommand 开头增加 `--id` 分支，使用 `getReqPathById` 定位 REQ 文件
2. 提取 `buildReqStatusObject` 函数，封装 readiness/block_reason/criteria/missing_reports 等字段提取逻辑
3. `--id` JSON 模式使用 `req` 字段（而非 `active_req`），语义更准确
4. 不存在的 ID 返回 `{ req: null, error: "not_found" }`
5. 新增 5 个测试用例覆盖 completed / not-found / text-mode / regression

## 复用建议

- 任何需要"按 ID 查询某个实体状态"的场景，都可以复用 `--id` 模式的模式：默认行为（显示当前焦点）+ `--id` 行为（按 ID 查询任意实体）
- `buildReqStatusObject` 的提取模式：当两个代码路径的字段组装逻辑相同时，立即提取共用函数，不要等"第三次重复"
