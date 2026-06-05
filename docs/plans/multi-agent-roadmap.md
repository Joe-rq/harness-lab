# harness-lab 多 Agent 拓展路线图

> 起草日期: 2026-05-22  
> 重整日期: 2026-05-31  
> 当前阶段: **Stage 3 / S3-CP1 真实使用观察期**
> 当前 REQ: 无

---

## TL;DR

- Stage 1 和 Stage 2 已完成退出确认,但 S3-CP1 不是"自动开始"。
- 2026-06-03 多角度推演要求先完成三件事:路线图 18 个 section patches、密封预期文件、第一条 `s3_observation_window_start` 事件。
- 2026-05-31 作为观察期起算日;2026-05-31 至 2026-06-07 为热身,2026-06-08 至 2026-06-14 为正式观察。
- S3-CP1 默认 verifier 模式为 `envelope`;月度 verifier 成本超过 5 USD 必须告警并降级评估。
- 未到 S3-CP3 决策门前,禁止实现完整任务图、fixer 派生或 agent team runtime。

---

## 0. 中断恢复指南

每次恢复本路线时,按下面顺序读:

1. 看 `requirements/INDEX.md` 和 `.claude/progress.txt`,确认当前活跃 REQ。
2. 看本文件 §3,找到第一个未完成 checkpoint。
3. 看该 checkpoint 的产物和退出标准,不要凭印象继续。
4. 看 §8 决策日志,确认路线是否被修订。
5. 如果 checkpoint 涉及代码变更,先确认已有 REQ 已 `req:start`;没有则先创建 REQ。
6. 如果从 PreCompact / 压缩后恢复,先读最近一次 `requirements/reports/`、`context/experience/` 和事件账本最新事件,确认上一轮真正落盘到哪里。

路线图不是 REQ。每个工程 checkpoint 必须落到一个 REQ,并按项目治理要求生成 review / QA / experience。

---

## 1. 决策摘要

### 1.1 核心判断

Harness Lab 可以从单 agent 治理演进到多 agent 协作治理,但演进对象不是新的 Agent 编排框架,而是三层能力:

1. **独立验证**:把 reviewer / QA 从 worker 的上下文里隔离出来。
2. **事件账本**:把 progress / hook / REQ 状态从单文件状态变成可投影的追加记录。
3. **决策门**:用真实数据判断是否还需要完整任务图。

这条路线的默认终点不是任务图,而是一个更可靠的治理协议。如果 Stage 1 和 Stage 2 已经解决主要痛点,路线应主动收口。

### 1.2 为什么不另开炉灶

- 当前仓库已有 65+ 个 REQ 的治理资产,重建成本高。
- Stage 1 和 Stage 2 单独可用,不依赖 Stage 3 成立。
- 本项目定位是研发治理层模板,不是业务运行时或 Agent runtime。
- 多 Agent 的价值应先体现在证据隔离和状态继承,而不是调度复杂度。

### 1.3 不做清单

- 不搬运 wow-harness v3 完整 21 模块。
- 不做完整任务图 / fixer 自动派生 / agent team runtime,除非 Stage 3 决策门放行。
- 不做概念节点 supersede 链,暂不改 invariants 结构。
- 不做 deterministic replay / hash 验证。
- 不把 `progress.txt` 和事件流做成双主真相源。
- 不引入 SaaS、数据库、队列或后台服务。

### 1.4 成功定义

| 层级 | 成功标准 |
|------|----------|
| Stage 1 | verifier 在独立上下文、只读工具权限下运行,并留下可复现验证证据 |
| Stage 2 | 多 session / 多 worktree 可以追加事件,`progress.txt` 可由事件投影重建 |
| Stage 3 | 用事件账本和密封预期对比决定是否需要完整任务图,而不是按想象开工 |

Stage 1 + Stage 2 收口后,主真相源是 `.claude/worktrees/{namespace}/events/{sessionId}.jsonl` 事件流;`progress.txt` 只是投影缓存,`requirements/INDEX.md` 是 REQ 文件状态索引。三者冲突时,优先按事件流重建,再检查 REQ 文件落点。

