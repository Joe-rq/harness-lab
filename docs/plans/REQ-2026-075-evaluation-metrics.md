# REQ-2026-075-evaluation-metrics

> 关联 REQ: [REQ-2026-075](../../requirements/completed/REQ-2026-075-stage-3-7-event-store-schema.md)
> 关联设计: [REQ-2026-075-design.md](REQ-2026-075-design.md)
> 关联综合报告: [2026-06-03-multi-angle-roadmap-deduction.md](../../requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md)
> 状态: 2026-06-03 落地

本文件定义 §7 决策评估表 6 维度的**计分公式、分子分母、启用条件、不可用 fallback**。S3-CP2 填表时必须严格按本文件引用,不允许临场改口径。

---

## 1. 维度 1: 单 agent 复杂任务失败率

| 项 | 值 |
|----|----|
| 分子 | `verifier_failed` 计数 + `retry_attempted` 计数 |
| 分母 | `req_completed` 计数(只在 verifier 实际跑过的 REQ 上) |
| 计分公式 | `(verifier_failed + retry_attempted) / req_completed` |
| 启用条件 | `req_completed ≥ 3` |
| 不可用 fallback | `value: 0, enabled: false`(分母 = 0 时) |
| 阈值 | > 30% 才考虑任务图(路线图原值) |
| 单位 | ratio |

**数据源事件 type**:
- `verifier_failed` — verifier 调用失败(subagent crash)
- `retry_attempted` — REQ 实施过程中 verifier 反馈后重试
- `req_completed` — REQ 实施完成

## 2. 维度 2: 并行任务真实数量

| 项 | 值 |
|----|----|
| 指标 | `req_started` 计数(本期简化版) |
| 计分公式 | 简化为总数;完整版应聚合 `req_started` / `req_completed` 时间窗口重叠 max |
| 启用条件 | `req_started ≥ 1` |
| 不可用 fallback | `value: 0, enabled: false` |
| 阈值 | ≥ 3 REQ 同时活跃才考虑任务图(本期放宽,完整版见后续 REQ) |
| 单位 | count |

**已知简化**:本 REQ-075 落地时只统计总数,时间窗口聚合(`max(req_started - req_completed)`)留待 REQ-076+ 补强。这是与综合报告 §7.1 一致的渐进落地。

**数据源事件 type**:
- `req_started` — REQ 启动
- `req_completed` — REQ 完成(用于时间窗口聚合)

## 3. 维度 3: 独立 verifier 拦截率

| 项 | 值 |
|----|----|
| 分子 | `verifier_blocked` 计数 |
| 分母 | `verifier_blocked + verifier_passed` 计数 |
| 计分公式 | `verifier_blocked / (verifier_blocked + verifier_passed)` |
| 启用条件 | 分母 ≥ 5 |
| 不可用 fallback | `value: 0, enabled: false`;§6.2 前置可用性声明强制走"收口"(分母 = 0 时不可凭此维度做决策) |
| 阈值 | < 20% 说明 verifier 弱不是主因(路线图原值) |
| 单位 | ratio |

**数据源事件 type**:
- `verifier_blocked` — verifier 投 fail / scope-breach(payload: verdict, target_artifact)
- `verifier_passed` — verifier 投 pass(payload: verdict, target_artifact)

## 4. 维度 4: progress 冲突次数

| 项 | 值 |
|----|----|
| 指标 | `conflict_detected` 计数 |
| 计分公式 | 简单计数 |
| 启用条件 | 总是启用(分母 = 0 也输出 0) |
| 不可用 fallback | `value: 0`(若 REQ-076 未落地导致无事件源时,记 N/A;本 REQ 落地后默认记 0) |
| 阈值 | Stage 2 后仍频繁冲突才考虑更强协调(本期未给具体阈值,由 S3-CP3 临场判断) |
| 单位 | count |

**数据源事件 type**:
- `conflict_detected` — `req:status --all` 报告 worktree 状态冲突(payload: worktree_a, worktree_b, req_id)

## 5. 维度 5: 人工调度成本(决策时间)

