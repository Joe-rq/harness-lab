# REQ-2026-071: Stage 2: event ledger high-frequency writers

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：REQ-2026-070 已建立事件 schema + append API，但还没有任何真实治理入口写事件。没有高频写入点，事件账本仍只是库代码，无法支撑后续 progress projection。
业务背景：本 REQ 对应 `docs/plans/multi-agent-roadmap.md` 的 S2-CP2：实现事件账本 MVP，接入 1-2 个高频写入点。接入后，Stage 2 才有真实事件流可供 S2-CP3/S2-CP4 投影。

## 目标
- `session-start.js` 在会话启动时追加 `session_started` 事件
- `req-cli.mjs` 在 REQ create/start/block/complete 时追加 lifecycle 事件
- `harness-install.mjs` 分发清单包含 `scripts/event-store.mjs`，避免目标项目缺依赖
- 测试覆盖 session-start 与 req-cli lifecycle 写入事件，验证不破坏现有行为

## 非目标
- 不实现 `progress.txt` projection（S2-CP3/S2-CP4 范围）
- 不实现跨 worktree 聚合查询（S2-CP5/S2-CP6 范围）
- 不让事件写入失败阻断现有 REQ 流程；S2-CP2 先采用 best-effort + warning
- 不记录聊天正文、prompt 或大块 artifact 内容

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？超出：需要修改 `session-start.js`、`req-cli.mjs`、`harness-install.mjs`、测试、设计和 README；全部围绕同一事件写入接入
- [x] 涉及模块/目录 ≤ 4？（scripts、tests、docs、requirements）
- [x] 能否用一句话描述"解决了什么问题"？让真实治理入口开始产生事件账本数据。
- [x] 如果失败，能否干净回滚？可移除 event-store 调用并恢复安装清单/测试

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- 影响接口 / 页面 / 脚本：`scripts/session-start.js`、`scripts/req-cli.mjs`、`scripts/harness-install.mjs`、`tests/governance.test.mjs`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/session-start.js`、`scripts/req-cli.mjs`、`scripts/harness-install.mjs`、`tests/governance.test.mjs`、`README.md`、`docs/plans/multi-agent-roadmap.md`
- 可新增的测试 / 脚本：必要时扩展 `tests/event-store.test.mjs` 或 `governance.test.mjs`

**禁止（CANNOT）**：
- 不可修改 `progress.txt` projection 逻辑
- 不可修改 `req:status` 输出语义
- 不可引入新依赖
- 不可让事件写入失败导致 session-start / req-cli 主流程失败

**边界条件**：
- 事件写入为 best-effort；失败只输出 warning
- 事件 payload 只允许小型治理事实，例如 req 文件名、title、phase、progressFound
- 测试必须使用临时目录，不写真实 `.claude/events/`

## 验收标准
- [x] `session-start.js` 成功追加 `session_started` 事件
- [x] `req-cli.mjs` create/start/block/complete 成功追加对应 REQ lifecycle 事件
- [x] 事件写入失败不会阻断 session-start / req-cli 主流程
- [x] `harness-install.mjs` 的 CLI / hook 分发清单包含 `scripts/event-store.mjs`
- [x] 测试覆盖新增写入点，并验证事件文件样例
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-071-design.md`（Feature 建议创建设计文档）
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.3；`docs/plans/REQ-2026-070-design.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-071-code-review.md`
- QA：`requirements/reports/REQ-2026-071-qa.md`
- Ship：`requirements/reports/REQ-2026-071-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：人工核对事件样例只包含治理事实，不包含聊天正文或 prompt

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：session-start 与 req-cli lifecycle 已写入事件账本。
- [x] 旧功能保护：事件写入 best-effort，测试证明原有 lifecycle 行为不变。
- [x] 逻辑正确性：事件 payload 只含小型治理事实，安装器同步复制依赖。
- [x] 完整性：覆盖 session_started、req_created、req_started、req_blocked、req_completed。
- [x] 可维护性：写入封装集中，后续 projection 可直接复用 event-store。

#### 对齐检查（record 阶段）
- [x] 目标对齐：真实治理入口开始产生事件流，为 progress projection 提供输入。
- [x] 设计对齐：实现符合 `docs/plans/REQ-2026-071-design.md`。
- [x] 验收标准对齐：所有验收标准均已满足。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：事件写入影响现有 CLI/hook；安装清单漏掉新依赖；事件 payload 过大或包含敏感内容
- 回滚方式：`git revert` 或移除 `appendEvent` 调用，保留 `event-store.mjs` API

## 关键决策
- 2026-05-31：Feature 型 REQ，建议创建设计文档
- 2026-05-31：事件写入采用 best-effort，不阻断现有治理流程；projection 阶段再决定是否提升为硬要求
- 2026-05-31：覆盖完整 req-cli lifecycle 事件，因为 create/start/block/complete 在同一边界内，拆分会造成重复封装

<!-- Source file: REQ-2026-071-stage-2-event-ledger-high-frequency-writers.md -->
