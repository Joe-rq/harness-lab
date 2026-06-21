# REQ-2026-083: S3-CP1 exit confirmation and weekly data record

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
S3-CP1 观察期按 `docs/plans/multi-agent-roadmap.md` §3 定义：起算 2026-05-31，热身至 2026-06-07，正式观察至 2026-06-14。启动手续由 REQ-2026-078 完成（路线图 patches、sealed expectation 框架、`s3_observation_window_start` 事件）。

当前日期 2026-06-21，正式观察期已到期 7 天，但收口手续未完成，存在两处违反观察期协议的事实：

1. **周度数据缺失**：`node scripts/event-store.mjs stats --metrics` 显示 `s3_observation_data_recorded = 0`。推演报告 §6.2 要求"每周一记一条 `s3_observation_data_recorded` 事件 + 与 sealed 做对比段"。缺失直接命中 §7.3 反向否决第 2 条（"事件账本缺少...周度 `s3_observation_data_recorded`"），导致无法进入 S3-CP3 决策。
2. **sealed expectation 未填**：`requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md` 的 6 个主观问题仍为"（user 填写）"。user 选择不填，且观察期已结束、客观数据已暴露给 user，密封性实质已破坏。

本 REQ 的核心原则是**诚实补观察期**（user 在本会话决策的方向 A1）：

- 周度数据补记**只对已真实落盘的治理事件做如实回填/汇总**，`ts` 标注为补记真实时刻，`payload.week_number` 指代真实周次。绝不伪造历史时间戳、绝不编造未发生的事件（§11 禁止"把 observation 事件补成事后事实"）。
- sealed expectation 主观区**agent 一字不代填**（§7.3 + 文件使用规则双禁），按 user 决策 c 处理：在文件内声明"user 未填 + 密封已破"，降级为观察期协议缺陷记录。

本 REQ 只收口 S3-CP1。§7 评估表填写（S3-CP2）拆分到 REQ-B 独立处理，S3-CP3 决策不在本 REQ 范围。

## 目标
- 补记 W23/W24/W25 三条 `s3_observation_data_recorded` 事件，`payload.metrics` 基于 `event-store read` 真实统计，口径与 `stats --metrics` 一致。
- `S3-CP1-sealed-expectation-2026-06-03.md` 追加"user 未填写 + 密封已破"声明段，6 个主观问题正文不被 agent 修改。
- `multi-agent-roadmap.md` §3 勾选 S3-CP1、§8 新增 2026-06-21 决策日志行、顶部"当前阶段"推进到 S3-CP2。
- 落 S3-CP1 退出确认报告（含验证证据）与 experience 文档。

## 非目标
- 不填写 §7 决策评估表（属 S3-CP2 / REQ-B）。
- 不改 `scripts/event-store.mjs` schema；只通过 append API 追加事件。
- 不代填 sealed expectation 的任何主观预测内容。
- 不做 S3-CP3 决策（收口 / 修订 / 开启任务图）。
- 不实现完整任务图、fixer 派生或 agent runtime。

## 颗粒度自检
- [x] 目标数 ≤ 4？是（4 个）。
- [ ] 涉及文件数 ≤ 4？否；事件账本、路线图、sealed、报告、experience、progress/INDEX 同属 S3-CP1 收口手续，参照 REQ-078 的同类豁免理由。
- [x] 涉及模块/目录 ≤ 4？是（`events/`、`docs/plans/`、`requirements/observations|reports/`、`context/experience/`）。
- [x] 能否用一句话描述"解决了什么问题"？把 S3-CP1 从"观察期到期但未收口、周度数据缺失、sealed 未填"推进为"周度客观数据已诚实补记、退出确认通过、可进入 S3-CP2 §7 填表"。
- [x] 如果失败，能否干净回滚？能（删除补记事件、回退路线图勾选、移除 sealed 声明段）。

## 范围
- 涉及文件：
  - `.claude/worktrees/main/events/session-main.jsonl`（append 3 条 `s3_observation_data_recorded`）
  - `docs/plans/multi-agent-roadmap.md`（§3 勾选、§8 决策日志、顶部当前阶段）
  - `requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`（追加声明段）
  - `requirements/reports/REQ-2026-083-*.md`（退出确认 / QA）
  - `requirements/in-progress/REQ-2026-083-*.md`（本 REQ 自身：复选框 / 状态 / 范围声明）
  - `context/experience/REQ-2026-083-*.md`
  - `.claude/progress.txt`、`requirements/INDEX.md`