| 项 | 值 |
|----|----|
| 指标 | `human_decision_made` 计数(本期简化版) |
| 计分公式 | 简化为总决策次数;完整版应聚合 `human_decision_made` 时间间隔 |
| 启用条件 | `human_decision_made ≥ 5` |
| 不可用 fallback | `value: 0, enabled: false` |
| 阈值 | 每 REQ > 20 分钟(决策时间,不含协议续传)(路线图原值) |
| 单位 | minutes/req |

**已知简化**:本 REQ-075 落地时只统计决策次数,不计算 elapsed 时间。完整版需在 REQ-076 落地时给 `human_decision_made` payload 加 `elapsed_minutes` 字段,后续 REQ 补强。

**排除范围**(per 综合报告角度 A 第 4 条):
- ❌ 上下文续传 / 状态确认时间(协议必需)
- ❌ 协议类决策豁免(REQ 创建/启动确认等)
- ✅ 只算 user 做 REQ 范围 / 优先级 / 接受 / 拒绝的判断

**数据源事件 type**:
- `human_decision_made` — user 在 REQ 决策记录段落落 timestamp(payload: req_id, decision_summary)

## 6. 维度 6: 主观诚实(密封对比)

| 项 | 值 |
|----|----|
| 数据源 | 密封预期文件 `requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md` vs 2 周后 §7 表实际数据 |
| 计分公式 | 预期 vs 现实一致度(由 user 自行对比,无自动化) |
| 启用条件 | 总是启用(但不可用时记 "see sealed expectation") |
| 不可用 fallback | `value: 'see sealed expectation', enabled: true` |
| 阈值 | 主观但必须诚实(由 user 写,2 周后 user 自行对比) |
| 单位 | qualitative |

**机制**(per 综合报告角度 A 第 8 条 + 悲观派盲点 1):
- S3-CP1 启动当天 user 写一份密封"我担心什么 / 我希望结果是什么",签名 + 日期戳
- 2 周后 S3-CP2 评估时,user 自行对比预期 vs 现实
- 不写密封 = 主观项不可用 = §6.2 决策表整体走"收口"

---

## 7. 聚合规则(per 综合报告 §7.0)

- 6 维度中 ≥ 4 项达阈值 → 建议开启任务图
- ≥ 2 项达阈值 → 建议修订
- ≤ 1 项达阈值 → 建议收口

**反向否决项**(任一为真则只能走"收口 / 修订",即使正向全达):
- 观察期内新事件 type 定义 > 5 次(schema 还不稳)
- 出现 R3+ 风险状态切换 > 3 次(hook 体系未稳)
- 任何 worktree 出现过事件丢失(Stage 2 还不稳)
- verifier 拦截率分母 = 0(F1/F2 未修)

## 8. 启用条件矩阵(per 综合报告 §7.1)

| 维度 | 数据源 | 启用条件 | 分母下限 |
|------|--------|---------|---------|
| 失败率 | verifier_failed / retry_attempted / req_completed | req_completed ≥ 3 | 3 |
| 并行数 | req_started | req_started ≥ 1 | 1 |
| 拦截率 | verifier_blocked / verifier_passed | (blocked + passed) ≥ 5 | 5 |
| 冲突数 | conflict_detected | 总启用 | 0 |
| 决策时间 | human_decision_made | human_decision_made ≥ 5 | 5 |
| 主观诚实 | 密封文件 | 总启用 | 0 |

**任一维度 `enabled: false` 时,§6.2 决策表该项记 N/A,聚合规则不计该项**。

## 9. 已知未实现(留待后续 REQ 补强)

- 维度 2 时间窗口聚合
- 维度 5 `elapsed_minutes` 字段
- 维度 4 冲突的 worktree 自动检测(目前需手动调 `req:status --all` 写入)
- 维度 6 自动对比(sealed expectation vs 实际)需 user 手动

## 10. 引用本文件的下游

- `scripts/event-store.mjs computeEvaluationMetrics()` — 实现本文件 §1-6 的 6 维度计算
- `node scripts/event-store.mjs stats --metrics` — CLI 暴露
- S3-CP2 §7 评估表填表时,数据源 / 公式 / 阈值严格按本文件
- S3-CP3 决策时,聚合规则按本文件 §7,反向否决项按本文件 §7
