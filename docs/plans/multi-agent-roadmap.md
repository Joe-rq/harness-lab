# harness-lab 多 Agent 拓展路线图

> 起草日期: 2026-05-22
> 当前阶段: **Stage 1 未开始**
> 最近更新: 2026-05-22(初次起草)

---

## 0. 中断恢复指南(每次会话先看这一节)

打开这份文档时,按顺序回答:

1. **看 §3 进度表** — 找到第一个未勾选的 checkpoint,那就是接下来要做的事
2. **看对应 Stage 的「退出标准」** — 确认上一个 checkpoint 真的完成
3. **看 §6 决策日志** — 检查路线本身有没有被中途修订过
4. **看 `requirements/INDEX.md`** — 找到与该 checkpoint 对应的活跃 REQ;没有就先开 REQ
5. **如果一周以上没碰过这个项目** — 先重读 §1 决策摘要,确认动机和约束没变

> ⚠️ 不要在不读 §6 的情况下「凭印象」恢复 —— 路线图允许修订,但要求修订必须留痕

---

## 1. 决策摘要

### 核心命题

把 harness-lab 从「单 agent 治理」拓展到「多 agent 协作」,但**不另开炉灶**,而是**两步演进 + 一道决策门**。

### 为什么不另开炉灶

- 1 个月内的时间预算放不下从零重建 65 个 REQ 等价基建
- 第一步、第二步的产出**单独就有价值**,不依赖第三步存在
- wow-harness v3 自己也是 v1→v2→v3 演进出来的,跳跃式做没有先例

### 为什么不一口气做完整任务图

- wow-harness v3 完整形态是 21 模块 / 6 轮迭代,工程量超 1 个月数量级
- 「单 agent 推不动」的痛点 75% 是 runtime 层(prompt/工具/上下文),不是多 agent 能解的
- 「想并行」不需要任务图,事件流 + 多 session 就够
- 「review 太弱」只需要独立 verifier,不需要 spawn 回路

### 不会做的事(明确放弃,避免诱惑)

- ❌ 概念节点 supersede 链(性价比高但月度预算放不下)
- ❌ Hash 验证 / deterministic replay(学术完整性,工程冗余)
- ❌ 改动现有 invariants 结构
- ❌ 把 wow-harness v3 完整搬过来

---

## 2. 路线总览

```
Stage 1 (≈2 周)         Stage 2 (≈2 周)         Stage 3 决策门
独立 verifier session  →  事件流 + 多 progress  →  是否启动任务图?
解动机 ③(review 弱)      解动机 ②(并行)         评估 ①② 是否还痛
                                                  痛 → 另开炉灶
                                                  不痛 → 路线完结
```

每个 Stage 独立可用,中途停下来,前一个 Stage 的产出**仍然有价值**。

---

## 3. 当前进度表

> 维护协议:任务真正完成(REQ 合并 + 报告落盘)后,把 `[ ]` 改成 `[x]`,并在 §6 决策日志加一行

### Stage 1: 独立 Verifier Session

- [x] **S1-CP1** — REQ 创建:REQ-2026-066(`requirements/in-progress/REQ-2026-066-stage-1-verifier-session-schema.md`)
- [x] **S1-CP2** — Spike 验证:Claude Code 原生 subagent 支持 schema 级工具白名单(`tools` / `disallowedTools` 字段),独立 context window 确认。证据:官方文档 + `~/.claude/agents/42plugin-skill-reviewer.md` 现成示例
- [ ] **S1-CP3** — 实现:`scripts/verifier-session.mjs`,只暴露 Read/Grep,通过文件通信(无 in-session 上下文共享)
- [ ] **S1-CP4** — 集成:把 `auto-review.mjs` / `auto-qa.mjs` 切换到独立 session 模式,旧逻辑保留为 fallback
- [ ] **S1-CP5** — 报告:`requirements/reports/REQ-???-qa.md`,验证「同一缺陷在旧模式漏报 / 新模式查出」至少 1 例真实案例
- [ ] **S1-CP6** — Stage 1 退出确认(见 §4.4)

### Stage 2: 事件流 + 多 Progress

