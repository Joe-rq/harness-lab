# harness-lab 多 Agent 拓展路线图

> 起草日期: 2026-05-22  
> 重整日期: 2026-05-31  
> 当前阶段: **Stage 1 / S1-CP2.5 调用入口 Spike**  
> 当前 REQ: `REQ-2026-066-stage-1-verifier-session-schema.md`

---

## 0. 中断恢复指南

每次恢复本路线时,按下面顺序读:

1. 看 `requirements/INDEX.md` 和 `.claude/progress.txt`,确认当前活跃 REQ。
2. 看本文件 §3,找到第一个未完成 checkpoint。
3. 看该 checkpoint 的产物和退出标准,不要凭印象继续。
4. 看 §8 决策日志,确认路线是否被修订。
5. 如果 checkpoint 涉及代码变更,先确认已有 REQ 已 `req:start`;没有则先创建 REQ。

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
| Stage 3 | 用真实使用数据决定是否需要完整任务图,而不是按想象开工 |

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
  S3-CP1   真实使用观察期
  S3-CP2   数据填表
  S3-CP3   决策:收口 / 修订 / 开启任务图专项
```

核心依赖:

- Stage 1 不依赖 Stage 2。
- Stage 2 不依赖完整任务图。
- Stage 3 只能在 Stage 1 + Stage 2 真实运行至少 2 周后进入。

---

## 3. 当前进度表

维护协议:

- checkpoint 只有在对应 REQ 完成、报告落盘、验证通过后才勾选。
- 如果只是完成 spike 或文档修订,也必须在 §8 决策日志补记录。
- 顶部当前阶段必须和本表第一个未完成 checkpoint 一致。

### Stage 1: Independent Verifier

- [x] **S1-CP1** — REQ 创建: `REQ-2026-066-stage-1-verifier-session-schema.md`
- [x] **S1-CP2** — 能力 Spike:确认 Claude Code subagent 支持 schema 级 `tools` / `disallowedTools` 白名单,并有独立 context window
- [ ] **S1-CP2.5** — 调用入口 Spike:确认本仓 Node 脚本能否稳定启动 verifier subagent 并拿回结构化输出
- [ ] **S1-CP3** — 实现 verifier envelope + runner: `scripts/verifier-session.mjs`
- [ ] **S1-CP4** — 集成 `auto-review.mjs` / `auto-qa.mjs`,并保留 legacy fallback
- [ ] **S1-CP5** — QA 证据:至少 1 个旧 verifier 漏报、新 verifier 查出的对照案例
- [ ] **S1-CP6** — Stage 1 退出确认

### Stage 2: Event Ledger + Progress Projection

- [ ] **S2-CP1** — REQ 创建:事件 schema + append API
- [ ] **S2-CP2** — 实现事件账本 MVP,接入 1-2 个高频写入点
- [ ] **S2-CP3** — REQ 创建: `progress.txt` projection
- [ ] **S2-CP4** — 实现 progress 投影与重建,旧 `progress.txt` 降级为缓存
- [ ] **S2-CP5** — REQ 创建:worktree-aware 事件聚合
- [ ] **S2-CP6** — 实现多 worktree 事件聚合查询
- [ ] **S2-CP7** — Stage 2 退出确认

### Stage 3: Task Graph Decision Gate

- [ ] **S3-CP1** — Stage 1 + Stage 2 真实使用至少 2 周
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

推荐模式:

```text
HARNESS_VERIFIER_MODE=legacy   -> 当前逻辑
HARNESS_VERIFIER_MODE=envelope -> 只生成 verifier 包
HARNESS_VERIFIER_MODE=subagent -> 调用 verifier subagent
```

默认值只在 S1-CP5 证据充分后切到 `subagent`;在此之前默认应保持 `legacy` 或 `envelope`。

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
| 启动延迟 > 30s | 记录为已知限制,不静默 fallback |

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
.claude/events/
  session-<id>.jsonl
  worktree-<hash>.jsonl
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
- `progress.txt` 作为缓存输出,不再是主真相源。

退出标准:

- 删除 `progress.txt` 后可从事件流重建。
- `requirements/INDEX.md`、projection、progress 缓存不冲突。
- 当前活跃 REQ、阶段、最近摘要可正确展示。

### 5.5 S2-CP5 / S2-CP6: worktree-aware aggregation

REQ 范围建议:

- 复用 `worktree-utils.mjs`。
- 每个 worktree 维护自己的事件文件。
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
- §7 评估表有真实数据,不是估计。

### 6.2 可选决策

| 决策 | 触发条件 | 后续 |
|------|----------|------|
| 收口 | 独立 verifier + 事件账本已经解决主要痛点 | 关闭 multi-agent 路线,转入维护 |
| 修订 | 仍痛,但痛点不是任务图 | 开新路线,例如 Context Capsule / InfoNeed |
| 开启任务图专项 | 单 agent 推不动和并行协作仍是主要瓶颈 | 另建 REQ 组,先写架构设计 |

### 6.3 若开启任务图,必须先回答

1. 谁负责创建任务节点。
2. 节点状态如何进入事件账本。
3. worker / verifier / fixer 的权限如何隔离。
4. 失败重试和人工升级如何记录。
5. 如何保证它仍是治理层,不是业务 runtime。

---

## 7. Stage 3 决策评估表

进入 Stage 3 前填写:

| 维度 | 当前数据 | 阈值 | 结论 |
|------|----------|------|------|
| 单 agent 复杂任务失败率 | (待填) | > 30% 才考虑任务图 | (待填) |
| 并行任务真实数量 | (待填) | >= 3 个 REQ 同时活跃才考虑任务图 | (待填) |
| 独立 verifier 拦截率 | (待填) | < 20% 说明 verifier 弱不是主因 | (待填) |
| progress 冲突次数 | (待填) | Stage 2 后仍频繁冲突才考虑更强协调 | (待填) |
| 人工调度成本 | (待填) | 每个 REQ > 20 分钟才考虑自动任务图 | (待填) |
| 是否仍想承担复杂度 | (待填) | 主观但必须诚实 | (待填) |

---

## 8. 决策日志

| 日期 | 决策 | 原因 | 影响 checkpoint |
|------|------|------|----------------|
| 2026-05-22 | 路线起草,锁定「不另开炉灶 / 分两阶段 + 决策门」 | 1 个月时间预算 + 动机三件事不需要同一个解 | 全部 |
| 2026-05-22 | Spike S1-CP2 完成:确认 Claude Code 原生 subagent 支持 schema 级 `tools` / `disallowedTools` 白名单,独立 context window 确认 | 官方文档原话 "denied access" + `~/.claude/agents/42plugin-skill-reviewer.md` 示例 | S1-CP2 通过 |
| 2026-05-22 | Stage 2/3 实现路径调整:subagent 限 single session,跨 session / 跨 worktree 改用 background agents;subagent 不能 spawn 子 subagent | Spike 副作用发现 | Stage 2 全部 + Stage 3 决策门 |
| 2026-05-31 | 路线图重整:插入 S1-CP2.5 调用入口 Spike;Stage 2 收窄为事件账本 MVP -> progress projection -> worktree 聚合;Stage 3 明确为决策门 | 原路线缺少 Node 脚本能否启动 subagent 的验证,且 Stage 2 写入范围过大 | S1-CP2.5, S2 全部, S3 |

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

---

## 11. 元约定

- `docs/plans/unified-roadmap.md` 已完结（Phase 0–5 全部完成），本路线图是当前唯一的活跃路线图。
- 本路线图状态必须和 `requirements/INDEX.md`、`.claude/progress.txt` 保持一致。
- 任何 checkpoint 拆分、跳过、降级,都必须写入 §8。
- Stage 1 / Stage 2 的产物必须在没有 Stage 3 的情况下仍然有价值。
- 未通过 Stage 3 决策门前,禁止实现完整任务图。
