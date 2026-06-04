# 路线图多角度推演综合报告

> 生成日期: 2026-06-03  
> 推演对象: `docs/plans/multi-agent-roadmap.md`(Stage 3 / S3-CP1 真实使用观察期)  
> 方法: 4 角度并行 + 2 对抗性验证 + 1 综合(7 agents, 393k tokens)  
> 状态: **本报告只是推演结论,未做任何代码或文件改动**

---

## 0. 执行摘要(Executive Summary)

路线图当前最紧迫的问题**不是"是否开启任务图"**,而是 Stage 3 决策门(§7 评估表)在结构上**无法被填入有效数据**:

1. 事件账本实测仅 11 行 2026-05-31 当天的 REQ lifecycle 事件(**零遥测**)
2. verifier 三入口默认值分裂使 S3-CP1 观察期实际测的是 legacy 而非新系统
3. worktree 命名空间不进入文件路径导致跨 worktree 数据混写
4. 这 3 个 **CRITICAL 债务(F1/F5/F7)** 叠加,使 §6.1"§7 评估表有真实数据"的进入条件在当前代码状态下**结构上不满足**

**今日(2026-06-03)必须做的 4 件事**:

- 在 §8 补 S3-CP1 启动行带 2026-05-31 起算日
- 开 **REQ-075** 定义 §7 6 维度口径 + 扩展 event-store schema
- 开 **REQ-076** 把 worktree 命名空间写入文件路径 + 复跑 S2-CP5/S2-CP6 退出验证
- 在 `verifier-session.mjs:61` 把默认值从 `'subagent'` 改为 `'envelope'` 与其他入口对齐

**同时建议**:user 写一份**密封"s3 预期"**作为反合理化机制,2 周后与 §7 表对比。

**收口倾向保留**:§1.1"默认终点不是任务图"应保留,但 S3-CP3 决策必须基于**事件账本可计算的数据**,而不是从这 3 个 CRITICAL 债务未修的状态下强行推进观察期。

**关键时间窗**: 今天是 2026-06-03,距离 2 周下限还有 11 天。若 REQ-075/076 在 1 周内未落地,默认把 S3-CP1 启动日顺延到 2026-06-10,§6.1 第 5 条"≥3 个 REQ"门槛不打折。

---

## 1. 4 角度 + 2 验证摘要

| 角度 | finding 数 | 关键结论 |
|------|-----------|----------|
| 角度 A: 决策门客观性 | 10 | §7 表 6 维度结构上无法填,4 个根本性缺陷 |
| 角度 B: 已完成 Stage 隐藏债务 | 10 | F1/F2/F4/F5/F6/F7/F8 等,3 个 CRITICAL |
| 角度 C: Stage 3 任务图架构 | 10 + 5 question 答案 | 5 个必答题推演 + 触发信号 |
| 角度 D: 收口与替代方向 | 11 | §8 缺启动行,§10 ROI 未知,§12 退役表缺失 |
| 乐观派验证 | 37 verdicts | 拒绝 12 个 finding(过度心理学化 / 重复路线图立场) |
| 悲观派验证 | 17 blind spots | **F1/F5/F7 全部升级到 CRITICAL**(决策门被喂入 NULL 数据) |
| 综合 | 7 patches + 8 actions + 6 open questions | 见下文 |

---

## 2. CRITICAL 债务(必须修才能进入正式观察期)

### F1 — verifier 三入口默认值分裂(CRITICAL)
- `verifier-session.mjs:61` 默认 `'subagent'`
- `auto-review.mjs:46` / `auto-qa.mjs:37` 默认 `'legacy'`
- 路线图 §4.5 自身规定"默认值应在 S1-CP5 证据充分后切到 subagent",但 verifier-session.mjs 违反
- 用户无从判断现在跑哪一档;S3-CP1 测的是错误系统

### F5 — 事件账本无 §7 遥测(CRITICAL)
- 11 行事件全是 REQ lifecycle,零条与"verifier 拦截率 / 失败率 / 调度成本"相关的遥测
- §7 6 维度物理上不可计算
- S3-CP2 必沦为估算,违反 §6.1"§7 评估表有真实数据,不是估计"

