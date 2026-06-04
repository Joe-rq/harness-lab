# REQ-2026-075 设计文档

> 关联 REQ: [REQ-2026-075](../../requirements/completed/REQ-2026-075-stage-3-7-event-store-schema.md)
> 关联综合报告: [2026-06-03-multi-angle-roadmap-deduction.md](../../requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md)
> 设计日期: 2026-06-03

## 1. 设计目标

把路线图 §7 决策评估表从"橡皮尺"(6 维度无口径)升级为"可计算指标"——每个维度绑定至少 1 个事件 type + 计分公式 + 分子分母 + 不可用 fallback;同时给 event-store schema 加 version 字段支持后续演进,加按月 rotation 防止无界增长。

## 2. 13 个新事件 type 设计

### 2.1 §7 主指标遥测(9 个)

| Type | 触发时机 | Payload 必填字段 | 关联 §7 维度 |
|------|---------|----------------|------------|
| `verifier_blocked` | verifier 投 fail / scope-breach | `verdict`, `target_artifact` | 拦截率分子 |
| `verifier_passed` | verifier 投 pass | `verdict`, `target_artifact` | 拦截率分母 |
| `verifier_failed` | verifier 调用失败(subagent crash) | `error`, `target_artifact` | 失败率 |
| `conflict_detected` | `req:status --all` 报告 worktree 状态冲突 | `worktree_a`, `worktree_b`, `req_id` | 冲突次数 |
| `retry_attempted` | REQ 实施过程中 verifier 反馈后重试 | `req_id`, `attempt_number` | 失败率辅助 |
| `human_decision_made` | user 在 REQ 决策记录段落落 timestamp | `req_id`, `decision_summary` | 人工调度成本(决策时间) |
| `monthly_verifier_invocation_count` | 月初 cron / 手动 stats | `count`, `cost_usd` | F1 修复 + 成本预算($5/月告警) |
| `verifier_degraded` | 降级为 legacy fallback | `reason`, `original_mode` | F1 修复 + SPOF 降级 |
| `s3_verifier_cost_alert` | cost > $5/月触发 | `monthly_cost_usd`, `monthly_count` | Q5 决策落地 |

### 2.2 观察期专用(4 个)

| Type | 触发时机 | Payload 必填字段 | 关联 |
|------|---------|----------------|------|
| `s3_observation_window_start` | S3-CP1 正式启动时(REQ-075 落地后才有;临时用 session_started + payload.observation=true) | `start_ts`, `plan` | S3-CP1 启动/到期追踪 |
| `s3_observation_window_end` | S3-CP1 退出(S3-CP2 启动) | `end_ts`, `actual_duration_days` | S3-CP1 退出 |
| `s3_observation_data_recorded` | 每周一 metrics 周报 | `week_number`, `metrics` | S3-CP1 周度观察 |
| `s3_observation_paused` | 休假 / 暂停观察 | `pause_start_ts`, `reason` | Q2 真实观察期长度计算 |

## 3. §7 6 维度计分公式(将被 `stats --metrics` 实现)

### 3.1 单 agent 复杂任务失败率
- 分子: `verifier_failed + retry_attempted` 计数
- 分母: `req_completed` 计数(只在 verifier 实际跑过的 REQ 上)
- 启用条件: 分母 ≥ 3
- 不可用 fallback: N/A
- 阈值: > 30% 才考虑任务图

### 3.2 并行任务真实数量
- 数据源: `req_started` / `req_completed` 时间窗口重叠
- 指标: max(任意时刻活跃 REQ 数)
- 启用条件: 观察期 ≥ 1 周
- 不可用 fallback: N/A
- 阈值: ≥ 3 REQ 同时活跃才考虑任务图(但 §6.2 修订后应改 worktree 事件计数 — 此项在 REQ-076 重写)

### 3.3 独立 verifier 拦截率
- 分子: `verifier_blocked` 计数
- 分母: `verifier_blocked + verifier_passed` 计数
- 启用条件: 分母 ≥ 5
- 不可用 fallback: N/A(分母 = 0 时 §6.2 前置可用性声明强制走"收口")
- 阈值: < 20% 说明 verifier 弱不是主因

### 3.4 progress 冲突次数
- 数据源: `conflict_detected` 计数
- 启用条件: 观察期 ≥ 1 周
- 不可用 fallback: 0(若 REQ-076 未落地记 N/A)
- 阈值: Stage 2 后仍频繁冲突才考虑更强协调

### 3.5 人工调度成本(决策时间)
- 数据源: `human_decision_made` 时间间隔聚合
- 指标: 实际决策时间(user 做 REQ 范围/优先级/接受/拒绝判断),**排除**上下文续传/状态确认
- 启用条件: 观察期 ≥ 1 周 + `human_decision_made` ≥ 5
- 不可用 fallback: N/A
- 阈值: 每 REQ > 20 分钟(决策时间,不含协议续传)

