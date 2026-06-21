# REQ-2026-083 设计稿：S3-CP1 exit confirmation and weekly data record

> 关联 REQ：`requirements/in-progress/REQ-2026-083-s3-cp1-exit-confirmation-and-weekly-data-record.md`
> 关联路线：`docs/plans/multi-agent-roadmap.md` §3 / §6.2 / §7.3 / §11

## 1. 设计目标

在遵守 §11"禁止把 observation 事件补成事后事实"和 §7.3"反向否决"的前提下，把 S3-CP1 观察期收口：诚实补记已缺失的周度客观数据，记录 sealed 缺失事实，勾选 S3-CP1，为 S3-CP2 §7 填表提供合规、可复核的数据基础。

## 2. 周度数据补记策略（核心）

### 2.1 诚实性约束

- `s3_observation_data_recorded` 的 `payload = { week_number, metrics }`，是**客观数据统计**，不是主观预测，补记合法。
- `ts`：使用补记的真实时刻（2026-06-21），不伪造为历史周。这是诚实标注"事后回填"的关键。
- `metrics`：只来自 `event-store read` 已落盘事件的真实计数，不编造未发生的事件。
- `week_number`：指代真实 ISO 周（W23=6/1–6/7、W24=6/8–6/14、W25=6/15–6/21），按事件真实 `ts` 归周。

### 2.2 周度划分与基线统计（来自 `read --json` 真实数据）

观察期窗口内 62 条事件，按 ISO 周分布（`ts >= 2026-05-31`）：

| ISO 周 | 时段 | 事件总数 | session_started | req_created | req_started | req_completed | req_blocked | 备注 |
|---|---|---|---|---|---|---|---|---|
| W22 | 5/25–5/31 | 11 | — | — | — | — | — | 仅含 5/31 当天，并入 W23 起算说明 |
| W23 | 6/1–6/7 | 42 | 高峰 | 含 075/076/077 §7 口径修复 + 078 启动 | — | — | — | 热身+正式观察起点 |
| W24 | 6/8–6/14 | 7 | 骤减 | — | — | — | — | 正式观察期，活动稀疏 |
| W25 | 6/15–6/21 | 2 | 近停 | — | — | — | — | 到期后基本停滞 |

> 上述逐周 type 计数在 build 阶段用 `read --json` 精确计算后填入各事件 `metrics`；本文表只记总量级。补记 3 条：W23 / W24 / W25。W22 仅含 5/31 一天，作为观察期起算边界说明，不单独补记。

### 2.3 metrics 口径

每条 `s3_observation_data_recorded` 的 `metrics` 至少包含：
- `total_events`：该周事件总数
- `req_started` / `req_completed`：该周 REQ 生命周期事件数
- `session_started`：该周 session 数
- `verifier_events`：该周 verifier_* 事件数（预期 0，记录"默认 envelope 未跑 subagent"事实）
- `conflict_detected`：该周冲突事件数（预期 0）
- `note`：与 sealed 的对比段（因 sealed 未填，记"无 sealed 可对比，主观维度降级 N/A"）

口径必须与 `stats --metrics` 的全局统计自洽（各周之和 ≈ 窗口总量）。

## 3. sealed expectation 处理（user 决策 c）

- 在 `S3-CP1-sealed-expectation-2026-06-03.md` 的"补充说明"区追加一段：
  - 声明 user 未填写 6 个主观问题；
  - 声明密封性已破坏（观察期结束 + 客观数据已暴露给 user）；
  - 降级 `subjective_honesty` 维度为 N/A，作为观察期协议缺陷记录；
  - 注明日期 2026-06-21 与关联 REQ-083。
- **绝不修改** 6 个主观问题正文与"观察后对比区"。如 user 后续补填，由 user 自行编辑或口述、agent 逐字记录并标注"观察后填写"。

## 4. 路线图变更

- §3 顶部"当前阶段"：`Stage 3 / S3-CP1 真实使用观察期` → `Stage 3 / S3-CP2 §7 填表`。
- §3 S3-CP1 checkbox：`[ ]` → `[x]`，补完成说明（周度数据补记、sealed 缺陷记录、退出确认）。
- §8 决策日志新增 2026-06-21 行：记录周度数据补记、sealed c 处理、S3-CP1 退出确认、进入 S3-CP2。

## 5. 反向否决自检（§7.3）本 REQ 边界

本 REQ 只解决 §7.3 第 2 条（周度 data_recorded 缺失）。其余反向否决项（sealed 代填、verifier 模式混杂、主观预测事后补）由本 REQ 诚实记录为"已知事实"，不在本 REQ 伪造规避；最终是否触发否决留到 S3-CP2 / REQ-B 的 §7.3 逐条核验。

## 6. 非目标重申

不填 §7 表、不做 S3-CP3 决策、不改 event-store schema、不代填 sealed 主观内容、不实现任务图。