---

## 2. 路线总览

```text
Stage 1: Independent Verifier
  S1-CP2.5 调用入口 Spike
  S1-CP3   verifier envelope + session runner
  S1-CP4   auto-review / auto-qa 集成
  S1-CP5   对照案例 + QA 证据
  S1-CP6   Stage 1 退出确认

Stage 2: Event Ledger + Progress Projection
  S2-CP1   事件 schema + append API
  S2-CP2   接入 1-2 个高频写入点
  S2-CP3   progress.txt projection
  S2-CP4   worktree-aware 聚合
  S2-CP5   Stage 2 退出确认

Stage 3: Task Graph Decision Gate
  S3-CP1   真实使用观察期(2026-05-31 起算;2026-06-14 到期)
  S3-CP2   数据填表
  S3-CP3   决策:收口 / 修订 / 开启任务图专项
```

核心依赖:

- Stage 1 不依赖 Stage 2。
- Stage 2 不依赖完整任务图。
- Stage 3 只能在 Stage 1 + Stage 2 真实运行至少 2 周后进入;2026-06-05 之前的 REQ-075/076/077 是观察期前置修复,不算任务图实现。

---

## 3. 当前进度表

维护协议:

- checkpoint 只有在对应 REQ 完成、报告落盘、验证通过后才勾选。
- 如果只是完成 spike 或文档修订,也必须在 §8 决策日志补记录。
- 顶部当前阶段必须和本表第一个未完成 checkpoint 一致。

### Stage 1: Independent Verifier

- [x] **S1-CP1** — REQ 创建: `REQ-2026-066-stage-1-verifier-session-schema.md`
- [x] **S1-CP2** — 能力 Spike:确认 Claude Code subagent 支持 schema 级 `tools` / `disallowedTools` 白名单,并有独立 context window
- [x] **S1-CP2.5** — 调用入口 Spike:确认本仓 Node 脚本能否稳定启动 verifier subagent 并拿回结构化输出 → **结论 A(可脚本调用)**，详见 REQ-066 Spike 记录
- [x] **S1-CP3** — 实现 verifier envelope + runner: `scripts/verifier-session.mjs`
- [x] **S1-CP4** — 集成 `auto-review.mjs` / `auto-qa.mjs`,并保留 legacy fallback
- [x] **S1-CP5** — QA 证据:至少 1 个旧 verifier 漏报、新 verifier 查出的对照案例
- [x] **S1-CP6** — Stage 1 退出确认

### Stage 2: Event Ledger + Progress Projection

- [x] **S2-CP1** — 事件 schema + append API: `REQ-2026-070-stage-2-event-schema-and-append-api.md`
- [x] **S2-CP2** — 实现事件账本 MVP,接入高频写入点: `REQ-2026-071-stage-2-event-ledger-high-frequency-writers.md`
- [x] **S2-CP3** — REQ 创建: `progress.txt` projection: `REQ-2026-072-stage-2-progress-projection.md`
- [x] **S2-CP4** — 实现 progress 投影与重建,旧 `progress.txt` 降级为缓存: `REQ-2026-072-stage-2-progress-projection.md`
- [x] **S2-CP5** — REQ 创建:worktree-aware 事件聚合: `REQ-2026-073-stage-2-worktree-aware-event-aggregation.md`
- [x] **S2-CP6** — 实现多 worktree 事件聚合查询: `REQ-2026-073-stage-2-worktree-aware-event-aggregation.md`
- [x] **S2-CP7** — Stage 2 退出确认: `REQ-2026-074-stage-2-exit-confirmation.md`

### Stage 3: Task Graph Decision Gate

- [ ] **S3-CP1** — Stage 1 + Stage 2 真实使用至少 2 周:起算 2026-05-31;热身至 2026-06-07;正式观察至 2026-06-14;启动手续由 `REQ-2026-078` 完成
- [ ] **S3-CP2** — 填写 §7 决策评估表
- [ ] **S3-CP3** — 决策:路线收口 / 修订路线 / 开启完整任务图专项

