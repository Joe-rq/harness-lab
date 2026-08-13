# REQ-2026-093: P1 Hook 风险策略矩阵与 profile-aware doctor

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
README 已在 P0 如实记录各 Hook 的 mode 差异，但实现仍在七个脚本中重复读取 `.claude/harness-mode` 并各自分支，无法保证 mode × hook 的长期一致性。doctor 也只按模板仓库的固定期望检查，默认安装、core-only、basic hooks 和源码高级 Hook 会产生误报；JSON 模式遇到 fail 仍可能返回 0。P1 要求建立表驱动风险策略、profile-aware doctor，并统一文本/JSON 退出语义。

## 目标
- 建立集中 Hook policy matrix，统一 mode 解析与八个风险点的 allow/warn/block/effect 决策。
- 让所有读取 mode 的 Hook 消费 policy，保留各事件协议适配与上下文文案。
- 让 installer 写入确定性 profile record，doctor 根据 record/legacy inference 只检查已安装能力。
- 统一 doctor 文本/JSON 结构、summary 和退出码，并用 profile × mode 表驱动 fixture 验证。

## 非目标
- 不改变 P0 的安全底线：REQ 无效、scope 越界、可写 review agent 始终阻断。
- 不在本 REQ 实现文件 ownership/升级备份；REQ-094 承接。
- 不实现通用 Hook 引擎或修改 Claude Hook 上游协议。
- 不调整状态账本/worktree/CI/pilot。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（策略必须替换七个消费者，并同步 manifest/installer/doctor/tests/README；拆分会造成行为双源，记录为架构原子例外）
- [x] 涉及模块/目录 ≤ 4？（policy、Hook adapters、profile/doctor、tests/docs）
- [x] 能否用一句话描述“解决了什么问题”？（让 mode 决策与 doctor 期望成为表驱动真实契约）
- [x] 如果失败，能否干净回滚？（profile record 无业务数据，策略与消费者可整体恢复）

## 范围
- 新增：`scripts/hook-policy.mjs`
- 修改：`scripts/capability-manifest.mjs`、`scripts/harness-install.mjs`、`scripts/harness-doctor.mjs`
- 修改 Hook：`scope-guard.mjs`、`deploy-guard.mjs`、`review-gatekeeper.mjs`、`risk-tracker.mjs`、`watchdog.mjs`、`stop-evaluator.mjs`、`precompact-notify.mjs`
- 修改：`tests/governance.test.mjs`、`README.md`、由 manifest sync 的 `package.json`
- 交付：本 REQ design/ADR/review/QA/ship/experience

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：仅上述文件和交付物。

**禁止（CANNOT）**：REQ CLI/event-store/upgrade/CI/用户 session 数据；不得新增依赖、publish、push。

**边界条件**：
- mode 仅允许 collaborative/supervised/autonomous；缺失或非法值运行时安全回退 collaborative，doctor 明确 warning。
- policy 返回中立 action/effect，不直接拼 Claude Hook JSON。
- profile record 必须确定性、无时间戳，重复安装同 profile 字节稳定；非法/旧版本可诊断。
- doctor 所有格式共享同一 result/summary；任一 fail 在 text/json 均非零。

## 验收标准
- [x] policy matrix 覆盖 req-invalid、scope-violation、deploy-dangerous、review-write-agent、risk-r3、watchdog-stagnant、stop-uncovered、precompact-snapshot 的 3 modes，schema 校验通过。
- [x] 七个 mode-aware Hook 不再本地读取/解释 mode，均消费 policy；既有安全底线与副作用行为保持或按 ADR 明确收敛。
- [x] capability manifest 声明 advanced-hooks module/overlay、policy 文件、doctor profile expectation；候选包包含高级 Hook 及依赖但默认不安装。
- [x] installer 对 core/default/custom + basic overlay 写 `.harness/profile.json`，重复安装确定性；profile record 纳入安装验证和报告。
- [x] doctor 优先读取 profile record，legacy/source 可解释推断；只检查所选 modules/overlays，缺失/多余能力可定位。
- [x] doctor text/json 共享 `{profile, summary, checks}` 事实，fail 均 exit 1，warn 不导致非零；非法 mode/profile record 有明确修复建议。
- [x] table-driven tests 覆盖 24 个 mode × risk point 决策、所有 Hook consumer 引用、core/default/basic/advanced/legacy doctor fixture 与 JSON 退出码。
- [x] 完整 tests、capability check、docs/governance、doctor、pack/fresh install 全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-093-design.md`
- ADR：`docs/plans/REQ-2026-093-hook-policy-adr.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-093-code-review.md`
- QA：`requirements/reports/REQ-2026-093-qa.md`
- Ship：`requirements/reports/REQ-2026-093-ship.md`

## 验证计划
- 命令：相关脚本语法、governance/完整 tests、capability check、docs/governance/doctor、pack。
- 环境：Node 20+、git/npm、临时 fixture，无网络。
- 人工：逐项对照 README、policy、Hook 输出；走读各 profile doctor 结果。

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
- 风险：集中 policy 与 Hook 协议耦合；通过中立 action/effect 分层。
- 风险：legacy 项目无 record；doctor 推断只用于诊断并标记 warning，不静默写入。
- 回滚：恢复七个脚本 mode 分支、doctor 固定检查并删除 profile record/policy。

## 关键决策
- 2026-07-11：集中决策、不集中协议输出。
- 2026-07-11：doctor profile record 优先，legacy inference 只读降级。
- 2026-07-11：高级 Hook 纳入发布能力但不进入默认安装。
- 2026-07-11：三种 mode 均生成 PreCompact 快照；仅 autonomous 增加审计事件，修正文档旧误述。
- 2026-07-11：选中能力缺失为 fail，record 外完整模块为 warn，二者共享统一退出语义。

<!-- Source file: REQ-2026-093-p1-hook-policy-profile-doctor.md -->
