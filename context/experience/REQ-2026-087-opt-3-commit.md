# 2026-06-22 OPT-3 — 经验文档自动草稿（聚合 commit/报告/事件账本）

## 场景（来自 REQ 背景）

`req:experience` 当前生成空模板手填，是 REQ 完成路径上最大摩擦点之一——"完成摩擦"是同类工具被弃用的主因（OPT-3 背景原话）。实证：REQ-2026-085 / 086 都用了 `--skip-experience`，并非没有可沉淀经验，而是手填成本高于感知收益，导致 `--skip-experience` 被滥用。

`progress.txt` 已明确"修治理工具摩擦 + §7 采数工作流，不开任务图"。本 REQ 正是修一个已亲历、高频、低风险的摩擦点：把 `req:experience` 从"空模板手填"改为"脚本聚合草稿 + 人工确认"，在不降低沉淀质量的前提下降低完成税。

## 实施时间线（来自事件账本）

- 2026-06-22T01:12:13.870Z req_started (implementation)

## 关联提交（来自 git log --grep）

(无关联提交)

## 验证结论（来自报告）

- REQ-2026-087-code-review.md: ✅ 通过（自审）
- REQ-2026-087-qa.md: ✅ 通过

## 关键决策（来自 REQ）

- 2026-06-22：OPT-3 定性为"减少治理本身的税"，不是加机制。纯脚本聚合（无 LLM）守零依赖；AUTO-DRAFT 仅提醒不阻断（人工确认兜底，遵守"警告优先于阻断"）。
- 2026-06-22：聚合源选定 REQ 文件 + git log --grep + reports + 事件账本四处，复用 event-store.mjs 读取 API（不改其 schema）。
- 2026-06-22：本 REQ 是内循环最后一项（OPT-1 已完成、OPT-2/4 暂缓、OPT-5 不做、OPT-6 待第二项目）。完成后停内循环，转向"第二个真实项目"受控实验（评估清单：setup 时间 / REQ 摩擦 / hook 误杀漏拦 / --skip-experience 下降率）。

## 沉淀要点（人工填写）

- **可复用模式**：治理工具自身摩擦用「聚合草稿 + 人工确认 + non-blocking 提醒」降税——不靠门禁强制（AUTO-DRAFT 仅 `console.warn` 不阻断），人工确认是闸门。适用于所有"完成路径摩擦"型问题。
- **踩坑**：AUTO-DRAFT 检测的 `readFileSync` 路径必须加 `context/experience/` 前缀——`findExperienceDocs` 返回的 `files` 是文件名（不含目录），`toFullPath(expFile)` 会拼成 repo 根导致 ENOENT。本 REQ 首次测试即暴露此 bug。
- **反模式**：不要用 `--skip-experience` 绕过沉淀。OPT-3 的起因就是 REQ-085/086 滥用 skip——本 REQ 后 experience 自动聚合草稿，skip 滥用应下降。
- **待修（既有，非本 REQ 引入）**：关联材料链接用 `requirements/completed/${reqId}.md`（无 slug），与实际 REQ 文件名（含 slug）不一致 → 链接断。旧 `buildExperienceContent` 同样问题，`buildExperienceDraft` 沿用。后续可改用 `req.fileName`。

## 关联材料

- REQ: `requirements/completed/REQ-2026-087.md`
- Design: `docs/plans/REQ-2026-087-design.md`（如有）
- Code Review: `requirements/reports/REQ-2026-087-code-review.md`
- QA: `requirements/reports/REQ-2026-087-qa.md`
