# REQ 索引

本目录存放所有 REQ（需求规格说明书）。

## 命名规则

```
requirements/{status}/REQ-{YYYY}-{NNN}-{brief-desc}.md
```

- `status`: `in-progress` | `completed` | `on-hold`
- `YYYY`: 年份
- `NNN`: 当年序号（001 开始）
- `brief-desc`: 简短英文描述（kebab-case）

## 当前活跃 REQ

- 无

## 当前搁置 REQ

- `REQ-2026-097-p1-three-external-project-pilots.md`（真实整改：P1 三类外部项目 Pilot）
- `REQ-2026-096-p1-cross-platform-ci-claude-matcher-smoke.md`（真实整改：P1 跨平台 CI 与 Claude Matcher Smoke）
- `REQ-2026-901-suspended-example.md`（示例 REQ - 演示搁置状态）

## 最近完成 REQ

- `REQ-2026-095-p1-state-semantics-real-worktree.md`（真实整改：P1 状态语义与真实 worktree）
- `REQ-2026-094-p1-safe-upgrade-v1.md`（真实整改：P1 安全升级 v1）
- `REQ-2026-093-p1-hook-policy-profile-doctor.md`（真实整改：P1 Hook 风险策略矩阵与 profile-aware doctor）
- `REQ-2026-092-p1-capability-manifest.md`（真实整改：P1 最小 capability manifest 单一事实源）
- `REQ-2026-091-p0-executable-user-docs.md`（真实整改：P0 用户可执行文档与首个 REQ 向导）
- `REQ-2026-090-p0-canonical-path-multi-target-guard.md`（真实整改：P0 canonical path 与多写目标门禁）
- `REQ-2026-089-review-plan-p0-distribution-installation.md`（真实整改：P0 公开分发与安装闭环）
- `REQ-2026-088-second-project-defects.md`（真实整改：第二项目实验 3 缺陷修复（标题宽松 + install .gitignore + doctor 传播））
- `REQ-2026-087-opt3-experience-auto-draft.md`（真实整改：OPT-3 — 经验文档自动草稿（聚合 commit/报告/事件账本））
- `REQ-2026-086-opt1b-install-doctor-docs.md`（真实整改：OPT-1B — 目标项目 matcher 传播 + 缺口声明 + doctor 自检）
- `REQ-2026-085-opt1a-req-check-stdin-bash.md`（真实整改：OPT-1A — req-check stdin 契约 + Bash 写入门禁）
- `REQ-2026-084-s3-cp2-section-7-decision-table-fill.md`（真实整改：S3-CP2 section 7 decision table fill）
- `REQ-2026-083-s3-cp1-exit-confirmation-and-weekly-data-record.md`（真实整改：S3-CP1 exit confirmation and weekly data record）
- `REQ-2026-081-governance-safety-hardening.md`（真实整改：governance-safety-hardening）
- `REQ-2026-082-scope-guard-hook-installation-drift.md`（真实整改：Fix scope guard enforcement and hook installation drift）
- `REQ-2026-080-entry-docs-governance-coverage.md`（真实整改：entry-docs-governance-coverage）
- `REQ-2026-079-verified-governance-defects.md`（真实整改：Fix verified governance defects）
- `REQ-2026-078-s3-cp1-observation-kickoff.md`（真实整改：S3-CP1 observation window kickoff）
- `REQ-2026-077-verifier-defaults-readonly-boundary.md`（真实整改：verifier defaults alignment and read-only boundary tests）
- `REQ-2026-076-stage-3-worktree-namespace-isolation-and-stage-2-revalidation.md`（真实整改：Stage 3 worktree namespace isolation and Stage 2 revalidation）
- `REQ-2026-075-stage-3-7-event-store-schema.md`（真实整改：Stage 3 §7 评估表口径定义 + event-store schema 扩展）
- `REQ-2026-074-stage-2-exit-confirmation.md`（真实整改：Stage 2: exit confirmation）
- `REQ-2026-073-stage-2-worktree-aware-event-aggregation.md`（真实整改：Stage 2: worktree-aware event aggregation）
- `REQ-2026-072-stage-2-progress-projection.md`（真实整改：Stage 2: progress projection）
- `REQ-2026-071-stage-2-event-ledger-high-frequency-writers.md`（真实整改：Stage 2: event ledger high-frequency writers）
- `REQ-2026-070-stage-2-event-schema-and-append-api.md`（真实整改：Stage 2: event schema and append API）
- `REQ-2026-066-stage-1-verifier-session-schema.md`（真实整改：Stage 1: 独立 verifier session 与 schema 级工具白名单）
- `REQ-2026-067-fix-duplicate-completed-req-ids.md`（真实整改：fix: duplicate completed REQ IDs）
- `REQ-2026-069-sh-js-reference-cleanup.md`（历史重编号：Phase 2 清理 sh 引用残留）
- `REQ-2026-068-sh-js-entry-unification.md`（历史重编号：删除 sh/js 双实现冗余）
- `REQ-2026-065-feat-legacy-audit-baseline.md`（真实整改：feat: legacy audit baseline）
- `REQ-2026-064-fix-invariant-incremental-source-dedup.md`（真实整改：fix: invariant incremental source dedup）
- `REQ-2026-063-feat-governance-audit-warning-triage.md`（真实整改：feat: governance audit warning triage）
- `REQ-2026-062-governance-framework-audit-and-installer-hardening.md`（真实整改：governance framework audit and installer hardening）
- `REQ-2026-061-claude-code-worktree-docs-alignment.md`（真实整改：docs: align worktree guidance with Claude Code docs）
- `REQ-2026-060-claude-code-worktree-req-guidance.md`（真实整改：feat: Claude Code worktree REQ guidance）
- `REQ-2026-059-fix-include-worktree-support-in-harness-install.md`（真实整改：fix: include worktree support in harness install）
- `REQ-2026-058-worktree-local-isolation.md`（真实整改：支持 worktree 本地隔离模式）
- `REQ-2026-057-feat-harness-setup-execution-optimization.md`（真实整改：feat: harness setup execution optimization）
- `REQ-2026-056-feat-harness-setup-skill.md`（真实整改：feat: 完善 harness-setup skill 与一键迁移分发契约）
- `REQ-2026-055-phase-6a-req-status-by-id.md`（真实整改：Phase 6a: req:status --id 按 REQ ID 查询状态）
- `REQ-2026-054-phase-6a-req-status-json-external-mappings.md`（真实整改：Phase 6a: req status --json + external mappings）
- `REQ-2026-053-phase-5-precompact-hook-autonomous.md`（真实整改：Phase 5 集成验证 — PreCompact hook + autonomous 端到端）
- `REQ-2026-052-phase-5-6.md`（真实整改：Phase 5.6 不变量清理）
- `REQ-2026-051-phase-5-5.md`（真实整改：Phase 5.5 部署守卫）
- `REQ-2026-050-phase-5-4-autonomous.md`（真实整改：Phase 5.4 autonomous 模式实质化）
- `REQ-2026-049-phase-5-3.md`（真实整改：Phase 5.3 上下文续传）
- `REQ-2026-048-phase-5-2.md`（真实整改：Phase 5.2 自恢复指令）
- `REQ-2026-047-phase-51-watchdog.md`（真实整改：Phase 5.1 Watchdog（看门狗））
- `REQ-2026-046-phase-4b4c-auto-review.md`（真实整改：Phase 4B+4C — Auto QA & Auto Review）
- `REQ-2026-045-phase-4a-review-gatekeeper.md`（真实整改：Phase 4A — Review Agent Isolation）
- `REQ-2026-044-phase-3c-risk-tracker.md`（真实整改：Phase 3C 风险追踪）
- `REQ-2026-043-phase-3b-scope-guard.md`（真实整改：Phase 3B 范围强制（防越界））
- `REQ-2026-042-phase-3a-stop-sessionend.md`（真实整改：Phase 3A: 基础安全模式（模式切换 + Stop 评估器 + SessionEnd 反思））
- `REQ-2026-041-commit-msg-hook.md`（真实整改：commit-msg hook 校验提交消息格式）
- `REQ-2026-040-phase-2b-req-cli-type.md`（真实整改：Phase 2B 补充：req-cli --type 参数化，统一模板源）
- `REQ-2026-039-phase-2b-specialized-req-slash-commands-bugfix-feature-refactor.md`（真实整改：Phase 2B: specialized REQ slash commands (bugfix/feature/refactor)）
- `REQ-2026-038-phase-2a-onboarding-dx-harness-doctor-and-first-req-wizard.md`（真实整改：Phase 2A: Onboarding DX — harness-doctor and first-req wizard）
- `REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md`（真实整改：Phase 1: invariant quality gate, lifecycle, and injection）
- `REQ-2026-036-learning-loop-experience-feedback.md`（真实整改：学习闭环：经验回流机制）
- `REQ-2026-035-governance-error-classifier.md`（真实整改：错误分类器：结构化治理错误与恢复策略）
- `REQ-2026-034-loop-detection-and-exempt-ttl.md`（真实整改：循环检测与豁免 TTL 机制）
- `REQ-2026-033-req-granularity-4-entity-rule.md`（真实整改：REQ 颗粒度 4 实体原则）
- `REQ-2026-032-experience-doc-quality-gate.md`（真实整改：Experience 文档质量门禁）
- `REQ-2026-032-feedback-meta-reflection-alignment.md`（真实整改：反馈机制增强：元反思与对齐）
- `REQ-2026-001-template-hardening.md`（模板加固）
- `REQ-2026-031-governance.md`（真实整改：Governance: 强制经验沉淀闭环）
- `REQ-2026-030-harness-setup-req.md`（真实整改：修复 harness-setup 移植时污染目标项目的 REQ 数据）
- `REQ-2026-029-design-doc-creation-flow.md`（真实整改：优化设计文档创建流程）
- `REQ-2026-028-critical-path-tests.md`（真实整改：补充关键路径测试）
- `REQ-2026-027-hook-timeout-config.md`（真实整改：Hook timeout 可配置化）
- `REQ-2026-026-error-log-persistence.md`（真实整改：添加错误日志持久化）
- `REQ-2026-025-regex-replace-boundary-fix.md`（真实整改：修复正则替换边界风险）
- `REQ-2026-024-harness-self-governance.md`（真实整改：harness-lab 自治理机制）
- `REQ-2026-023-req-enforcement-refine.md`（真实整改：REQ 强制机制细化）
- `REQ-2026-022-req-check-post-write.md`（真实整改：REQ 后置写入校验）
- `REQ-2026-021-post-write-verify.md`（真实整改：增强写入后验证机制）
- `REQ-2026-020-req-phase-cleanup.md`（真实整改：REQ 阶段标记文件清理机制）
- `REQ-2026-019-sync-write-verify.md`（真实整改：同步写入与可靠性验证）
- `REQ-2026-018-session-start-restore.md`（真实整改：会话启动上下文恢复）
- `REQ-2026-017-req-check-refactor.md`（真实整改：重构 req-check.sh 为模块化 CLI）
- `REQ-2026-016-lint-shell-scripts.md`（真实整改：Shell 脚本 lint 修复）
- `REQ-2026-015-self-governance.md`（真实整改：harness-lab 自治理机制）
