# REQ-2026-076: Stage 3 worktree namespace isolation and Stage 2 revalidation

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
REQ-2026-073 已实现 `req:status --all` 的 worktree-aware 聚合查询,但 2026-06-03 多角度推演发现 Stage 2 退出证据存在一个关键复现缺口:事件 schema 里有 `worktree` 字段,真实文件路径却仍主要按 `sessionId` 写入 `.claude/events/session-main.jsonl`。这意味着多 worktree 并行时容易把不同 worktree 的事件混进同一个文件,而 S2-CP5/S2-CP6 的退出确认无法在当前工作区稳定复现。

REQ-2026-075 已补齐 §7 指标所需事件 type / version / metrics。进入 S3-CP1 正式观察前,还需要把事件文件路径按 worktree 命名空间隔离,并重新验证 S2-CP5/S2-CP6 的多 worktree 聚合证据。

## 目标
- 写入隔离:让 `appendEvent` 的默认事件文件路径包含稳定 worktree namespace,避免不同 worktree 写入同一个 session 文件
- 读取兼容:保持 `readEvents` / `buildProgressProjection` / `buildWorktreeProgressProjections` 可读取 main + worktree namespace 下的历史和新事件
- 退出重验:复跑 S2-CP5/S2-CP6 退出验证,用真实 fixture 证明两个 worktree 的事件可独立写入、聚合读取、冲突只报告不合并
- 债务清理:清理 REQ-075 临时债务中 `payload.observation=true` 的过渡说明,明确 S3 观察期事件写入方式

## 非目标
- 不修改 verifier 三入口默认值或只读边界测试(REQ-077 处理)
- 不实现完整 Stage 3 任务图
- 不引入数据库、队列、锁服务或新 npm 依赖
- 不改变 `progress.txt` 作为缓存/回退的角色

## 颗粒度自检
- [x] 目标数 ≤ 4？(4)
- [x] 涉及文件数 ≤ 4？预计 4 个核心文件: `scripts/event-store.mjs`、`tests/event-store.test.mjs`、`docs/plans/REQ-2026-076-design.md`、REQ/报告
- [x] 涉及模块/目录 ≤ 4？`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- [x] 能否用一句话描述"解决了什么问题"？把 worktree 从事件字段提升到文件路径命名空间,让 Stage 2 多 worktree 聚合证据可复现。
- [x] 如果失败，能否干净回滚？可恢复 `getEventFilePath` 的旧路径策略,保留读端兼容不影响历史事件

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- 影响接口 / 页面 / 脚本：
  - `scripts/event-store.mjs`
  - `tests/event-store.test.mjs`
  - `node scripts/event-store.mjs read/stats`
  - `npm run req:status -- --all`

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/event-store.mjs`、`tests/event-store.test.mjs`、`docs/plans/REQ-2026-076-design.md`、`requirements/in-progress/REQ-2026-076-*.md`
- 可新增的测试 / 脚本：可在 `tests/event-store.test.mjs` 中新增 worktree namespace fixture;必要时新增 `requirements/reports/REQ-2026-076-*.md`

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/verifier-session.mjs`、`scripts/auto-review.mjs`、`scripts/auto-qa.mjs`(REQ-077 处理)
- 不可引入的依赖 / 操作：不得新增 npm 依赖;不得实现任务图 runtime;不得自动合并不同 worktree 状态

**边界条件**：
- 时间 / 环境 / 数据约束：必须兼容既有 `.claude/events/*.jsonl` 旧路径和 REQ-075 的 `.claude/events-archive/*.jsonl`
- 改动规模或发布边界：只调整 event-store 路径/读取/测试,不改用户交互入口的默认语义

## 验收标准
- [x] **AC-1**:`appendEvent` 默认写入路径包含 worktree namespace;同一 `sessionId` 在两个不同 worktree 下不会落到同一个 jsonl 文件
- [x] **AC-2**:main worktree 旧路径 `.claude/events/*.jsonl` 仍可读取,历史事件不丢失
- [x] **AC-3**:`readEvents` 可读取 namespaced events + archive events,并按 timestamp 稳定排序
- [x] **AC-4**:`buildWorktreeProgressProjections` 可聚合至少两个 worktree namespace 的独立 projection
- [x] **AC-5**:重复 active REQ 只输出 conflict 报告,不自动合并或改写任何事件文件
- [x] **AC-6**:S2-CP5/S2-CP6 退出验证重新执行并落盘到 QA:多 worktree 独立写入、聚合读取、冲突报告均 PASS
- [x] **AC-7**:REQ-075 临时债务中 `payload.observation=true` 的退出条件有明确处理记录;当前事件账本无该过渡事件,文档历史引用不阻塞
- [x] **AC-8**:`node tests/event-store.test.mjs`、`npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-076-design.md`
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.5 / §6.1;`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` F7

## 报告链接
- Code Review：`requirements/reports/REQ-2026-076-code-review.md`
- QA：`requirements/reports/REQ-2026-076-qa.md`
- Ship：`requirements/reports/REQ-2026-076-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `node tests/event-store.test.mjs`
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `npm run req:status -- --all`
  - `node scripts/event-store.mjs stats --metrics`
- 需要的环境：Node.js 18+,本仓库工作区
- 需要的人工验证：人工核对 QA 中 S2-CP5/S2-CP6 复跑证据是否覆盖两个 worktree namespace,且没有把不同 worktree 自动合并

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现:worktree namespace 已进入写入路径,并通过 S2 重验 fixture 证明聚合可复现
- [x] 旧功能保护:旧 `.claude/events/*.jsonl` 和 REQ-075 metrics 仍可读
- [x] 逻辑正确性:冲突检测只报告不写回
- [x] 完整性:main/worktree/archive/坏事件四类边界均覆盖
- [x] 可维护性:路径计算集中在 `getWorktreeNamespace` / `getWorktreeEventsDir` / `getEventFilePath`

#### 对齐检查（record 阶段）
- [x] 目标对齐:实现直接服务于"重新验证 Stage 2 退出证据"
- [x] 设计对齐:实现符合 `docs/plans/REQ-2026-076-design.md`
- [x] 验收标准对齐:AC-1~AC-8 均有实现与 QA 证据

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：
  - R-1:路径迁移导致旧事件读取不到
  - R-2:namespace 计算不稳定,同一 worktree 多次运行落到不同目录
  - R-3:`req:status --all` 输出变化误导用户以为状态已自动合并
- 回滚方式：
  - 恢复旧 `getEventFilePath` 策略
  - 保留新读端兼容逻辑以读取已经写出的 namespaced fixture
  - 回滚测试 fixture 和设计文档,REQ 标记 blocked 并说明未通过 S2 重验

## 关键决策
- 2026-06-03:用户决策选择"重新验证 Stage 2 退出确认",作为 REQ-076 硬要求
- 2026-06-04:由 `req:create` 自动生成骨架;本次整理工作区时写实 REQ,暂不进入实现

<!-- Source file: REQ-2026-076-stage-3-worktree-namespace-isolation-and-stage-2-revalidation.md -->