### F7 — worktree 在字段但不在文件路径(CRITICAL)
- `event-store.mjs:53-57 getEventFilePath` 只看 writerId/sessionId 忽略 worktree
- 跨 worktree 写入同一文件,事件混写
- S2-CP5/S2-CP6 退出时声称的"两个 worktree 并行写入"今日不可复现(`.claude/worktrees/` 不存在)
- **Stage 2 退出确认可能是在不可重现的状态上签字的**

---

## 3. HIGH 严重度 finding(共 10 个,详见原文)

1. §7 评估表 6 维度结构不可达
2. "≥3 个并行 REQ" 阈值在治理协议下永远不可达
3. 6 维度耦合 + 无聚合规则 + 无反向否决
4. 缺少"反向信号"(何时开启会失败)
5. "修订"选项无前置触发条件
6. F2 verifier 只读边界无绕过测试
7. F4 normalizeFindings 失真 / CLI_TIMEOUT 120s + stderr 无界
8. F6 progress.txt 降级为缓存无 on-write 重建
9. F8 事件 payload 无 schema 约束 / 无 migration
10. F10 §10 远期待办工作量被低估

---

## 4. 路线图 section patches(18 个改动)

| 章节 | 操作 | 关键改动 |
|------|------|---------|
| 顶部 | add | TL;DR 框(5 分钟可读性) |
| §0 | modify | 加第 6 步: PreCompact 压缩恢复 |
| §1.4 | modify | 加 Stage 1+2 收口后"主真相源"声明 |
| §3 | modify | S3-CP1 改 `[⏳]`,加启动/到期日字段 |
| §4.5 | modify | 三入口默认值契约 + 统一 `verifier-mode.mjs` |
| §4.7 | modify | 加 verifier 不可用降级协议 + 成本超预算告警 |
| §5.2 | modify | 单 writer 描述补 worktree 路径段 |
| §5.4 | modify | 主真相源显式声明 + progress.txt 头部 `cache_version` 字段 |
| §5.5 | modify | 路径含 worktree-hash + session 隔离修复 |
| §6.1 | modify | 加 2 条进入条件(REQ 频次下限 + REQ-075/076 前置) |
| §6.2 | modify | 修订分支具体化 + 前置可用性声明 |
| §7 | modify | 完全重写为可执行评估(7 维度 + 聚合规则 + 反向否决) |
| §8 | modify | 补 5 行 2026-06-03 决策(启动行 / 模式对齐 / 主真相源 / PreCompact / 密封预期) |
| §9 | modify | 加 3 行 S3-CP1 观察期辅助命令 |
| §10 | modify | 加启动触发信号 + ROI 估算占位 |
| §11 | modify | 加第 6 条(防预决策污染) + 对齐主真相源 |
| 新 §12 | add | 维护期退役时间表草案 |
| TL;DR | add | 顶部状态摘要 |

---

## 5. 立即动作(8 项)

| # | 动作 | 目标 | 类型 |
|---|------|------|------|
| 1 | 创建 REQ-2026-075 「Stage 3 §7 评估表口径定义 + 事件 schema 扩展」(9 个新 type) | requirements/in-progress/ | req-create |
| 2 | 创建 REQ-2026-076 「事件文件路径按 worktree 命名空间隔离 + S2-CP5/S2-CP6 退出确认重新验证」 | requirements/in-progress/ | req-create |
| 3 | 创建 REQ-2026-077 「verifier subagent 只读边界端到端绕过测试 + 行为回归基线」 | requirements/in-progress/ | req-create |
| 4 | 修改 `multi-agent-roadmap.md`,应用 18 个 section patches | docs/plans/ | file-edit |
| 5 | 修改 `session-start.js`: 启动时读事件流 max(ts) 回写 progress.txt + 校验 HARNESS_SESSION_ID | scripts/ | file-edit |
| 6 | 修改 `verifier-session.mjs:61` 默认值 `'subagent'` → `'envelope'` | scripts/ | file-edit |
| 7 | 创建 S3-CP1 密封预期文件(让 user 当场写) | requirements/observations/ | file-create |
| 8 | 写第一条 `s3_observation_window_start` 事件 | .claude/events/ | section8-log |

---

## 6. 观察期机制(observationInstrumentation)

### 6.1 每日
- session-start 自动写 session_started(payload 含 date / user_availability / reqs_completed_yesterday)
- 人工写 1 行"今天发生了什么"到 `S3-CP1-daily-digest.md`(人类摘要,不充当主真相源)
- session-main.jsonl > 1000 行时 ⚠️ 提醒

