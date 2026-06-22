# REQ-2026-087 设计稿：OPT-3 — 经验文档自动草稿

> 关联 REQ：`requirements/in-progress/REQ-2026-087-opt3-experience-auto-draft.md`
> 关联路线：`docs/plans/optimization-roadmap-2026-06.md` OPT-3

## 1. 问题陈述

`req:experience` 当前生成空模板手填（REQ-085/086 实证：两个都 `--skip-experience`，非无经验，是手填成本 > 感知收益）。这是完成路径最大摩擦点，导致 `--skip-experience` 滥用 → 经验沉淀率低 → invariant 系统缺素材（doctor 显示 66 条不变量仅 4 active）。

OPT-3 把"空模板手填"改成"脚本聚合草稿 + 人工确认"，降摩擦、提沉淀率。

## 2. 方案

### 2.1 聚合源（纯脚本，无 LLM）

`req-cli.mjs experience --id <REQ-ID>` 改为聚合四源生成预填草稿：

| 源 | 提取内容 | 实现 |
|---|---|---|
| REQ 文件 | 标题、背景、目标、验收勾选状态、关键决策、临时实现与债务 | 读 `requirements/{in-progress,completed}/<REQ-ID>-*.md`，抽章节 |
| git 历史 | 关联 commit 列表 + 改动文件统计 | `git log --grep <REQ-ID> --format=...` + `git diff --stat` |
| 报告 | review/QA/ship 结论行 | 读 `requirements/reports/<REQ-ID>-*.md`，抽结论/状态行 |
| 事件账本 | REQ 生命周期时间线（started/blocked/completed + ts）| 复用 `event-store.mjs` readEvents，过滤 reqId |

> 实施前需读 `scripts/req-cli.mjs` 现有 `experienceCommand` + `scripts/event-store.mjs` readEvents API 签名，对齐调用。

### 2.2 草稿格式

生成的 experience 文档结构：

```markdown
<!-- AUTO-DRAFT: 以下内容为脚本聚合，需人工确认后删除本标记 -->
# <REQ-ID> 经验：<标题>

## 背景（来自 REQ）
<抽自 REQ 背景>

## 实施时间线（来自事件账本）
- <ts> req_started (implementation)
- <ts> req_completed (qa)

## 关联提交（来自 git）
- <hash> <subject> (<files changed>)
- ...

## 验证结论（来自报告）
- Code Review: <结论行>
- QA: <结论行>

## 关键决策（来自 REQ）
<抽自 REQ 关键决策>

## 沉淀要点（人工填写）
- <待人工补充：可复用模式 / 踩坑 / 反模式>
```

"沉淀要点"是唯一纯人工段，其余预填。AUTO-DRAFT 标记在头部，人工确认后删除。

### 2.3 req:complete 检测 AUTO-DRAFT

`completeCommand` 在 experience 检查阶段：若 experience 文档含 `AUTO-DRAFT` 标记 → stderr 输出提醒（"经验文档仍含 AUTO-DRAFT 标记，请人工确认沉淀要点后删除标记"），**不阻断**（继续 complete）。与现有 `--skip-experience` 逻辑并列：有 experience 文档但含标记 → 提醒；无文档 → 现有逻辑。

### 2.4 降级（无 git 历史 / 无报告）

- 无 commit（`git log --grep` 空）→ "关联提交"段写"(无关联提交)"
- 无 reports → "验证结论"段写"(无报告)"
- 事件账本无该 REQ 事件 → "时间线"段写"(无事件记录)"
- 仍生成草稿（含 REQ 文件内容），不报错

## 3. 测试矩阵（tests/governance.test.mjs 新增）

| # | 场景 | 期望 |
|---|------|------|
| T1 | fixture REQ + git commit + reports → req:experience | 草稿含 commit 列表 + 报告结论 + 时间线 + AUTO-DRAFT 标记 |
| T2 | 含 AUTO-DRAFT 的 experience + req:complete | 输出提醒 + 正常完成（exit 0，不阻断）|
| T3 | 无 git 历史 / 无 reports → req:experience | 优雅降级（对应段写"无"，不报错）|
| T4 | experience 无 AUTO-DRAFT（已确认）→ req:complete | 无提醒（与现状一致）|

## 4. 非目标（重申）
- 不调 LLM / 不改 experience 模板格式 / AUTO-DRAFT 不阻断 / 不追溯存量

## 5. 风险与回滚
- 草稿质量低 → `governance:health` 不变量统计兜底；AUTO-DRAFT 仅提醒。
- 回滚：experience 还原空模板 + complete 移除 AUTO-DRAFT 检测。

## 6. 实施顺序
1. 读 `req-cli.mjs experienceCommand` + `event-store.mjs` readEvents 现状
2. 实现聚合（四源抽提 + 草稿生成 + AUTO-DRAFT 标记）
3. complete 加 AUTO-DRAFT 检测（提醒不阻断）
4. 降级路径
5. tests T1-T4
6. README 同步
7. `npm test` + `docs:verify` + `check:governance` 全绿
