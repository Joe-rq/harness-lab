# REQ-2026-095: P1 状态语义与真实 worktree

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 status/session/health/doctor 对“活跃、blocked/suspended、历史债务、回归、invariant 数量”的解释不一致：事件 projection 把 blocked 仍当 active，health 把公开示例算作 in-progress、把模板与重复 invariant 算入总量，并用 legacy/current 代替 debt/regression。`req:status --all` 只扫描当前 checkout 人工构造的 namespace，真实 lifecycle writer 又把 worktree root 当作 main，因此公开的真实 worktree 聚合承诺没有 E2E 事实。

P1 要求状态口径收敛，并在真实 `git worktree` 中实现或撤下 `--all`。本 REQ 选择实现：定义共享 repository state semantics，修复 worktree identity/topology/event namespace，保持单写者与只报告冲突边界。

## 目标
- 建立 active/draft/suspended/completed/example 与 regression/debt 的共享状态语义。
- 让 session/status/health/doctor 对 blocked/suspended、模板/重复 invariant 和 audit baseline 输出一致事实。
- 让 lifecycle writer 使用真实 worktree identity，`status --all` 查询 `git worktree list` 并聚合每个 checkout 的本地事件。
- 用真实两个 linked worktree 完成 create/block/session/status/health/doctor E2E 与冲突验证。

## 非目标
- 不自动合并跨 worktree 状态、不允许同一 worktree 多 active REQ、不实现多人并发写。
- 不把 runtime events/progress 提交到 Git，不建立中心数据库或跨机器同步。
- 不修改 Hook risk/upgrade/CI/pilot，不重写 event schema 或完整 req-cli。
- 不消除 125 条历史审计债务或自动删除重复 invariant；只正确分类、排除计数并定位。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（状态 writer/reader/health/doctor/tests/docs 必须原子切换，否则会继续产生多口径）
- [x] 涉及模块/目录 ≤ 4？（state semantics、event/worktree、consumers、tests/docs）
- [x] 能否用一句话描述"解决了什么问题"？（让同一仓库和真实 worktree 状态在所有入口中含义一致）
- [x] 如果失败，能否干净回滚？（状态 schema 不迁移；恢复旧 namespace/聚合与展示即可）

## 范围
- 新增：`scripts/state-semantics.mjs`
- 修改：`scripts/worktree-utils.mjs`、`scripts/event-store.mjs`、`scripts/req-cli.mjs`、`scripts/session-start.js`
- 修改：`scripts/req-audit.mjs`、`scripts/governance-health.mjs`、`scripts/harness-doctor.mjs`、`scripts/capability-manifest.mjs`
- 修改：`requirements/REQ_TEMPLATE.md`、`requirements/in-progress/REQ-2026-901-suspended-example.md`、`README.md`、tests、manifest sync package 与交付物

### 约束（Scope Control，可选）

**豁免项**：
- [ ] skip-design-validation

**允许（CAN）**：
- 仅上述状态模块、消费者、测试、公开说明、派生 package 与 REQ 交付物。

**禁止（CANNOT）**：
- 不修改 upgrade/Hook policy/CI/pilot/用户 session 日志；不 commit/push/publish。
- 不自动合并、复制或删除其他 worktree 的业务/治理文件；聚合只读。

**边界条件**：
- `.claude/progress.txt` 是兼容缓存，当前 worktree events 是运行态事实；`requirements/INDEX.md` 是当前分支的可审阅全局索引，不作为跨 worktree runtime 聚合源。
- linked worktree state 仍物理保存在各 checkout 的 `.claude/worktrees/<identity>/`，`--all` 通过 Git topology 只读发现。
- blocked/suspended 不是 active；可与同 worktree 后续 active REQ 并存于 projection 的 suspended 列表。
- 旧错误写入 `main` namespace 的 linked-worktree event 只读兼容，不继续产生。

## 验收标准
- [x] shared state semantics 正确区分 active/draft/suspended/completed/examples；health/doctor 排除模板与重复 invariant 并定位 duplicate source/id。
- [x] req audit baseline 只比较 warning bucket；health 明确输出 regressions（error + over-baseline warning）与 known debt，不再用 legacy/current 代替。
- [x] blocked event 令 active=none 并进入 suspendedReqs；resume/completed 清除 suspended；status/session 文本与 JSON 一致。
- [x] lifecycle/session writer 在 main 与 linked checkout 写真实 identity namespace，不再把 linked worktree 写成 main。
- [x] `buildWorktreeProgressProjections` 通过 `git worktree list` 读取各 checkout 本地事件；`status --all` 展示 root/branch、active/suspended 与 duplicate conflict，保持只读。
- [x] 真实 worktree E2E 覆盖两个分支同 ID conflict、block 后 conflict 消失、默认 status 隔离、session 恢复、health/doctor suspended 口径和移除 worktree 后拓扑收敛。
- [x] legacy main namespace、非 Git simulated namespace、主仓库 progress fallback 与现有事件测试无回归。
- [x] 完整 tests、capability/docs/governance/doctor/pack 全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-095-design.md`
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-095-code-review.md`
- QA：`requirements/reports/REQ-2026-095-qa.md`
- Ship：`requirements/reports/REQ-2026-095-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 命令：syntax、event/governance/real-worktree tests、`npm test`、capability/docs/governance/doctor、pack。
- 环境：Node 20+、Git 支持 worktree、本地临时仓库，无网络。
- 人工：检查真实目录中的 namespace/progress/event，逐项对照 status/session/health/doctor JSON。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：重构是否完成？代码质量是否改善？
- [x] 旧功能保护：所有现有测试是否通过？行为是否一致？
- [x] 逻辑正确性：重构是否引入了隐含的行为变化？
- [x] 完整性：是否遗漏了需要同步修改的地方？
- [x] 可维护性：重构后的结构是否更清晰？

#### 对齐检查（record 阶段）
- [x] 目标对齐：预期行为变更仅限已设计的状态语义修正与真实 worktree 聚合，其余兼容路径保持。
- [x] 验收标准对齐：所有验收标准均有自动化或门禁证据。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：旧 main namespace 数据丢失；linked current reader 合并旧 main namespace作为兼容输入，但 writer 只写真实 identity。
- 风险：重复读取同一 event；source 以 checkout root + identity 去重，文件路径 Set 去重。
- 风险：worktree 已删除/损坏；Git topology 不再报告已移除项，单个 projection error 隔离并显式展示。
- 回滚：恢复 writer root namespace、当前 checkout 扫描和旧 health 计数；事件文件无需迁移或删除。

## 关键决策
- 2026-07-11：事件是 worktree-local runtime truth；INDEX 是 branch-local review truth；progress 是兼容缓存。
- 2026-07-11：blocked/suspended 从 active 集合移出，保留为独立 suspendedReqs。
- 2026-07-11：`--all` 查询真实 Git topology，只读聚合，不自动协调冲突。
- 2026-07-11：invariant health 以 template-excluded、source/id-deduplicated unique 数为准，重复项仍报告不删除。

<!-- Source file: REQ-2026-095-p1-state-semantics-real-worktree.md -->