### 6.2 每周一
- 跑 `node scripts/event-store.mjs stats --metrics`,输出 6 维度原始计数
- 写一条 `s3_observation_data_recorded` 事件
- 对 sealed expectation 与 weekly 实际做 1 段对比

### 6.3 6 维数据源(待 REQ-075 落地)

| 维度 | 事件 type |
|------|----------|
| 失败率 | `verifier_failed` / `req_completed` |
| 拦截率 | `verifier_blocked` / `verifier_passed` |
| 并行 REQ | `req_started` / `req_completed` 时间窗口重叠 |
| 冲突次数 | `conflict_detected` |
| 调度成本 | `human_decision_made` 时间间隔 |
| 痛点清单 | user 主动提及 / `s3_observation_paused` |

### 6.4 落点
- 主入口: `requirements/observations/S3-CP1-observation-log.md`
- 人类摘要: `S3-CP1-daily-digest.md`
- 周指标: `S3-CP1-weekly-metrics.md`
- 密封预期: `S3-CP1-sealed-expectation-2026-06-03.md`
- 事件账本: `.claude/events/session-main.jsonl`(REQ-076 落地后按 worktree-hash 分目录)

---

## 7. 6 个开放问题(需要 user 决策)

### Q1. §7 评估表阈值是否调整?
- (a) 沿用路线图原值(>30% 失败率、≥3 并行、<20% 拦截率、>20min 调度),只补 REQ-075 口径
- (b) 调整阈值(更保守: >50% 失败率 / <10% 拦截率)
- (c) 改为相对值(对比 Stage 1+2 收口前基线)

### Q2. HARNESS_VERIFIER_MODE 全局默认值
- (a) 全部 legacy(Stage 1 价值主张被废)
- (b) 全部 envelope(只生成 verifier 包,不真跑,最平衡)
- (c) 全部 subagent(路线图原意图,需先通过 REQ-077 绕过测试)

### Q3. §10 远期待办激活条件
- (a) 严格原条件(Stage 2 稳定 + 2 项目)
- (b) 加"§7 痛点清单 ≥1 条与模式脱敏匹配"
- (c) 推迟到 S3-CP3 之后再看

### Q4. 2 周观察期起算日
- (a) 2026-05-31(S2-CP7 退出当日,补登记;1 周热身 + 1 周正式观察)
- (b) 2026-06-03(今天,正式启动;3 天丢弃)

### Q5. verifier 成本预算
- (a) 不设,继续按需
- (b) 月度 > $5 告警 + legacy 降级
- (c) 月度 > $10 告警

### Q6. Stage 2 退出确认是否重新验证?
- (a) 重新验证(临时 worktree 复跑,严格)
- (b) 接受当前 REQ-074 报告,在 §8 注明"复现性待补"
- (c) 视为 Stage 2 退出未完成,S3-CP1 不启动

---

## 8. 综合采纳/拒绝明细

- **confirmed findings**: 18 条 high+ 升级版
- **rejected findings**: 12 条(乐观派验证拒绝的过度心理学化 / 重复路线图立场)
- **pessimist additions**: 12 条盲点补充,其中 F1/F5/F7 升 CRITICAL

---

## 9. 关键时间窗

| 日期 | 事件 |
|------|------|
| 2026-05-31 | S2-CP7 退出(Stage 2 收口) |
| 2026-06-03 | **今日** — 推演综合报告落盘 |
| 2026-06-10 | 若 REQ-075/076 未落地,S3-CP1 启动日顺延到此 |
| 2026-06-14 | 路线图原 2 周到期日 |
| 2026-06-17 | 若起算日改为今日,实际到期日 |

---

## 10. 附:被乐观派拒绝但有保留价值的 finding

- "≥3 个并行 REQ 永远不可达" → **采纳**:应重定义为"worktree 事件"
- "评估表缺反向信号" → **采纳**:已并入 confirmed finding
- "§11 禁令在心理层面施加举证义务" → **部分采纳**:密封预期机制
- 任务图架构 5 问 10 推演 → **拒绝实施**:保留为 S3-CP3 决策包附录(不预决策污染)

---

**报告结束。下一步:等 user 决策 6 个开放问题,然后再决定是否落地 8 个立即动作。**
