# REQ-2026-078: S3-CP1 observation window kickoff

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
REQ-2026-075/076/077 已修复 S3-CP1 观察期前的关键债务:§7 指标口径、worktree 事件路径隔离、verifier 三入口默认值和只读边界。用户确认"1/2/3 做完才算正式进入观察期",这里的 1/2/3 指:

1. 将 `requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` 中的 18 个路线图 section patches 应用到 `docs/plans/multi-agent-roadmap.md`。
2. 创建 S3-CP1 sealed expectation 文件,让 user 后续填写正式观察前预期。
3. 写入第一条 `s3_observation_window_start` 事件,把观察期从"设备已调好"推进到"开始记录数据"。

## 目标
- 更新路线图,把 S3-CP1 当前状态、进入条件、评估表、决策日志、命令和维护期退役表补齐。
- 创建 `requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`,只提供填写框架,不代替 user 写主观预期。
- 写入 `s3_observation_window_start` 事件,记录观察期正式启动。
- 补齐 review / QA / experience,确认不触碰任务图实现。

## 非目标
- 不实现完整任务图、fixer 派生或 agent runtime。
- 不改 `scripts/event-store.mjs` schema;REQ-075 已支持 `s3_observation_window_start`。
- 不替 user 填写 sealed expectation 的主观预测内容。
- 不重写已完成的 REQ-075/076/077。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？否;路线图、sealed expectation、事件账本、报告和经验文档都需要落盘,但同属 S3-CP1 启动手续。
- [x] 涉及模块/目录 ≤ 4？
- [x] 能否用一句话描述"解决了什么问题"？把 S3-CP1 从口头"可以开始"推进为有路线图、密封预期入口和事件账本起点的正式观察期。
- [x] 如果失败，能否干净回滚？

## 范围
- 涉及文件：
  - `docs/plans/multi-agent-roadmap.md`
  - `requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`
  - `.claude/worktrees/main/events/session-main.jsonl`
  - `requirements/in-progress/REQ-2026-078-s3-cp1-observation-kickoff.md`
  - `docs/plans/REQ-2026-078-design.md`
  - `requirements/reports/REQ-2026-078-*.md`
  - `context/experience/REQ-2026-078-*.md`
- 涉及目录 / 模块：`docs/plans/`, `requirements/observations/`, `.claude/worktrees/`, `requirements/`, `context/experience/`
- 影响接口 / 页面 / 脚本：路线图恢复入口、`event-store` 读端、`req:status`

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：上述范围内路线图、观察文件、事件账本追加记录、REQ 交付物。
- 可新增的测试 / 脚本：不新增脚本;验证复用 `docs:verify`、`check:governance`、`event-store stats/read`。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/verifier-session.mjs`、`scripts/auto-review.mjs`、`scripts/auto-qa.mjs`。
- 不可引入的依赖 / 操作：不得新增 npm dependency;不得实现任务图或自动 fixer。

**边界条件**：
- 时间 / 环境 / 数据约束：当前日期 2026-06-05;观察期决策沿用 user 在 2026-06-03 已给出的 6 个选择。
- 改动规模或发布边界：只做 S3-CP1 启动手续,不发布版本。

## 验收标准
- [x] AC-1:`multi-agent-roadmap.md` 应用 18 个 section patches,至少包括 TL;DR、S3-CP1 状态、§7 可执行评估表、§8 启动决策行、§12 退役时间表。
- [x] AC-2:`requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md` 存在,包含 user 填写区和"未填写前不得代填"说明。
- [x] AC-3:事件账本存在 `s3_observation_window_start` 事件,包含 `start_date`、`warmup_until`、`formal_until`、`mode_default`、`budget_usd`、`source_report`。
- [x] AC-4:路线图明确 S3-CP1 是观察期,未允许实现完整任务图。
- [x] AC-5:`npm test`、`npm run docs:verify`、`npm run check:governance` 和 REQ 定向审计通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-078-design.md`
- 相关规范：`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md`;`docs/plans/multi-agent-roadmap.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-078-code-review.md`
- QA：`requirements/reports/REQ-2026-078-qa.md`
- Ship：`requirements/reports/REQ-2026-078-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `rg "S3-CP1|s3_observation_window_start|sealed expectation|维护期退役" docs/plans/multi-agent-roadmap.md requirements/observations`
  - `node scripts/event-store.mjs read --json`
  - `node scripts/event-store.mjs stats --metrics`
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/req-audit.mjs --id REQ-2026-078 --verbose`
- 需要的环境：本仓库本地 Node.js;无需网络。
- 需要的人工验证：user 后续填写 sealed expectation 的主观预测,本 REQ 只创建空白框架。

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

## 风险与回滚
- 风险：如果 sealed expectation 被 agent 代填,会破坏反合理化机制。
- 回滚方式：回退路线图 patch,删除 sealed expectation 空文件,移除对应 `s3_observation_window_start` 事件或补 `s3_observation_paused` 事件说明撤销。

## 关键决策
- 2026-06-05：由 `req:create` 自动生成骨架。
- 2026-06-05：用户要求"完成 1 2 3";本 REQ 只做 S3-CP1 启动手续,不推进任务图。

<!-- Source file: REQ-2026-078-s3-cp1-observation-kickoff.md -->