---

## 4. Stage 1 详细规划: Independent Verifier

### 4.1 目标

让 verifier 在与 worker 隔离的上下文里运行,并通过工具白名单保持只读。它要验证 artifact,而不是复述 worker 的推理路径。

### 4.2 架构边界

| 项 | 决策 |
|----|------|
| agent 类型 | Stage 1 使用 Claude Code subagent,不使用 background agents |
| 权限 | `Read` / `Grep` / `Glob` only;禁止 `Write` / `Edit` / `Bash` / `NotebookEdit` / `Task` |
| 通信 | JSON envelope,只传 artifact 路径、REQ ID、检查类型和输出路径 |
| fallback | `HARNESS_VERIFIER_MODE=legacy` 保留旧逻辑 |
| 非目标 | 不派生 fixer,不跨 worktree,不改 progress 读写 |

### 4.3 S1-CP2.5 调用入口 Spike

这是 Stage 1 的关键前置。S1-CP2 只证明 subagent 能力存在,没有证明脚本可调用。

需要回答:

1. Node 脚本是否有稳定方式启动指定 subagent。
2. 是否能传入 JSON envelope。
3. 是否能拿回结构化结果,而不是只能在 UI 中查看。
4. 超时、失败、权限拒绝时如何表现。

允许结论:

| 结论 | 后续路线 |
|------|----------|
| A. 可脚本调用 | 继续 S1-CP3,实现 `scripts/verifier-session.mjs` |
| B. 只能人工/agent 调用 | S1-CP3 改为生成 verifier envelope + verifier prompt,由独立 agent/manual 消费 |
| C. 调用不稳定 | Stage 1 降级为只读 verifier 文档协议,等待 runtime 能力成熟 |

产物:

- Spike 记录写入 REQ-2026-066 的关键决策或 QA 草稿。
- 若路线偏离,同步更新本文件 §8 决策日志。

退出标准:

- 有一条真实命令或真实手动流程证明调用方式。
- 记录输入 envelope 示例、输出示例、失败示例。
- 明确选择 A/B/C 之一。

### 4.4 S1-CP3 实现计划

在 S1-CP2.5 选择 A 时:

- 新建 `.claude/agents/verifier.md`,声明 schema 级工具白名单和黑名单。
- 新建 `scripts/verifier-session.mjs`:
  - 校验 envelope schema。
  - 写入临时 envelope 文件。
  - 调用 verifier。
  - 解析 verifier 输出。
  - 超时或失败时给出清晰错误。
- 不在 runner 中读取 artifact 内容;artifact 由 verifier 自行读取。

在 S1-CP2.5 选择 B 时:

- 新建 `scripts/verifier-session.mjs` 作为 envelope 生成器和结果收集器。
- 输出可复制给独立 verifier 的 prompt 路径。
- `auto-review` / `auto-qa` 先不默认调用 subagent,只生成待验证包。

### 4.5 S1-CP4 集成计划

集成顺序:

1. `auto-review.mjs` 先接入 verifier,因为它天然只读且不执行命令。
2. `auto-qa.mjs` 后接入,因为它当前会执行验证命令,与只读 verifier 边界冲突。
3. legacy fallback 必须保持可用。

统一模式契约:

```text
HARNESS_VERIFIER_MODE=legacy   -> 旧逻辑
HARNESS_VERIFIER_MODE=envelope -> 只生成 verifier 包
HARNESS_VERIFIER_MODE=subagent -> 调用 verifier subagent
```

三入口 `scripts/verifier-mode.mjs`、`scripts/auto-review.mjs`、`scripts/auto-qa.mjs` 必须共享同一个模式解析规则。S3-CP1 期间默认值固定为 `envelope`;只有人工显式设置 `HARNESS_VERIFIER_MODE=subagent` 时才允许外部 verifier 调用。

### 4.6 Stage 1 退出标准

必须全部满足:

1. `.claude/agents/verifier.md` 权限白名单经过实测。
2. verifier 不能写文件的绕过测试有证据。
3. 至少 1 个真实对照案例:旧模式通过、新 verifier 发现问题。
4. `legacy` fallback 路径测试通过。
5. `npm test`、`npm run docs:verify`、`npm run check:governance` 通过。
6. REQ-2026-066 的 code-review / QA / experience 落盘。

### 4.7 Stage 1 风险

| 风险 | 处理 |
|------|------|
| Node 脚本无法直接启动 subagent | 降级为 envelope + manual verifier,不要硬造 runtime |
| verifier 上下文仍被污染 | envelope 只传路径和约束,不传 worker 推理过程 |
| auto-qa 需要 Bash,而 verifier 禁止 Bash | 把命令执行留在主 session,verifier 只审查 QA evidence |
| 启动延迟 > 30s 或 verifier 不可用 | 记录 `verifier_degraded` 事件,降级为 `envelope`,不静默回落到未记录状态 |
| 月度 verifier 成本 > 5 USD | 写 `s3_verifier_cost_alert` 事件,暂停默认外部调用,只保留 envelope 和人工抽查 |

---

## 5. Stage 2 详细规划: Event Ledger + Progress Projection

### 5.1 目标

把 `progress.txt` 从主真相源降级为事件投影缓存,让多 session / 多 worktree 能并行记录事实,再由投影生成当前状态。

Stage 2 只做治理事件账本,不做完整 ESAA replay,不做全量 deterministic replay。

### 5.2 事件账本原则

| 原则 | 说明 |
|------|------|
| append-only | 事件只追加,不原地改写 |
| 单 writer 文件 | 每个 session/worktree 写自己的 jsonl,避免跨进程竞争 |
| projection 可重建 | `progress.txt` 可从事件流重建 |
| 旧入口兼容 | 现有 `req:status`、session-start 仍有可读输出 |
| schema 小 | 只记录治理事实,不记录完整聊天内容 |

推荐路径:

```text
.claude/worktrees/{namespace}/events/{sessionId}.jsonl
.claude/worktrees/{namespace}/events-archive/{sessionId}-YYYY-MM.jsonl
```

最小事件字段:

| 字段 | 说明 |
|------|------|
| `id` | 事件 ID |
| `ts` | ISO 时间 |
| `type` | 事件类型 |
| `reqId` | 可选 REQ ID |
| `phase` | 可选阶段 |
| `source` | hook / cli / manual |
| `sessionId` | 会话 ID |
| `worktree` | worktree 路径或 hash |
| `payload` | 小型结构化数据 |

### 5.3 S2-CP1 / S2-CP2: 事件账本 MVP

REQ 范围建议:

- 新建 `scripts/event-store.mjs`。
- 新建 schema 文档或在脚本内导出 schema 说明。
- 接入 1-2 个高频写入点,优先:
  - `session-start.js`: 写 `session_started`
  - `req-cli.mjs`: 写 `req_started` / `req_completed`
- 测试 append、schema 校验、坏事件拒绝、写入性能。

不做:

- 不改所有 hook。
- 不替换 `progress.txt`。
- 不做 worktree 聚合。

退出标准:

- append 写入 < 50ms。
- 两个独立事件文件可被读取并排序。
- 坏 schema 事件不会写入。
- 现有测试通过。

### 5.4 S2-CP3 / S2-CP4: progress projection

REQ 范围建议:

- `event-store.mjs` 增加 projector。
- `session-start.js` 改为优先读取 projection。
- `req-cli.mjs status` 改为展示 projection 结果。
- `progress.txt` 作为缓存输出,不再是主真相源。缓存头部应能表达投影来源,建议包含 `cache_version`、`source=events`、`event_count`、`last_event_ts`。

退出标准:

- 删除 `progress.txt` 后可从事件流重建。
- `requirements/INDEX.md`、projection、progress 缓存不冲突。
- 当前活跃 REQ、阶段、最近摘要可正确展示。

### 5.5 S2-CP5 / S2-CP6: worktree-aware aggregation

REQ 范围建议:

