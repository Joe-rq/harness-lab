# REQ-2026-073: Stage 2: worktree-aware event aggregation

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：S2-CP4 已让当前 worktree 能从事件流投影进度，但多 worktree 同时推进时，主仓仍缺少统一只读视图。用户需要看到每个 worktree 的活跃 REQ 和阶段，而不是把多个 worktree 写入同一个 `progress.txt` 或事件文件。
业务背景：本 REQ 对应路线图 S2-CP5 / S2-CP6：创建并实现 worktree-aware 事件聚合查询。它只聚合展示，不自动合并状态、不跨 worktree 写入同一个文件。

## 目标
- 在 `event-store.mjs` 中提供多 worktree projection 聚合 API
- 让 `req:status --all` 可展示每个 worktree 的活跃 REQ 和阶段
- 检测聚合中的冲突并以报告形式输出，不自动合并
- 补充测试、文档、路线图和经验沉淀

## 非目标
- 不实现跨 worktree 写锁或分布式事务
- 不自动合并多个 worktree 的状态
- 不修改 `req:status --id` 和默认 status 语义
- 不引入数据库、队列或后台服务

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？超出：事件库、REQ CLI、测试、文档和报告，均围绕 worktree 聚合查询
- [x] 涉及模块/目录 ≤ 4？（scripts、tests、docs、requirements）
- [x] 能否用一句话描述"解决了什么问题"？主仓可以只读查看多个 worktree 的事件投影状态。
- [x] 如果失败，能否干净回滚？可移除 `--all` 聚合分支并恢复 INDEX 读取

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- 影响接口 / 页面 / 脚本：`scripts/event-store.mjs`、`scripts/req-cli.mjs`、`tests/event-store.test.mjs`、`tests/governance.test.mjs`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/event-store.mjs`、`scripts/req-cli.mjs`、`tests/event-store.test.mjs`、`tests/governance.test.mjs`、`README.md`、`docs/plans/multi-agent-roadmap.md`
- 可新增的测试 / 脚本：可在现有测试文件中补 worktree aggregation fixture

**禁止（CANNOT）**：
- 不可改写不同 worktree 的事件文件
- 不可自动解决冲突或合并状态
- 不可引入新依赖
- 不可改变默认 `req:status` 和 `req:status --id` 语义

**边界条件**：
- 主仓只扫描 `.claude/events` 与 `.claude/worktrees/*/events`
- 每个 worktree 的 projection 独立构建，坏事件只影响该 worktree 的聚合结果
- 冲突只作为 `conflicts` 报告输出

## 验收标准
- [x] 两个 worktree 的事件文件可独立写入并被聚合读取，事件无数据丢失
- [x] `req:status --all` 文本模式展示每个 worktree 的 active REQ 和 phase
- [x] `req:status --all --json` 输出结构化 worktree projections 和 conflicts
- [x] 聚合冲突只报告，不自动合并状态
- [x] 测试覆盖多 worktree 聚合、坏事件隔离、无 worktree 回退
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-073-design.md`（Feature 建议创建设计文档）
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.5；`docs/plans/REQ-2026-072-design.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-073-code-review.md`
- QA：`requirements/reports/REQ-2026-073-qa.md`
- Ship：`requirements/reports/REQ-2026-073-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`node tests/event-store.test.mjs`、`node tests/governance.test.mjs`、`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：人工核对聚合输出只报告状态，不自动合并或改写其他 worktree

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：主仓可聚合多个 worktree projection。
- [x] 旧功能保护：默认 status、`--id` 和单 worktree projection 不受影响。
- [x] 逻辑正确性：冲突报告、坏事件隔离、排序和空状态处理清晰。
- [x] 完整性：文本和 JSON 模式均覆盖。
- [x] 可维护性：聚合 API 与单 worktree projection 分层清晰。

#### 对齐检查（record 阶段）
- [x] 目标对齐：解决多 worktree 状态只读聚合，不回到共享文件写入。
- [x] 设计对齐：实现符合 `docs/plans/REQ-2026-073-design.md`。
- [x] 验收标准对齐：所有验收标准均已满足。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：聚合输出误导用户以为已自动合并；坏事件阻断全局查询；`--all` 与原 INDEX 语义冲突
- 回滚方式：移除 `req:status --all` 聚合分支，恢复 INDEX 读取；保留单 worktree projection

## 关键决策
- 2026-05-31：Feature 型 REQ，建议创建设计文档
- 2026-05-31：S2-CP5（REQ 创建）与 S2-CP6（实现）由同一 REQ 承载，避免重复拆分 worktree 聚合能力
- 2026-05-31：聚合查询只读，不跨 worktree 写同一个事件文件

<!-- Source file: REQ-2026-073-stage-2-worktree-aware-event-aggregation.md -->
