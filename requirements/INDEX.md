# Requirements Index

> 本文件是仓库内需求状态的单一事实源。
> 任何 REQ 的创建、切换、完成、搁置，都要同步更新这里。

## 读取顺序

1. 查看当前活跃 REQ
2. 查看 `.claude/progress.txt`
3. 打开对应的 `requirements/in-progress/` 或 `requirements/completed/` 文件
4. 按需打开 `docs/plans/` 和 `requirements/reports/` 中的关联文档

## 当前活跃 REQ

- 无

## 当前搁置 REQ

- 无

## 最近完成 REQ

- `REQ-2026-020-design-doc-validation.md`（真实整改：设计文档内容验证）
- `REQ-2026-019-remove-version-history-from-entry-docs.md`（真实整改：移除入口文档中的版本历史）
- `REQ-2026-018-req-complete-report-check.md`（真实整改：req:complete 强制检查报告文件存在）
- `REQ-2026-017-hook-block-no-req-bypass.md`（真实整改：修复无活跃 REQ 时 Hook 绕过漏洞）
- `REQ-2026-016-one-click-setup-hard-block-parity.md`（真实整改：One-click setup parity with hard-block governance hooks）
- `REQ-2026-015-req-content-validation.md`（真实整改：REQ 内容有效性验证，阻止空模板 REQ 进入实施链路）
- `REQ-2026-014-portable-real-command-binding-for-target-projects.md`（真实整改：Portable real command binding for target projects）
- `REQ-2026-013-governance-automation-tests-and-ci-gate.md`（真实整改：Governance automation tests and CI gate）
- `REQ-2026-012-pretooluse-req-block.md`（真实整改：PreToolUse 硬阻断：将 REQ 检查从软约束升级为强制 block）
- `REQ-2026-011-governance-self-check-installer-parity-fixes.md`（真实整改：Governance self-check and installer parity fixes）
- `REQ-2026-010-harness-setup-skill.md`（真实整改：harness-setup Skill）
- `REQ-2026-009-pretooluse-hook-for-req-enforcement.md`（真实整改：PreToolUse hook for REQ enforcement）
- `REQ-2026-008-governance-enforcement-mechanisms.md`（真实整改：Governance enforcement mechanisms）
- `REQ-2026-007-scope-control-lightweight-upgrade.md`（真实整改：Scope control lightweight upgrade）
- `REQ-2026-006-structured-docs-impact-output-mvp.md`（真实整改：Structured docs impact output MVP）
- `REQ-2026-005-docs-impact-and-complete-gate-mvp.md`（真实整改：Docs impact planning and completion gate MVP）
- `REQ-2026-004-diff-aware-doc-sync-mvp.md`（真实整改：Diff-aware doc sync MVP）
- `REQ-2026-003-docs-quality-gate-mvp.md`（真实整改：Docs quality gate MVP）
- `REQ-2026-002-req-lifecycle-cli-mvp.md`（真实整改：REQ lifecycle CLI MVP）
- `REQ-2026-001-template-hardening.md`（真实整改：模板自举、入口修复、示例补齐）

## 公开示例

- `REQ-2026-900-example-status-filter.md`（完整链路示例）
- `REQ-2026-901-suspended-example.md`（blocked / suspended 示例）

## 目录约定

- `requirements/REQ_TEMPLATE.md`
  新建 REQ 时复制此模板。
- `requirements/in-progress/`
  正在推进的需求。
- `requirements/completed/`
  已完成需求。
- `requirements/reports/`
  `code-review`、`qa`、`ship` 等执行报告。

## 生命周期约定

### 新建
- 在 `requirements/in-progress/` 创建 `REQ-YYYY-NNN-*.md`
- 中大改动在 `docs/plans/` 创建对应 `REQ-YYYY-NNN-design.md`
- 小改动可把设计摘要直接写在 REQ 文件中
- 如果任务需要明确 agent / 协作者的行为边界，可在 REQ 的“范围”下补 `Scope Control`

### 推进
- 设计、实现、评审、验证都围绕同一个 REQ 编号展开
- 相关报告落到 `requirements/reports/`

### 完成
- 将 REQ 文件移入 `requirements/completed/`
- 更新“当前活跃 REQ”和“最近完成 REQ”
- 如有复用价值，补 `context/experience/` 经验文档

### 搁置
- 在 REQ 文件中写明原因、恢复条件和下一步
- `blocked / suspended` 的 REQ 仍保留在 `requirements/in-progress/`
- 在本索引里标明搁置状态

## 报告约定

建议至少有这些报告：
- `REQ-YYYY-NNN-code-review.md`
- `REQ-YYYY-NNN-qa.md`
- `REQ-YYYY-NNN-ship.md`

如果某类报告不适用，也要在 REQ 中明确说明原因，而不是默认省略。