- 复用 `worktree-utils.mjs`。
- 每个 worktree 维护自己的 `.claude/worktrees/{namespace}/events/{sessionId}.jsonl` 事件文件。
- 主仓提供聚合查询,不跨 worktree 写同一个文件。
- `req:status --all` 或新参数展示多 worktree 状态。

退出标准:

- 两个 worktree 同时写事件无数据丢失。
- 聚合查询能显示每个 worktree 的活跃 REQ 和阶段。
- 冲突只以报告形式展示,不自动合并状态。

### 5.6 Stage 2 退出标准

必须全部满足:

1. 事件账本、projection、worktree 聚合三个 REQ 都完成。
2. `progress.txt` 可删除并重建。
3. 两个 worktree 并行写入通过手动验证。
4. `npm test`、`npm run docs:verify`、`npm run check:governance` 通过。
5. QA 报告包含事件文件样例、重建样例、并行写入样例。

---

## 6. Stage 3 详细规划: Task Graph Decision Gate

Stage 3 不是工程任务。它是一次是否继续扩张的判断。

### 6.1 进入条件

- Stage 1 完成并真实使用至少 2 周。
- Stage 2 完成并真实使用至少 2 周。
- 至少有 3 个真实 REQ 经过新 verifier 或事件账本。
- S3-CP1 观察期内至少有 3 个真实 REQ 或等价治理会话写入事件账本;若不足,必须延长观察期,不能用估计补齐。
- `REQ-2026-075`、`REQ-2026-076`、`REQ-2026-077` 已完成,分别补齐 §7 事件口径、worktree 路径隔离、verifier 默认值与只读边界。
- §7 评估表有真实数据,不是估计。

### 6.2 可选决策

| 决策 | 触发条件 | 后续 |
|------|----------|------|
| 收口 | 独立 verifier + 事件账本已经解决主要痛点,且 §7 无反向否决 | 关闭 multi-agent 路线,转入维护 |
| 修订 | 仍痛,但痛点不是任务图,例如上下文继承、信息需求或恢复协议不足 | 开新路线,例如 Context Capsule / InfoNeed |
| 开启任务图专项 | 单 agent 推不动和并行协作仍是主要瓶颈,且 §7 聚合规则放行 | 另建 REQ 组,先写架构设计 |

修订分支不是"轻量任务图"的后门。若 §7 数据显示痛点来自上下文压缩、证据口径或恢复路径,只能修订这些能力;不得借修订名义实现 worker / verifier / fixer runtime。

### 6.3 若开启任务图,必须先回答

1. 谁负责创建任务节点。
2. 节点状态如何进入事件账本。
3. worker / verifier / fixer 的权限如何隔离。
4. 失败重试和人工升级如何记录。
5. 如何保证它仍是治理层,不是业务 runtime。

---

## 7. Stage 3 决策评估表

S3-CP2 填表时只能使用事件账本、QA 报告和 user 明确文字,不能用 agent 事后感觉补数。推荐先运行:

```bash
node scripts/event-store.mjs stats --metrics
```

### 7.1 可执行指标

| 维度 | 数据源 | 启用条件 | 任务图倾向阈值 | 当前数据 | 结论 |
|------|--------|----------|----------------|----------|------|
| 单 agent 复杂任务失败率 | `verifier_failed` + `retry_attempted` / `req_completed` | `req_completed >= 3` | > 30% 才考虑任务图 | (待 S3-CP2 填) | (待填) |
| 并行任务真实数量 | worktree namespace 下 `req_started` 时间窗口重叠 | 至少 1 次并行窗口可复核 | >= 3 个 REQ 同时活跃才考虑任务图 | (待 S3-CP2 填) | (待填) |
| 独立 verifier 拦截率 | `verifier_blocked` / (`verifier_blocked` + `verifier_passed`) | verifier 事件 >= 5 | < 20% 说明 verifier 弱不是主因 | (待 S3-CP2 填) | (待填) |
| progress / projection 冲突次数 | `conflict_detected`、REQ audit、QA 报告 | 观察期内至少跑过一次聚合查询 | Stage 2 后仍频繁冲突才考虑更强协调 | (待 S3-CP2 填) | (待填) |
| 人工调度成本 | `human_decision_made` 事件与 REQ 记录 | 至少 5 次人工决策记录 | 每个 REQ > 20 分钟才考虑自动任务图 | (待 S3-CP2 填) | (待填) |
| verifier 成本压力 | `monthly_verifier_invocation_count`、`s3_verifier_cost_alert` | 有成本记录或明确无外部调用 | 月度 > 5 USD 先降级,不是直接上任务图 | (待 S3-CP2 填) | (待填) |
| 主观复杂度意愿 | `S3-CP1-sealed-expectation-2026-06-03.md` 与观察后复盘 | user 已填写密封预期 | 仍愿承担复杂度才可进入任务图设计 | (待 user 填) | (待填) |

