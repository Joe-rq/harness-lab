# REQ-2026-077: verifier defaults alignment and read-only boundary tests

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` 将 verifier 三入口默认值分裂列为 F1 CRITICAL:

- `scripts/verifier-session.mjs` 默认 `subagent`
- `scripts/auto-review.mjs` 默认 `legacy`
- `scripts/auto-qa.mjs` 默认 `legacy`

路线图 §4.5 已写明 `HARNESS_VERIFIER_MODE=legacy|envelope|subagent`,且用户已决策 S3-CP1 观察期采用 `envelope` 默认。当前实现没有真正支持 `envelope` 默认,导致观察期会继续测 legacy 或在直接 runner 中默认触发外部 subagent 调用,数据不可解释。

同时,多角度推演 F2 指出 verifier 只读边界缺少可重复的端到端绕过测试。REQ-066 有历史手工证据,但 077 需要把边界做成仓库内可自动验证的回归:默认 envelope 只生成待独立 verifier 消费的包,不得写入源码、不得执行验证命令、不得启动外部 `claude`。

## 目标
- 统一 `verifier-session.mjs`、`auto-review.mjs`、`auto-qa.mjs` 三入口的 `HARNESS_VERIFIER_MODE` 解析与默认值,全局默认改为 `envelope`。
- 将 `envelope` 模式做成真实行为:生成只读 verifier handoff package,不执行 legacy review/QA,不启动 subagent。
- 为三入口默认值、非法模式、legacy fallback、subagent 显式路径和 envelope 只读边界补自动化测试。
- 更新维护者文档和经验沉淀,让后续 S3-CP1 观察数据可解释。

## 非目标
- 不真实调用外部 Claude CLI;`subagent` 路径只验证显式分支和参数传递,不外发私有仓库上下文。
- 不实现完整任务图、fixer 派生、background agent runtime 或跨 worktree verifier 调度。
- 不改变 `.claude/agents/verifier.md` 的工具白名单语义,除非测试发现文档与实际 helper 需要名称同步。
- 不改 Stage 3 §7 评估表口径或 event-store schema;这些已由 REQ-075 处理。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？否;需要新增 helper、改三入口、补测试和文档,但都围绕一个默认值与只读边界问题。
- [x] 涉及模块/目录 ≤ 4？
- [x] 能否用一句话描述"解决了什么问题"？让 verifier 三个入口默认测同一套 envelope 只读协议,避免 S3-CP1 观察期继续采到 legacy/subagent 混杂数据。
- [x] 如果失败，能否干净回滚？

## 范围
- 涉及文件：
  - `scripts/verifier-mode.mjs`
  - `scripts/verifier-session.mjs`
  - `scripts/auto-review.mjs`
  - `scripts/auto-qa.mjs`
  - `tests/governance.test.mjs`
  - `CONTRIBUTING.md`
  - `docs/plans/REQ-2026-077-design.md`
  - `requirements/reports/REQ-2026-077-*.md`
  - `context/experience/REQ-2026-077-*.md`
- 涉及目录 / 模块：`scripts/`, `tests/`, `docs/plans/`, `requirements/`, `context/experience/`
- 影响接口 / 页面 / 脚本：`HARNESS_VERIFIER_MODE`, `node scripts/verifier-session.mjs`, `node scripts/auto-review.mjs`, `node scripts/auto-qa.mjs`, `npm test`

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：上述范围内 verifier 入口、测试、维护者文档、REQ 交付物。
- 可新增的测试 / 脚本：新增 `scripts/verifier-mode.mjs` 作为模式解析 helper;测试优先放入现有 `tests/governance.test.mjs`。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/req-cli.mjs`、`docs/plans/REQ-2026-075-*`, `docs/plans/REQ-2026-076-*`。
- 不可引入的依赖 / 操作：不得新增 npm dependency;不得默认执行 `claude`;不得为测试访问网络或外部 API。

**边界条件**：
- 时间 / 环境 / 数据约束：当前日期 2026-06-04;外部 Claude CLI 复测需要用户另行明确授权,本 REQ 不做外发。
- 改动规模或发布边界：只修 verifier 模式与只读 envelope 行为,不推进任务图。

## 验收标准
- [x] AC-1:三个入口在未设置 `HARNESS_VERIFIER_MODE` 时解析为同一个默认值 `envelope`。
- [x] AC-2:`HARNESS_VERIFIER_MODE=legacy|envelope|subagent` 三种合法模式均被识别;非法值在三个入口给出清晰错误并非静默 fallback。
- [x] AC-3:`envelope` 模式生成 verifier handoff package,内容只包含 REQ ID、check type、artifact 路径、rootDir、只读工具边界和 prompt;不执行 legacy review/QA 命令、不启动 `claude`。
- [x] AC-4:`auto-review.mjs` / `auto-qa.mjs` 在 `legacy` 模式下保持原有本地报告生成与 QA 命令执行能力。
- [x] AC-5:`subagent` 模式仍显式委托 `verifier-session.mjs` 且传递 `HARNESS_VERIFIER_MODE=subagent`。
- [x] AC-6:自动化测试覆盖默认值对齐、非法模式、envelope 只读边界、legacy fallback;核心验证命令通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-077-design.md`
- 相关规范：`docs/plans/multi-agent-roadmap.md` §4.5;`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` F1/F2;`requirements/completed/REQ-2026-066-stage-1-verifier-session-schema.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-077-code-review.md`
- QA：`requirements/reports/REQ-2026-077-qa.md`
- Ship：不适用;本 REQ 未执行发布或版本切换。

## 验证计划
- 计划执行的命令：
  - `node --check scripts/verifier-mode.mjs`
  - `node --check scripts/verifier-session.mjs`
  - `node --check scripts/auto-review.mjs`
  - `node --check scripts/auto-qa.mjs`
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/req-audit.mjs --id REQ-2026-077 --verbose`
- 需要的环境：本仓库本地 Node.js;无需网络。
- 需要的人工验证：核对 envelope package 不包含源码内容或 worker 推理过程,且报告明确其不是 subagent pass 结论。

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
- 风险：默认从 legacy 变为 envelope 后,维护者若习惯 `auto-review` 直接产出最终审查报告,会看到待独立验证包而非 pass/fail 报告。
- 回滚方式：回退 `scripts/verifier-mode.mjs` 与三入口调用改动,或临时设置 `HARNESS_VERIFIER_MODE=legacy` 恢复旧行为。

## 关键决策
- 2026-06-04：由 `req:create` 自动生成骨架。
- 2026-06-04：采用用户已决策的 `envelope` 作为三入口统一默认;`subagent` 保持显式 opt-in,避免默认外发。
- 2026-06-04：新增中心 helper 而非在三入口各自改字符串,因为本 REQ 的根因就是默认值漂移。

<!-- Source file: REQ-2026-077-verifier-defaults-readonly-boundary.md -->
