# Code Review: REQ-2026-098

## 状态

- ✅ Approved（**同谱系自审**，见"Residual"第 1 条）

## Inputs

- REQ：`requirements/in-progress/REQ-2026-098-p0-state-handoff-single-truth-source.md`
- DESIGN：无独立设计稿（`skip-design-validation`，设计即 REQ 的"关键决策"五条）
- Reviewed：`scripts/event-store.mjs`（投影语义）、`scripts/session-start.js`（渲染三区 + INDEX 解析）、`tests/event-store.test.mjs`（4 个新用例 + 2 处旧断言更新）、`AGENTS.md`（契约段）、`README.md`（第 309 行新增一段）

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：`lastUpdated` 被 `session_started` 污染——原实现对循环内所有事件覆盖该字段；现仅在非会话事件上推进（`SESSION_EVENT_TYPES`）。
- 已关闭：`Summary` 标签与内容不符——投影的 `summary` 是最近 8 条事件流水，渲染却标为现状摘要；现拆为「机器状态」/「最近事件（显示 N 条 / 共 M 条）」两区。
- 已关闭：`blockers` 死字段——投影中 5 处赋值、0 处填充，渲染分支永不触发；现删除该字段与对应分支，阻塞原因统一由 `suspendedReqs[].reason` 承载。
- 已关闭：`progress.txt` 被整份丢弃——`projection || parseProgress()` 使手写内容在有事件时永不可见（实测 4 条 Next steps + 2 条 Open questions 输出 0 条）；现新增「人的笔记」区原文照登。
- 已关闭：INDEX 搁置列表吞掉首项——正则捕获组吃掉 `- ` 前缀，`filter(startsWith('- '))` 因而丢首项（本仓库 3 条只显示 2 条）；现改为逐行扫描 `readIndexSection()`。
- 已关闭：`parseProgress()` 成为孤儿——随渲染改造删除，避免留下两套解析语义。

### Residual

1. **本评审为同谱系自审**：评审者与实现者同为当前模型/harness。按课程「单模型自评审无效」与 2026-07-10 评审的双谱系建议，本报告的独立性有限；双谱系评审是独立的优化项（不在本 REQ 范围），不应把本报告的 Approved 当作异质交叉验证。
2. `updateProgress()`（`scripts/req-cli.mjs:401-442`）仍独立计算 activeReq/phase/lastUpdated 并改写 `progress.txt` 头部。本 REQ 使渲染不再解析该文件，因此漂移不再影响交接输出；但"同一事实两处计算"仍在，已登记为债务（见 REQ"临时实现与债务"）。
3. 投影返回结构未做嵌套拆分（`current` / `recentEvents`）：真正的结构变更会破坏范围外消费者（`req-cli.mjs`、`req-status-json.test.mjs`）。分离在渲染层与契约层达成，理由记于 REQ"关键决策"。
4. `.claude/events/session-main.jsonl` 的 13 条 legacy 事件（无 `version`）在每次会话启动输出 13 行 WARN。属既有噪声，本 REQ 未清理（清理需另有决策，且不属交接正确性）。
5. 存量 125 条 governance warning、21 组 invariant 重复为已知债务，本 REQ 未扩大范围。

## Conclusion

- Approved。投影语义单义化、渲染分区、人写内容可见性、INDEX 解析四项缺陷均已关闭并有复现测试覆盖；未发现新增副作用或范围外改动。
