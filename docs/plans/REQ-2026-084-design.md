# REQ-2026-084 设计稿：S3-CP2 §7 决策评估表填写

> 关联 REQ：`requirements/in-progress/REQ-2026-084-s3-cp2-section-7-decision-table-fill.md`
> 数据源：`node scripts/event-store.mjs stats --metrics`（2026-06-21 快照）

## 1. §7.1 七维度数据映射

| 维度 | stats 真实值 | enabled | 当前数据（填入表） | 结论（填入表） |
|---|---|---|---|---|
| 单 agent 复杂任务失败率 | `verifier_failed=0`+`retry_attempted=0` / `req_completed=13` = 0% | true | 0%（0/13） | 远低于 30%，**不指向任务图** |
| 并行任务真实数量 | `req_started=13`，但时间窗口聚合未实现 | true（但口径不可信） | 13 started，**口径不可信**（脚本自标注未实现窗口聚合） | **无法判定**，不计入有效信号 |
| 独立 verifier 拦截率 | `verifier_blocked=0`、`verifier_passed=0`，分母 0 | false（verifier 事件 <5） | verifier 事件 0（默认 envelope 未跑 subagent） | **维度禁用**，verifier 弱不是主因无法判定 |
| progress/projection 冲突 | `conflict_detected=0`，观察期跑过 `req:status --all` 聚合 | true | 0 冲突 | **不指向更强协调** |
| 人工调度成本 | `human_decision_made=0` | false（<5 次） | 0 次人工决策记录 | **维度禁用**（无人记 human_decision） |
| verifier 成本压力 | `monthly_verifier_invocation_count=0`，明确无外部调用 | true（有明确无外部调用记录） | 0 外部调用，0 成本 | **无压力**，不指向任务图（即便有也只是降级） |
| 主观复杂度意愿 | sealed expectation user 未填（REQ-083 记录 N/A） | true（但数据 N/A） | sealed 未填，**N/A** | **N/A**（密封已破，主观维度降级） |

## 2. §7.2 聚合判定

**维度启用盘点**：
- `enabled=true`（stats 口径）：failure_rate、parallel_req_count、conflict_count、subjective_honesty = 4 个。
- 但**实质可用**：failure_rate（可信）、conflict_count（可信）= 2 个可信。
- parallel_req_count：enabled 但**口径不可信**（时间窗口聚合未实现），不计有效。
- subjective_honesty：enabled 但**数据 N/A**（sealed 未填），不计有效。
- interception_rate、decision_time：enabled=false（数据采集前提不满足）。

**任务图指向信号数**：0（所有有效维度数据都不指向任务图）。

**规则套用**：
- §7.2.1"至少 4 维度启用才能决策"：机械数 enabled=4，但去掉不可信(parallel)与无数据(subjective)后实质 2 个 → **不满足决策门槛的实质条件**。
- §7.2.2"开任务图需 ≥3 维度指向 + 含失败率/并行"：指向任务图 0 个 → **不满足**。
- §7.2.3"收口需 0-1 指向 + user 主观不支持扩张"：指向 0 个 ✓，但 user 主观 N/A → **主观条件无法由 sealed 确认**。
- §7.2.4"修订用于 ≤2 任务图信号 + 仍有明确痛点"：信号 0 个 ✓，明确痛点 = 治理工具摩擦（REQ-083 experience）✓ → **修订匹配**。

**结论**：数据强烈指向"不开任务图"。在收口与修订之间，§7.2 规则因 subjective N/A 无法自动区分，交 S3-CP3 由 user 拍板；建议倾向**修订**（修治理工具摩擦 + 采数工作流），因有明确痛点且 single-agent 已够用。

## 3. §7.3 反向否决逐条核验

| # | 反向否决条件 | 核验 | 命中 |
|---|---|---|---|
| 1 | 观察期 <2 周且无延长记录 | 满 2 周（5/31–6/14）+ 超期 7 天已记录 | 否 |
| 2 | 缺 `window_start` 或周度 `data_recorded` | start=1、data_recorded=3（REQ-083 补齐） | 否 |
| 3 | sealed 由 agent 代填或观察后补主观 | user 未填、agent 未代填、未事后补（缺失≠造假，主观维度降级 N/A） | 否 |
| 4 | verifier 默认模式混杂 | 统一 envelope，verifier 事件 0，口径一致 | 否 |
| 5 | 主要痛点来自文档恢复/PreCompact/projection/成本 而非并行协作 | 观察期实际痛点 = 治理工具摩擦（scope-guard 死锁、req-check hook 噪声），非并行协作 | **是** |

**§7.3 第 5 条命中 → 不得开启任务图专项。** 与 §7.2（0 任务图信号）一致。

## 4. S3-CP3 决策建议（交 user）

数据结论：**不开任务图**。剩余决策：收口 vs 修订。

| 选项 | 触发 | 理由 |
|---|---|---|
| 收口 | 接受 single-agent + envelope 已够用，关闭 multi-agent 路线转维护 | 12 REQ 全过、0 失败、0 拦截、0 人工决策成本；痛点不来自并行协作 |
| 修订（建议） | 仍有明确痛点（治理工具摩擦）需修，但不走任务图 | 修 scope-guard REQ-self 豁免、req-check hook 噪声、采数工作流（让 §7 维度可启用）；这些是真实瓶颈，任务图不是 |

user 在 S3-CP3 拍板。本 REQ 不替 user 决策。

## 5. 非目标重申

不做 S3-CP3 决策、不改 event-store schema/采集工作流、不代填 sealed、不实现任务图。