### 7.2 聚合规则

1. 只有当至少 4 个维度已启用,才能做 S3-CP3 决策。
2. "开启任务图专项"至少需要 3 个维度指向任务图,且必须包含"单 agent 复杂任务失败率"或"并行任务真实数量"之一。
3. "收口"需要 0-1 个维度指向任务图,且 user 主观复杂度意愿不支持继续扩张。
4. "修订"用于 2 个以下任务图信号但仍有明确痛点的情况。

### 7.3 反向否决

任一条件成立时,不得开启任务图专项:

- S3-CP1 观察期少于 2 周,且没有明确延长记录。
- 事件账本缺少 `s3_observation_window_start` 或周度 `s3_observation_data_recorded`。
- 密封预期文件由 agent 代填,或观察后才补主观预测。
- verifier 默认模式混杂,无法判断数据来自 `legacy`、`envelope` 还是 `subagent`。
- 主要痛点来自文档恢复、PreCompact、progress 投影或成本超预算,而不是并行协作本身。

---

## 8. 决策日志

| 日期 | 决策 | 原因 | 影响 checkpoint |
|------|------|------|----------------|
| 2026-05-22 | 路线起草,锁定「不另开炉灶 / 分两阶段 + 决策门」 | 1 个月时间预算 + 动机三件事不需要同一个解 | 全部 |
| 2026-05-22 | Spike S1-CP2 完成:确认 Claude Code 原生 subagent 支持 schema 级 `tools` / `disallowedTools` 白名单,独立 context window 确认 | 官方文档原话 "denied access" + `~/.claude/agents/42plugin-skill-reviewer.md` 示例 | S1-CP2 通过 |
| 2026-05-22 | Stage 2/3 实现路径调整:subagent 限 single session,跨 session / 跨 worktree 改用 background agents;subagent 不能 spawn 子 subagent | Spike 副作用发现 | Stage 2 全部 + Stage 3 决策门 |
| 2026-05-31 | 路线图重整:插入 S1-CP2.5 调用入口 Spike;Stage 2 收窄为事件账本 MVP -> progress projection -> worktree 聚合;Stage 3 明确为决策门 | 原路线缺少 Node 脚本能否启动 subagent 的验证,且 Stage 2 写入范围过大 | S1-CP2.5, S2 全部, S3 |
| 2026-05-31 | S1-CP3/S1-CP4 完成:runner 支持 `--bare --agent verifier`,显式 artifact 输入、非标准 JSON 归一化;auto-review/auto-qa 支持 `HARNESS_VERIFIER_MODE=subagent` 分支 | smoke 验证 subagent 调用成功,并发现需兼容 `verifierResult.verdict` 输出形状 | S1-CP3, S1-CP4 |
| 2026-05-31 | S1-CP5 完成:legacy auto-review 报范围合规,independent verifier 对 `.claude/settings.local.json` 报 scope-breach;证据落盘到 `requirements/reports/REQ-2026-066-qa.md` | 形成 1 个真实 legacy 漏报 / subagent 查出的对照案例 | S1-CP5 |
| 2026-05-31 | S1-CP6 完成:Stage 1 退出确认通过;默认 legacy、显式 subagent 的成本控制策略保留;下一步进入 Stage 2 事件账本 | `npm test`、`docs:verify`、`check:governance` 通过;外部 Claude CLI 当前会话复测因数据外发审批被拒,沿用 S1-CP2.5/S1-CP5 已落盘实测证据 | S1-CP6, S2-CP1 |
| 2026-05-31 | S2-CP1 完成:新增 `scripts/event-store.mjs` 事件 schema、append API、read/validate API 和测试;S2-CP2 高频写入点接入单独处理 | 避免事件事实层与现有 progress/REQ 状态主链路同 REQ 改动,降低回归风险 | S2-CP1, S2-CP2 |
| 2026-05-31 | S2-CP2 完成:`session-start.js` 写 `session_started`;`req-cli.mjs` 写 create/start/block/complete lifecycle 事件;安装器同步分发 `event-store.mjs` | 事件账本开始积累真实治理事实,但仍不替换 `progress.txt` | S2-CP2, S2-CP3 |
| 2026-05-31 | S2-CP3 完成:创建 `REQ-2026-072-stage-2-progress-projection.md` 与设计稿,承载 progress projection 实现 | S2-CP3 只是 REQ 创建检查点;S2-CP4 的实现与验证在同一 REQ 内继续,避免重复拆分同一能力 | S2-CP3, S2-CP4 |
| 2026-05-31 | S2-CP4 完成:`event-store.mjs` 增加 progress projection;`session-start.js` 与 `req:status` 默认模式优先读取 projection,`progress.txt` 保留为缓存/回退 | `node tests/event-store.test.mjs`、`node tests/governance.test.mjs`、`npm test`、`docs:verify`、`check:governance` 通过 | S2-CP4, S2-CP5 |
| 2026-05-31 | S2-CP5/S2-CP6 完成:创建 `REQ-2026-073-stage-2-worktree-aware-event-aggregation.md`;`req:status --all` 支持 worktree projection 聚合和 conflict 报告 | `node tests/event-store.test.mjs`、`node tests/governance.test.mjs`、真实 `req:status --all` 文本/JSON 通过 | S2-CP5, S2-CP6, S2-CP7 |
| 2026-05-31 | S2-CP7 完成:Stage 2 退出确认通过;事件 append、真实写入点、progress projection、worktree 聚合均有 REQ / review / QA / experience 证据 | `npm test`、`docs:verify`、`check:governance`、`req-audit` 通过;current audit warning 为 0 | S2-CP7, S3-CP1 |
| 2026-05-31 | S1-CP2.5 Spike 完成:**结论 A — 可脚本调用**。`claude --agent <name> -p "..." --output-format json` 从 Node `child_process.spawn` 稳定调用;延迟 12–18s;需前置校验 agent 文件存在防止静默 fallback | 实测 6 组测试用例,产物记录在 REQ-066 关键决策章节 | S1-CP3 |
| 2026-06-03 | 多角度推演报告落盘,确认 S3-CP1 正式观察前必须先修 §7 事件口径、worktree 路径隔离、verifier 默认值和只读边界 | 报告列出 18 个路线图 section patches 和 8 项立即动作 | S3-CP1 |
| 2026-06-03 | user 决策:沿用原 §7 阈值;`HARNESS_VERIFIER_MODE` 默认 `envelope`;观察期按 2026-05-31 起算,1 周热身 + 1 周正式观察 | 保持 Stage 1/2 数据连续,避免为了上任务图而提前改口径 | S3-CP1, S3-CP2 |
| 2026-06-03 | user 决策:月度 verifier 成本 > 5 USD 告警并降级;§10 远期待办推迟到 S3-CP3 后再看 | 控制外部调用成本,避免远期共享库议题抢占观察期 | S3-CP1, §10 |
| 2026-06-04 | `REQ-2026-075`、`REQ-2026-076`、`REQ-2026-077` 完成前置修复:事件 schema、worktree namespace、verifier 默认值和只读边界均已落盘 | 解决观察期 CRITICAL 债务,避免 S3-CP1 采到不可解释数据 | S3-CP1 |
| 2026-06-05 | `REQ-2026-078` 启动 S3-CP1 观察期手续:应用路线图 patches、创建密封预期、写 `s3_observation_window_start` 事件 | 用户确认"1/2/3 做完才算正式进入观察期" | S3-CP1 |

