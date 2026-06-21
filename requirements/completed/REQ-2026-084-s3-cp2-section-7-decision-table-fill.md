# REQ-2026-084: S3-CP2 section 7 decision table fill

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
REQ-2026-083 完成 S3-CP1 收口（W23/W24/W25 周度 `s3_observation_data_recorded` 诚实回填、sealed expectation user 未填记录为协议缺陷、路线图 §3 勾选 S3-CP1、顶部阶段推进 S3-CP2）。本 REQ 执行 S3-CP2：基于 `event-store stats --metrics` 真实数据填 `multi-agent-roadmap.md` §7 决策评估表，完成 §7.2 聚合判定与 §7.3 反向否决核验，为 S3-CP3 决策提供数据结论。

填表只用事件账本真实数据（截至 2026-06-21，Total 69 事件、`req_completed=13`、`verifier_*=0`、`conflict_detected=0`、`human_decision_made=0`）与 REQ-083 已记录的 sealed 缺陷事实，不用 agent 事后感觉补数（§7 开头明文要求）。

## 目标
- 填实 §7.1 七维度表的"当前数据"与"结论"列，全部基于 `stats --metrics` 真实值。
- §7.2 聚合判定：标注各维度启用情况（含 parallel 口径不可信、subjective N/A），得出"开任务图 / 收口 / 修订"的数据结论。
- §7.3 反向否决五条逐条核验，记录命中项。
- 路线图 §3 勾选 S3-CP2、§8 决策日志；产出 S3-CP3 决策建议（给 user 选项，不替 user 做最终决策）。

## 非目标
- 不做 S3-CP3 最终决策（收口 / 修订由 user 在 S3-CP3 拍板）。
- 不改 `scripts/event-store.mjs` schema 或采集工作流（维度不足的根因修复属另开 REQ）。
- 不代填 sealed expectation（继承 REQ-083 的 N/A 结论）。
- 不实现完整任务图、fixer 派生或 agent runtime。

## 颗粒度自检
- [x] 目标数 ≤ 4？是（4 个）。
- [ ] 涉及文件数 ≤ 4？否；路线图、REQ 自身、报告、experience、progress/INDEX 同属 S3-CP2 填表手续，参照 REQ-078/083 同类豁免。
- [x] 涉及模块/目录 ≤ 4？是（`docs/plans/`、`requirements/reports/`、`context/experience/`、`requirements/in-progress/`）。
- [x] 一句话：把 S3-CP2 §7 评估表从"待填"推进为"基于真实数据填实 + 聚合判定 + 反向否决核验完成"，给出 S3-CP3 决策的数据结论。
- [x] 干净回滚？能（回退 §7 表为待填、§3/§8 回退）。

## 范围
- 涉及文件：
  - `docs/plans/multi-agent-roadmap.md`（§7.1 表填实、§7.2/§7.3 判定补充、§3 勾选 S3-CP2、§8 决策日志）
  - `requirements/in-progress/REQ-2026-084-*.md`（本 REQ 自身：复选框 / 状态 / 范围声明）
  - `requirements/reports/REQ-2026-084-*.md`（QA / code-review）
  - `context/experience/REQ-2026-084-*.md`
  - `.claude/progress.txt`、`requirements/INDEX.md`
- 涉及目录 / 模块：`docs/plans/`、`requirements/reports/`、`context/experience/`、`requirements/`
- 影响接口 / 页面 / 脚本：路线图 §7 决策门、`req:status`

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：上述范围内路线图 §7、REQ 交付物。
- 可新增的测试 / 脚本：不新增脚本；验证复用 `event-store stats --metrics`、`docs:verify`、`check:governance`、`req:audit`。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/verifier-session.mjs`、`scripts/auto-review.mjs`、`scripts/auto-qa.mjs`；`S3-CP1-sealed-expectation-2026-06-03.md` 的主观问题正文。
- 不可引入的依赖 / 操作：不得新增 npm dependency；不得为凑 §7 维度改采集口径或代填 sealed；不得借填表名义实现任务图。

**边界条件**：
- 时间 / 环境 / 数据约束：当前日期 2026-06-21；数据源 `stats --metrics`（Total 69、`req_completed=13`、`verifier_*=0`、`conflict_detected=0`、`human_decision_made=0`）。
- 改动规模或发布边界：只填表 + 核验，不发布版本。

## 验收标准
- [x] AC-1：§7.1 七维度表"当前数据"列全部填 `stats --metrics` 真实值，"结论"列填判定（不指向任务图 / 口径不可信 / 维度禁用 / N/A）。
- [x] AC-2：§7.2 聚合判定落盘，明确维度启用数（区分可信启用与不可信/N/A），给出建议结论。
- [x] AC-3：§7.3 反向否决五条逐条核验，命中项（第 5 条：痛点非并行协作）记录。
- [x] AC-4：路线图 §3 S3-CP2 已勾选，§8 有 2026-06-21 决策日志；S3-CP3 决策建议文档化（收口 / 修订选项 + 理由，交 user）。
- [x] AC-5：`npm test`、`npm run docs:verify`、`npm run check:governance`、`req:audit --id REQ-2026-084` 通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-084-design.md`
- 相关规范：`docs/plans/multi-agent-roadmap.md`（§7.1 / §7.2 / §7.3 / §8）；`requirements/completed/REQ-2026-083-s3-cp1-exit-confirmation-and-weekly-data-record.md`（S3-CP1 收口、sealed 缺陷）；`requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`（补充说明区声明）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-084-code-review.md`
- QA：`requirements/reports/REQ-2026-084-qa.md`
- Ship：`requirements/reports/REQ-2026-084-ship.md`（手续性 REQ，不发布版本，不适用）

## 验证计划
- 计划执行的命令：
  - `node scripts/event-store.mjs stats --metrics`（数据源校验）
  - `rg "S3-CP2|待 S3-CP2 填|待填" docs/plans/multi-agent-roadmap.md`（确认表已填、无残留占位）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`
  - `node scripts/req-audit.mjs --id REQ-2026-084 --verbose`
- 需要的环境：本仓库本地 Node.js；无需网络。
- 需要的人工验证：user 在 S3-CP3 对"收口 vs 修订"拍板（本 REQ 只给数据结论与建议，不做最终决策）。

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

> 周度数据补记与 sealed 处理属 REQ-083；本 REQ 只读 `stats --metrics` 填表，不产生新临时实现。

## 风险与回滚
- 风险 1：填表时把 parallel_req_count（口径不可信）当作有效并行证据 → 误导 S3-CP3。
  - 缓解：结论列明确标"口径不可信（脚本自标注时间窗口聚合未实现）"，不计入有效任务图信号。
- 风险 2：subjective 维度 N/A 被当成"支持收口" → 误导。
  - 缓解：明确标 N/A，§7.2 判定中"收口"所需的 user 主观不支持条件无法由 sealed 确认，交 S3-CP3 user 直接表态。
- 风险 3：§7.3 第 5 条反向否决（痛点非并行协作）判定主观。
  - 缓解：用 REQ-083 experience 记录的治理工具摩擦作为客观痛点证据。
- 回滚方式：§7 表回退为"待填"、§3/§8 回退、删除报告。

## 关键决策
- 2026-06-21：由 `req:create` 自动生成骨架。
- 2026-06-21：继承 REQ-083 的 sealed N/A 与维度不足事实；填表结论指向"不开任务图"，S3-CP3 在收口/修订间由 user 拍板。

<!-- Source file: REQ-2026-084-s3-cp2-section-7-decision-table-fill.md -->