- 涉及目录 / 模块：`.claude/worktrees/`、`docs/plans/`、`requirements/observations/`、`requirements/reports/`、`context/experience/`
- 影响接口 / 页面 / 脚本：路线图恢复入口、`event-store` 读端、`req:status`

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：上述范围内事件账本（仅 append）、路线图、sealed 声明段、REQ 交付物。
- 可新增的测试 / 脚本：不新增脚本；验证复用 `docs:verify`、`check:governance`、`event-store stats/read`、`req:audit`。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/verifier-session.mjs`、`scripts/auto-review.mjs`、`scripts/auto-qa.mjs`；sealed expectation 的 6 个主观问题正文。
- 不可引入的依赖 / 操作：不得新增 npm dependency；不得伪造历史时间戳或编造未发生事件；不得实现任务图或自动 fixer。

**边界条件**：
- 时间 / 环境 / 数据约束：当前日期 2026-06-21；观察期窗口 2026-05-31 ~ 2026-06-14（正式），补记涵盖 W23/W24/W25 已落盘事件。
- 改动规模或发布边界：只做 S3-CP1 收口手续，不发布版本。

## 验收标准
- [x] AC-1：事件账本存在 ≥3 条 `s3_observation_data_recorded`，`payload` 含 `week_number` 与 `metrics`，`metrics` 与 `event-store read` 真实统计一致（可被 `stats --metrics` 复核）。
- [x] AC-2：`S3-CP1-sealed-expectation-2026-06-03.md` 含"user 未填写 + 密封已破"声明段并注明日期；6 个主观问题正文与原文件一致（未被 agent 改动）。
- [x] AC-3：`multi-agent-roadmap.md` §3 S3-CP1 已勾选，§8 有 2026-06-21 决策日志行，顶部"当前阶段"为 S3-CP2。
- [x] AC-4：`requirements/reports/REQ-2026-083-*.md` 退出确认报告落盘，含验证证据（实际命令与输出摘要）。
- [x] AC-5：`npm test`、`npm run docs:verify`、`npm run check:governance`、`req:audit --id REQ-2026-083` 通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-083-design.md`
- 相关规范：`docs/plans/multi-agent-roadmap.md`（§3 / §6.2 / §7.3 / §8 / §11）；`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md`（§6.2 周度协议）；`requirements/completed/REQ-2026-078-s3-cp1-observation-kickoff.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-083-code-review.md`
- QA：`requirements/reports/REQ-2026-083-qa.md`
- Ship：`requirements/reports/REQ-2026-083-ship.md`（手续性 REQ，不发布版本，不适用）

## 验证计划
- 计划执行的命令：
  - `node scripts/event-store.mjs read --json`（核对补记事件与真实统计）
  - `node scripts/event-store.mjs stats --metrics`（复核指标口径）
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/req-audit.mjs --id REQ-2026-083 --verbose`
- 需要的环境：本仓库本地 Node.js；无需网络。
- 需要的人工验证：sealed expectation 主观区由 user 后续自行补填（本 REQ 不代填）；如 user 选择补填，agent 仅逐字记录并标注"观察后填写"。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现
- [x] 旧功能保护
- [x] 逻辑正确性
- [x] 完整性
- [x] 可维护性

#### 对齐检查（record 阶段）
- [x] 目标对齐
- [x] 设计对齐
- [x] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- 无

> 周度数据补记为一次性诚实回填，非临时实现；诚实性约束见"关键决策"与设计稿 §2。

## 风险与回滚
- 风险 1：补记事件若伪造历史 `ts`，违反 §11"把 observation 事件补成事后事实"。
  - 缓解：`ts` 用补记真实时刻；`payload.week_number` 指真实周；`metrics` 只来自已落盘事件统计。
- 风险 2：sealed 处理误改主观问题正文，破坏反合理化机制。
  - 缓解：用 Edit 仅在"补充说明"区追加声明段，不触碰 6 个主观问题正文。
- 风险 3：周度 `metrics` 口径与 `stats --metrics` 不一致，导致 §7 填表时数据不可信。
  - 缓解：补记前先固化 `read --json` 真实统计，补记后用 `stats --metrics` 复核。
- 回滚方式：删除补记的 3 条事件、回退路线图 §3 勾选与 §8 日志、移除 sealed 声明段、删除报告。

## 关键决策
- 2026-06-21：由 `req:create` 自动生成骨架。
- 2026-06-21：user 决策方向 A1（诚实补观察期，不造假、不为凑维度改口径）；sealed expectation 选 c（记录未填 + 密封已破，agent 不代填）。
- 2026-06-21：按 4 实体规则拆分 REQ-A（本 REQ，S3-CP1 收口）/ REQ-B（S3-CP2 §7 填表）。

<!-- Source file: REQ-2026-083-s3-cp1-exit-confirmation-and-weekly-data-record.md -->