- [ ] **S2-CP1** — REQ 创建:「事件流写入 API + schema」
- [ ] **S2-CP2** — 设计稿:`.claude/events/*.jsonl` 格式、事件类型枚举、append-only 写入函数
- [ ] **S2-CP3** — 实现:事件写入 API,所有现有 hook(session-start / req-check / watchdog 等)改为同时写入事件流
- [ ] **S2-CP4** — REQ 创建:「progress.txt 改为 projection」
- [ ] **S2-CP5** — 实现:`progress.txt` 由事件流投影生成,旧文件降级为缓存
- [ ] **S2-CP6** — REQ 创建:「worktree-aware 事件流聚合」
- [ ] **S2-CP7** — 实现:每个 worktree 维护独立事件流,主仓提供聚合查询
- [ ] **S2-CP8** — Stage 2 退出确认(见 §5.4)

### Stage 3: 决策门(不是工程任务)

- [ ] **S3-CP1** — 跑 Stage 1+2 至少 2 周真实使用
- [ ] **S3-CP2** — 评估动机 ①(单 agent 推不动)是否仍痛 —— §5.5 评估表
- [ ] **S3-CP3** — 决策:开启完整任务图项目 / 关闭路线 / 修订路线 —— 任一选择都要在 §6 记录

---

## 4. Stage 1 详细规划

### 4.1 目标

让 verifier(auto-review / auto-qa)运行在**与 worker 完全独立的 session**,并且**工具白名单 schema 级硬限制**(只 Read/Grep,无 Edit/Write/Bash)。

### 4.2 解决什么痛点

动机 ③:auto-review/auto-qa 经常「诚恳地告诉你没问题」,因为它们看到的是被 worker 污染过的上下文。独立 session = 真正的交叉验证。

### 4.3 REQ 切分建议

**单个 REQ** 即可,4 实体内:
- 新建文件: `scripts/verifier-session.mjs`
- 修改文件: `scripts/auto-review.mjs`、`scripts/auto-qa.mjs`
- 配置变更: 可能调整 `.claude/settings.json` hook 配置
- 文档: `docs/plans/REQ-???-design.md`

颗粒度自检对照(CLAUDE.md §检查 2):
- 目标数 ≤4 ✓(只做「独立 session 启动 + 工具白名单 + 通信契约 + 兼容旧模式」)
- 涉及文件数 ≤4 ✓
- 一句话描述 ✓:「让 verifier 在独立 session 跑,且无写权限」
- 失败回滚 ✓:保留旧 verifier 逻辑作为 fallback

### 4.4 退出标准(必须全部满足)

1. 至少 1 个真实案例:同一份代码在旧 verifier 通过、新 verifier 发现问题
2. 新 verifier 的工具白名单**经过实测无法绕过**(尝试让它写文件,被 schema 拒绝)
3. 旧 fallback 路径**仍然可用**(开关切回旧模式,自动化测试全绿)
4. QA 报告含「验证证据」章节,记录上述案例和绕过测试

### 4.5 已识别风险

| 风险 | 触发条件 | 应对 |
|------|---------|------|
| ~~Claude Code Agent SDK 不支持 schema 级工具白名单~~ | ~~Spike S1-CP2 失败~~ | ✅ S1-CP2 已确认支持,本条作废(2026-05-22) |
| 独立 session 启动延迟 > 30s | 实测 latency 不可接受 | 改为「同步 session 但隔离工具上下文」的折中方案 |
| 文件通信契约设计走偏 | 信息密度过高导致 reviewer 上下文污染 | 用 JSON envelope + 字段白名单,只传 artifact 路径不传内容 |
| Subagent 不能 spawn 子 subagent | 试图在 verifier 内启动 fixer | Stage 1 不允许 verifier 二次派生;修复仍走主 session |

---

## 5. Stage 2 详细规划

### 5.1 目标

把 `.claude/progress.txt` 从「主真相源」降级为「事件流的投影」,以解锁多 session/多 worktree 并行写入。