### 3.6 主观诚实(密封对比)
- 数据源: `s3_observation_window_start` 时的 sealed expectation 文件(`requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`)vs 2 周后 §7 表实际数据
- 指标: 预期 vs 现实一致度
- 不可用 fallback: 无对照文件时记 N/A
- 阈值: 主观但必须诚实(由 user 写,2 周后 user 自行对比)

## 4. Schema 演进(version 字段)

```javascript
// 事件 schema
{
  id: string,          // ULID
  ts: string,          // ISO 8601
  type: string,        // 在 EVENT_TYPE_SCHEMAS 白名单中
  version: "1.0",      // semver,新字段;旧事件无此字段时 read 端默认 "0.9"
  reqId?: string,
  phase?: string,
  source: string,
  sessionId: string,
  worktree?: string,
  payload: object      // 由 EVENT_TYPE_SCHEMAS[type] 验证
}
```

### 演进规则
- **新增 type**: minor(1.1.0 → 1.2.0);旧 consumer 收到未知 type 时只 warn 不抛错
- **删除 type**: major(1.x → 2.0)+ 1 个 minor 警告期(>= 1.0.0,先标记 deprecated)
- **修改 payload schema**: 取决于兼容性(不兼容字段新增 = minor,字段类型变更 = major)

## 5. Rotation 策略

- 软上限: `MAX_EVENT_LINES` env var(默认 1000)
- 触发时机: appendEvents 时检查当前文件行数,> MAX_EVENT_LINES 时:
  1. 把当前文件 move 到 `events-archive/YYYY-MM.jsonl`(按文件 mtime 落月份)
  2. 新建空 `.claude/events/<worktree-hash>/<sessionId>.jsonl` 继续 append
- 读取兼容: `readEvents` 自动合并 `events-archive/*.jsonl` + `events/*.jsonl`,按 ts 排序
- 不删除: archive 目录只增不减,人工清理需手动

## 6. 影响范围

- `scripts/event-store.mjs` — 主实现文件
- `tests/event-store.test.mjs` — 现有测试,需扩展 9+4 个 type 用例
- `tests/event-store-metrics.test.mjs` — 新增,验证 `stats --metrics` 6 维度输出
- `docs/plans/REQ-2026-075-evaluation-metrics.md` — 新增,6 维度详细定义(被 `stats --metrics` 引用)

## 7. 风险与缓解

- **R-1 字段定义错误**: 每个 type 在 EVENT_TYPE_SCHEMAS 中有 schema 验证;单元测试覆盖每个 type 的合法/非法 payload
- **R-2 计分公式与 S3-CP2 实际口径不一致**: 公式落盘为 `REQ-2026-075-evaluation-metrics.md`,S3-CP2 填表时严格按此引用,不允许临场改
- **R-3 rotation 破坏读取**: `readEvents` 自动合并 archive 目录;测试覆盖 rotate 后读取
- **R-4 旧 consumer 拒绝新 type**: `version: "1.0"` 字段 + read 端对未知 type 只 warn 不抛错

## 8. 实施步骤

1. 在 `scripts/event-store.mjs` 增加 13 个新 type 到 `EVENT_TYPE_SCHEMAS` map
2. 实现 `version` 字段自动附加(read 端兼容旧事件无此字段)
3. 实现 `stats --metrics` 子命令,6 维度按 §3 公式输出
4. 实现 rotation 逻辑(`MAX_EVENT_LINES` env + `events-archive/` 目录)
5. 写 `docs/plans/REQ-2026-075-evaluation-metrics.md` 详细定义
6. 扩展 `tests/event-store.test.mjs`,每个新 type 1 个写入/读取/校验测试
7. 新增 `tests/event-store-metrics.test.mjs`,验证 6 维度输出 + 不可用 fallback
8. 跑 `npm test` / `npm run docs:verify` / `npm run check:governance`

## 9. 关联决策(user 在 2026-06-03 拍板)

- **Q1**:HARNESS_VERIFIER_MODE 全局默认 = envelope(影响 verifier_blocked/pass 写入频率)
- **Q2**:起算日 = 2026-05-31 + 1 周热身 + 1 周正式观察(影响 s3_observation_window_start 时机)
- **Q3**:Stage 2 退出确认重新验证(REQ-076 处理,本 REQ 不涉及)
- **Q4**:沿用路线图原值,只补口径(本设计 §3 直接采用)
- **Q5**:月度 > $5 告警 + 降级 legacy(影响 s3_verifier_cost_alert + verifier_degraded 触发条件)
- **Q6**:§10 推迟到 S3-CP3 之后(本 REQ 不涉及)