---

## 9. 速查命令

```bash
# 查看路线 checkpoint
rg "^- \\[[ x]\\]" docs/plans/multi-agent-roadmap.md

# 查看当前活跃 REQ
npm run req:status

# 创建路线内新 REQ
npm run req:create -- --title "Stage 2: event ledger schema"

# 启动当前 REQ
npm run req:start -- --id REQ-2026-066

# S3-CP1 观察期:查看事件指标
node scripts/event-store.mjs stats --metrics

# S3-CP1 观察期:确认启动事件
node scripts/event-store.mjs read --json | rg "s3_observation_window_start|REQ-2026-078"

# S3-CP1 观察期:查看多 worktree 状态
npm run req:status -- --all

# 常规验证
npm test
npm run docs:verify
npm run check:governance
```

---

## 10. 远期待办（源自 unified-roadmap Phase 6）

> 以下愿景来自已完结的 `docs/plans/unified-roadmap.md` Phase 6，在 multi-agent 路线图稳定后可考虑启动。

1. 项目 A 发现的不变量模式可脱敏后发布到共享库
2. 项目 B 接入时自动获得"前人踩过的坑"的保护
3. 模式有版本控制，项目可选择性订阅

**前置条件**：Stage 2 事件账本稳定运行 + 至少 2 个项目使用 harness-lab。