> ⚠️ **实现路径调整(2026-05-22 Spike 后)**:Claude Code subagent 限于 single session 内,不支持跨 session/跨 worktree 的并发写入。Stage 2 起的并发场景必须改用 **background agents**(`/en/agent-view`)而非 subagent。Stage 1 内的 verifier 仍可用 subagent。

### 5.2 解决什么痛点

动机 ②:当前 `progress.txt` 是单文件状态,两个 agent 同时跑必然冲突。事件流 append-only 天然序列化并发。

### 5.3 REQ 切分建议

**拆 3 个 REQ**,每个 4 实体内,有依赖:

| REQ | 涉及 | 依赖 |
|-----|-----|------|
| B1: 事件写入 API + schema | `scripts/event-store.mjs`(新) + schema 文档 + hook 调用接入(1-2 个高频 hook 先接) + 测试 | 无 |
| B2: progress.txt projection | `scripts/event-store.mjs` 加 projector + `session-start.js` 改读路径 + `req-cli.mjs status` 改读路径 | B1 |
| B3: worktree 聚合 | `worktree-utils.mjs` 加多目录读取 + `req:status --all` 改实现 + 测试 | B2 |

### 5.4 退出标准

1. 2 个 worktree 同时写事件,无数据丢失
2. `progress.txt` 即使被外部删除,也能从事件流完整重建
3. 所有现有 hook 与 CLI 命令通过既有 `npm test`、不需要改测试代码
4. 性能基线:事件写入 < 50ms / 次

### 5.5 Stage 3 决策评估表(进入决策门前填写)

| 维度 | 现状 | 阈值 | 结论 |
|------|------|------|------|
| 单 agent 复杂任务失败率 | (待填) | > 30% 才考虑任务图 | (待填) |
| 并行任务真实数量 | (待填) | ≥ 3 个 REQ 同时活跃才需要任务图 | (待填) |
| 独立 verifier 拦截率 | (待填) | < 20% 说明 verifier 弱不是主因 | (待填) |
| 我是否真的还想做 | (待填) | 主观但必须诚实 | (待填) |

---

## 6. 决策日志

> 任何修订路线、跳过 checkpoint、推迟阶段的决定,都在这里加一行

| 日期 | 决策 | 原因 | 影响 checkpoint |
|------|------|------|----------------|
| 2026-05-22 | 路线起草,锁定「不另开炉灶 / 分两阶段 + 决策门」 | 1 个月时间预算 + 动机三件事不需要同一个解 | 全部 |
| 2026-05-22 | Spike S1-CP2 完成:确认 Claude Code 原生 subagent 支持 schema 级 `tools`/`disallowedTools` 白名单,独立 context window 确认 | 官方文档原话 "denied access" + `~/.claude/agents/42plugin-skill-reviewer.md` 现成示例 | S1-CP2 ✅ 通过;§4.5 风险表首项作废 |
| 2026-05-22 | Stage 2/3 实现路径调整:subagent 限 single session,跨 session/跨 worktree 改用 background agents;subagent 不能 spawn 子 subagent,Stage 3 完整任务图也需要 background agents 或 agent teams | Spike 副作用发现 | Stage 2 全部 + Stage 3 决策门评估 |

---

## 7. 速查:每个 checkpoint 对应的命令

```bash
# 查路线进度
cat docs/plans/multi-agent-roadmap.md | grep -E "^- \[[ x]\]"

# 创建路线内的 REQ(指定阶段标签)
npm run req:create -- --title "Stage 1: 独立 verifier session"
# 然后手动在 REQ 的「相关链接」加 docs/plans/multi-agent-roadmap.md#S1-CP1

# 回到中断点
cat .claude/progress.txt
cat requirements/INDEX.md
```

---

## 8. 这份文档的元约定

- **状态字段**(文档顶部「当前阶段」)在每次 Stage 完整结束时更新一次
- **进度表**(§3)在每个 checkpoint 完成时勾选
- **决策日志**(§6)任何路线偏离都要记录,**不允许静默修改正文**
- **退出标准**(§4.4、§5.4)未达成不得开始下一个 Stage
- 这份文档**不是 REQ**,但 Stage 内每个工程项都必须有对应 REQ
