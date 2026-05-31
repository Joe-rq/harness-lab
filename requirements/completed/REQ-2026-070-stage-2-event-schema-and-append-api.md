# REQ-2026-070: Stage 2: event schema and append API

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：Stage 1 已完成独立 verifier，但当前治理状态仍主要依赖 `.claude/progress.txt` 这类单文件快照。多 session / 多 worktree 场景下，状态写入容易互相覆盖，后续也无法从事实记录重建 progress。
业务背景：本 REQ 是 `docs/plans/multi-agent-roadmap.md` Stage 2 的起点，覆盖 S2-CP1：定义事件 schema + append API。后续 S2-CP2 才接入 `session-start.js` / `req-cli.mjs` 等高频写入点，S2-CP3/S2-CP4 再把 `progress.txt` 降级为 projection cache。本 REQ 只先建立可追加、可读取、可验证的事件事实层。

## 目标
- 新建 `scripts/event-store.mjs`，提供事件 schema 校验、append API、读取与排序 API
- 采用单 writer 文件模型，把事件追加到 `.claude/events/session-<sessionId>.jsonl` 或指定 writer 文件
- 覆盖 append、schema 校验、坏事件拒绝、两个事件文件读取排序、append 性能 < 50ms 的测试
- 更新 Stage 2 路线图状态，标记 S2-CP1 的交付边界和 S2-CP2 的下一步

## 非目标
- 不替换 `.claude/progress.txt` 主真相源（S2-CP3/S2-CP4 范围）
- 不改 `session-start.js`、`req-cli.mjs` 的状态读写路径（S2-CP3/S2-CP4 范围）
- 不做 worktree-aware 聚合查询（S2-CP5/S2-CP6 范围）
- 不引入数据库、队列、后台服务或 npm 依赖

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [x] 涉及文件数 ≤ 4？（`scripts/event-store.mjs`、`tests/event-store.test.mjs`、`package.json`、`docs/plans/multi-agent-roadmap.md`）
- [x] 涉及模块/目录 ≤ 4？（scripts、tests、docs/plans、requirements）
- [x] 能否用一句话描述"解决了什么问题"？建立 Stage 2 的 append-only 事件事实层，为后续 progress projection 和 worktree 聚合提供输入。
- [x] 如果失败，能否干净回滚？可删除新脚本/测试并恢复 package/路线图

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`docs/plans/`、`requirements/`
- 影响接口 / 页面 / 脚本：新增 `scripts/event-store.mjs`；新增 `tests/event-store.test.mjs`；`package.json` test script 增加 event-store 测试

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/event-store.mjs`、`tests/event-store.test.mjs`、`package.json`、`docs/plans/multi-agent-roadmap.md`
- 可新增的测试 / 脚本：event-store 单元测试，必要的 fixture helper

**禁止（CANNOT）**：
- 不可修改 `scripts/session-start.js`、`scripts/req-cli.mjs`、`scripts/worktree-utils.mjs` 的行为
- 不可把 `progress.txt` 改为由事件流生成
- 不可写真实工作区 `.claude/events/` 作为测试产物；测试必须使用临时目录
- 不可引入新依赖

**边界条件**：
- 事件内容只记录治理事实，不记录完整聊天内容、prompt 或业务敏感正文
- 事件文件采用 JSONL；坏事件必须在写入前被拒绝
- S2-CP2 的高频写入点接入留给下一 REQ，以避免本 REQ 同时改动状态主链路

## 验收标准
- [x] `scripts/event-store.mjs` 导出事件 schema、`appendEvent`、`readEvents`、`validateEvent`
- [x] append 写入 JSONL 且自动补齐 `id`、`ts`、`sessionId`、`worktree`
- [x] 坏 schema 事件不会写入文件，并返回清晰错误
- [x] 两个独立事件文件可被读取、合并并按 `ts` / `id` 稳定排序
- [x] append 性能测试证明单次写入 < 50ms
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-070-design.md`（Feature 建议创建设计文档）
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.2-§5.3

## 报告链接
- Code Review：`requirements/reports/REQ-2026-070-code-review.md`
- QA：`requirements/reports/REQ-2026-070-qa.md`
- Ship：`requirements/reports/REQ-2026-070-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`node tests/event-store.test.mjs`、`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：人工核对事件样例未包含聊天正文或敏感大字段

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：event schema、append API、read API 和 validate API 均已实现。
- [x] 旧功能保护：未接入现有状态主链路，`npm test` 和治理检查通过。
- [x] 逻辑正确性：坏 schema 写入前拒绝，读取坏 JSON / 坏 schema 会报带文件行号的错误。
- [x] 完整性：覆盖单文件 append、多 writer 读取排序、性能阈值。
- [x] 可维护性：事件事实层独立在 `event-store.mjs`，后续 projection 可复用。

#### 对齐检查（record 阶段）
- [x] 目标对齐：为多 session / 多 worktree 状态投影建立 append-only 事实层。
- [x] 设计对齐：实现符合 `docs/plans/REQ-2026-070-design.md`。
- [x] 验收标准对齐：所有验收标准均已通过。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：事件 schema 过大导致后续 projection 难维护；append API 过早绑定 progress 语义导致 Stage 2 后续难拆分
- 回滚方式：`git revert` 或删除 `scripts/event-store.mjs` / `tests/event-store.test.mjs` 并恢复 package/路线图

## 关键决策
- 2026-05-31：Feature 型 REQ，建议创建设计文档
- 2026-05-31：本 REQ 只建立事件事实层，不接入 `progress.txt` projection；S2-CP3/S2-CP4 独立处理 projection
- 2026-05-31：S2-CP2 的高频写入点接入不混入本 REQ，下一步单独创建 REQ，避免事件事实层和状态主链路同时变更

<!-- Source file: REQ-2026-070-stage-2-event-schema-and-append-api.md -->
