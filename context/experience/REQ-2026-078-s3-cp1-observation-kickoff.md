# REQ-2026-078 S3-CP1 observation window kickoff 经验

## 场景

Stage 1 和 Stage 2 已完成,但正式观察期不能只靠口头说"开始了"。REQ-078 把 S3-CP1 入口拆成三个可验证动作:路线图口径更新、密封预期入口、事件账本启动记录。

## 关联材料

- REQ: `requirements/completed/REQ-2026-078-s3-cp1-observation-kickoff.md`
- Design: `docs/plans/REQ-2026-078-design.md`
- Code Review: `requirements/reports/REQ-2026-078-code-review.md`
- QA: `requirements/reports/REQ-2026-078-qa.md`

## 问题 / 模式

- "观察期"需要一个可审计起点,否则后续所有 2 周、热身期、正式期都会变成口头账。
- 主观预期要在观察前密封,且不能由 agent 代填;否则 S3-CP2 复盘会被事后合理化污染。
- 路线图进入观察期前,必须把反向否决和聚合规则写清楚,防止后续为了上任务图倒推数据。
- 事件 schema 的强校验字段和业务验收字段可能不完全一致;可以保留额外 payload,但要在 review/QA 里说明。

## 关键决策

- 决策 1:把 REQ-075/076/077 视为观察期前置修复,REQ-078 才是正式观察期启动手续。
- 决策 2:sealed expectation 只放 user 填写框架,agent 不写任何主观判断。
- 决策 3:不改 `event-store.mjs` schema,直接使用 REQ-075 已落地的 `s3_observation_window_start`。
- 决策 4:路线图 §7 增加聚合规则和反向否决,明确任务图不能在 S3-CP1 期间提前实现。

## 解决方案

1. 将多角度推演报告的 18 个 section patches 合并到 `docs/plans/multi-agent-roadmap.md`。
2. 创建 `requirements/observations/S3-CP1-sealed-expectation-2026-06-03.md`,只保留填写区和对比区。
3. 通过 `appendEvent` 追加 `s3_observation_window_start` 事件,记录起算日、热身期、正式期、默认模式、预算和来源报告。
4. 用 review、QA 和 experience 把"观察期启动"与"任务图实现"边界固定下来。

## 复用建议

- 后续任何"进入观察期 / 试运行期 / 灰度期"都应同时具备:路线图状态、观察前预期、事件账本起点。
- 主观预测类文件应明确 agent 不得代填,并把观察后对比区留到复盘阶段。
- 如果 schema 只校验最小字段,但验收需要更多字段,应把额外字段的兼容性风险写进 review 和 QA。

