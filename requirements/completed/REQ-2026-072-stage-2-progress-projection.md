# REQ-2026-072: Stage 2: progress projection

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：Stage 2 已经有事件 schema、append API 和真实写入点，但 `progress.txt` 仍是主真相源。多 session / 多 worktree 场景下，直接改同一个 `progress.txt` 仍会产生冲突，事件账本的价值也无法体现。
业务背景：本 REQ 对应路线图 S2-CP3 / S2-CP4：创建并实现 `progress.txt` projection，让当前活跃 REQ、阶段、摘要和下一步可由事件流重建，`progress.txt` 降级为缓存输出。

## 目标
- 在 `event-store.mjs` 中提供 progress projection API
- 让 `session-start.js` 优先读取 projection，失败或无事件时回退 `progress.txt`
- 让 `req:status` 默认模式优先展示 projection 结果，`--id` / `--all` 语义保持不变
- 补充 projection 测试、文档和路线图状态

## 非目标
- 不实现跨 worktree 聚合查询（S2-CP5/S2-CP6 范围）
- 不删除 `progress.txt`；本阶段只把它降级为缓存/回退输入
- 不引入事件溯源框架或外部依赖
- 不改变 REQ create/start/block/complete 的主流程语义

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？超出：需要修改事件库、session-start、req-cli、测试和文档，全部围绕 progress projection
- [x] 涉及模块/目录 ≤ 4？（scripts、tests、docs、requirements）
- [x] 能否用一句话描述"解决了什么问题"？让当前进度可从事件账本投影重建，减少 `progress.txt` 单点冲突。
- [x] 如果失败，能否干净回滚？可回退到直接读取 `progress.txt`，保留事件写入能力

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- 影响接口 / 页面 / 脚本：`scripts/event-store.mjs`、`scripts/session-start.js`、`scripts/req-cli.mjs`、`tests/event-store.test.mjs`、`tests/governance.test.mjs`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/session-start.js`、`scripts/req-cli.mjs`、`tests/event-store.test.mjs`、`tests/governance.test.mjs`、`README.md`、`docs/plans/multi-agent-roadmap.md`
- 可新增的测试 / 脚本：可在现有测试文件中补 projection fixture；必要时新增 `tests/progress-projection.test.mjs`

**禁止（CANNOT）**：
- 不可实现 worktree 聚合查询
- 不可删除或重命名 `.claude/progress.txt`
- 不可修改 `req:status --id` 的查询语义
- 不可引入新依赖

**边界条件**：
- projection 只消费当前 worktree 事件目录
- 缺失事件或坏事件时，用户可继续通过 `progress.txt` 回退工作
- projection 输出必须只包含治理状态，不包含聊天正文、prompt 或大块 artifact

## 验收标准
- [x] 删除或缺失 `progress.txt` 时，存在事件流即可重建当前活跃 REQ、阶段、摘要和下一步
- [x] `session-start.js` 优先展示 projection，并在无 projection 时回退 `progress.txt`
- [x] `req:status` 默认模式优先使用 projection；`--id` / `--all` 保持现有行为
- [x] projection 与 `requirements/INDEX.md`、`progress.txt` 缓存不冲突
- [x] 测试覆盖正常投影、无事件回退、坏事件回退或报错边界
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-072-design.md`（Feature 建议创建设计文档）
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.4；`docs/plans/REQ-2026-070-design.md`；`docs/plans/REQ-2026-071-design.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-072-code-review.md`
- QA：`requirements/reports/REQ-2026-072-qa.md`
- Ship：`requirements/reports/REQ-2026-072-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`node tests/event-store.test.mjs`、`node tests/governance.test.mjs`、`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：人工核对 projection 输出只含治理状态，不含聊天正文或 prompt

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：projection 可从事件流重建当前进度。
- [x] 旧功能保护：`progress.txt` 回退、`req:status --id`、`req:status --all` 保持可用。
- [x] 逻辑正确性：事件排序、缺失事件、坏事件边界处理清晰。
- [x] 完整性：session-start 与 req:status 两个读取入口均接入。
- [x] 可维护性：projection API 集中在事件库，调用方不重复解释事件。

#### 对齐检查（record 阶段）
- [x] 目标对齐：`progress.txt` 不再是唯一状态来源。
- [x] 设计对齐：实现符合 `docs/plans/REQ-2026-072-design.md`。
- [x] 验收标准对齐：所有验收标准均已满足。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：projection 与缓存状态不一致；坏事件导致 session-start 或 req:status 不可用；过早改变 `--all` 语义
- 回滚方式：移除 projection 调用，恢复读取 `progress.txt`；保留事件账本写入不受影响

## 关键决策
- 2026-05-31：Feature 型 REQ，建议创建设计文档
- 2026-05-31：S2-CP3（REQ 创建）与 S2-CP4（实现）由同一 REQ 承载，避免为同一 projection 能力重复拆分
- 2026-05-31：本 REQ 不做跨 worktree 聚合，只处理当前 worktree 事件投影

<!-- Source file: REQ-2026-072-stage-2-progress-projection.md -->