**启动触发信号**:

- S3-CP3 决策选择"收口"或"修订",且 user 明确需要跨项目经验复用。
- 至少 2 个真实项目完成接入,并留下可脱敏的不变量、失败案例或治理经验。
- ROI 估算显示维护共享库节省的返工时间大于每月维护成本。

**ROI 占位**:

| 项 | 估算方式 | 当前值 |
|----|----------|--------|
| 每月节省返工时间 | 复用经验命中次数 x 单次节省小时 | (S3-CP3 后填) |
| 每月维护成本 | 分类、脱敏、验证、发布耗时 | (S3-CP3 后填) |
| 是否值得启动 | 节省时间 > 维护成本,且至少 2 项目复用 | (S3-CP3 后填) |

---

## 11. 元约定

- `docs/plans/unified-roadmap.md` 已完结（Phase 0–5 全部完成），本路线图是当前唯一的活跃路线图。
- 本路线图状态必须和事件账本、`requirements/INDEX.md`、`.claude/progress.txt` 保持一致;冲突时以事件账本重建结果为准。
- 任何 checkpoint 拆分、跳过、降级,都必须写入 §8。
- Stage 1 / Stage 2 的产物必须在没有 Stage 3 的情况下仍然有价值。
- 未通过 Stage 3 决策门前,禁止实现完整任务图。
- S3-CP1 期间禁止为了证明"该上任务图"而改写阈值、代填 sealed expectation、忽略反向否决或把 observation 事件补成事后事实。

---

## 12. 维护期退役时间表草案

如果 S3-CP3 选择收口,按下表进入维护期:

| 时间点 | 动作 | 退役条件 |
|--------|------|----------|
| S3-CP3 当日 | 冻结 multi-agent 新能力入口 | §7 聚合规则不支持任务图 |
| S3-CP3 + 1 周 | 清理观察期临时命令和临时说明 | `s3_observation_window_end` 已落账,QA 通过 |
| S3-CP3 + 2 周 | 把路线图标记为维护状态 | 无活跃 S3 专项 REQ |
| S3-CP3 + 1 月 | 复查 verifier 成本和事件账本噪声 | 月度成本 <= 5 USD,事件 schema 无新增债务 |

如果 S3-CP3 选择修订,本表延后到修订路线完成后再执行。如果 S3-CP3 选择开启任务图专项,本表只退役 S3-CP1 观察期临时物,不得删除已用于任务图设计的数据证据。
