# 2026-06-22 第二项目实验 3 缺陷修复（标题宽松 + install .gitignore + doctor 传播）

## 场景（来自 REQ 背景）

2026-06-22 第二项目受控实验（academic-paper-workflow 接入 harness-lab，1 个 REQ）暴露 3 个 actionable 缺陷（详见 `requirements/observations/2026-06-22-second-project-experiment.md`）。这些是**实验数据驱动的修复**，非凭空加机制——符合"数据回来再改"原则。

1. **#2 标题精确匹配脆弱**：`req-validation.mjs` `hasExemption` 用 `getSection(reqContent, '### 约束（Scope Control，可选）')` 精确匹配。用户写 `### 约束（Scope Control）`（漏"，可选"）→ 豁免静默失效，req:start 报缺 design 且无格式提示。
2. **#3 install 不配 .gitignore**：`harness-install.mjs` 不自动追加 harness 运行时状态忽略到目标 `.gitignore` → 目标项目 git status 被状态文件（.claude/.xxx-status / events/ / worktrees/）污染。
3. **doctor 不传播**：`harness-install.mjs` `modules.cli.files` 不含 `harness-doctor.mjs` → 目标项目无法跑 OPT-1B 三项自检（Bash 覆盖 / stdin 契约 / 平台缺口）。

## 实施时间线（来自事件账本）

- 2026-06-22T10:57:17.944Z req_started (implementation)

## 关联提交（来自 git log --grep）

(无关联提交)

## 验证结论（来自报告）

- REQ-2026-088-code-review.md: ✅ 通过（自审）
- REQ-2026-088-qa.md: ✅ 通过

## 关键决策（来自 REQ）

- 2026-06-22：3 缺陷为第二项目实验（academic-paper-workflow）暴露，实验驱动修复（observations/2026-06-22-second-project-experiment.md）。
- 2026-06-22：#4（complete 强制报告）/ #5（docs gate）不修——是治理完整性取舍，非缺陷。
- 2026-06-22：标题宽松用 `### 约束` 前缀匹配（兼容两种写法），不删"，可选"推荐写法。

## 沉淀要点（人工填写）

- **可复用模式**：实验驱动缺陷修复闭环——第二项目受控实验 → observations 报告（四指标 + actionable 缺陷）→ REQ 回修 → 验证。比凭空加机制更准（每个缺陷有真实触发场景）。
- **踩坑**：`hasExemption` 标题精确匹配是静默失效典型（漏字不报错，只表现为"豁免没生效"）。宽松回退 + 关键词约束是对冲。类似精确匹配陷阱在其他 getSection 调用也可能存在。
- **反模式/缺陷**：install 不配目标 .gitignore 是"治理工具自己制造 git 噪音"的反模式——已修（appendGitignore 幂等）。doctor 不传播同理（OPT-1B 自检在目标项目失效）——已修（cli.files）。
- **设计取舍**：#4（complete 强制报告）/ #5（docs gate）不修——治理完整性 vs 小改动摩擦的取舍，非缺陷。轻 REQ 用 `skip-design-validation` + `--no-docs-gate` 降摩擦即可。

## 关联材料

- REQ: `requirements/completed/REQ-2026-088.md`
- Design: `docs/plans/REQ-2026-088-design.md`（如有）
- Code Review: `requirements/reports/REQ-2026-088-code-review.md`
- QA: `requirements/reports/REQ-2026-088-qa.md`
