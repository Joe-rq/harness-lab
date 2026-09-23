# REQ-2026-098: P0 状态交接单一真相源（投影与渲染契约）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

跨会话恢复是本产品的核心承诺，但当前交接链有三份状态源、零文档化权重，且启动渲染给出的信息是错的。2026-09-22 实测（本仓库，HEAD=fb91d4e）：

1. `scripts/session-start.js:194` 是 `const progress = projection || parseProgress(progressContent)`——事件投影存在时，人写的 `.claude/progress.txt` **整份被丢弃**。取证：启动输出打印 `Resolve blocker for REQ-2026-097`（事件模板 `event-store.mjs:515`），而文件第 22 行写的是 `Resolve blocked REQ: REQ-2026-097`；文件里 4 条 Next steps 与 2 条 Open questions（hook 实测清单、warnings=125、路线决策）在输出中出现 0 条。
2. `scripts/event-store.mjs:487` 对循环中**所有**事件覆盖 `lastUpdated`，无类型过滤。账本 150 条事件里 57 条是 `session_started`（38%）。输出显示 `Last updated: 2026-08-13`——最后一次开会话的日期，而真实工作停在 2026-07-12。字段名承诺"最后更新时间"。
3. `progress.summary` 经 `compactItems(items, limit = 8)` 后是**最近 8 条事件流水**，渲染标题却写 `Summary:`。于是 `Active REQ: REQ-2026-095 (implementation)` 与 `REQ completed: REQ-2026-095` 并排出现，读者被迫从流水里自行重建现状。
4. `phase` 一词两义：投影里 `idle` 表示"无活跃 REQ"，文件里 `blocked` 表示"项目被阻塞"，两者渲染成同一行 `Current phase:`。
5. `progress.blockers` 在投影中 5 处赋值（480/492/499/508/521）**无一处 push**，是死字段；`session-start.js:108` 的 `⚠️ Blockers` 分支永不触发。阻塞原因实际存在 `suspendedReqs[].reason` 里。
6. `session-start.js:141` 的正则 `/## 当前搁置 REQ\s*\n\s*- (.+)/s` 把列表第一项吞进捕获组，后续 `filter(l => l.startsWith('-'))` 因此丢掉首项——本仓库 INDEX 列了 097/096/901 三条，输出只打印 096 与 901。

课程对照（ch02「唯一真相源」）：**唯一**指冲突时只有一个说了算、**事先定死权重**，不是只许存一份；ch03「指针化引用」：引用给坐标、不搬运内容。当前实现两条都违反——权重只写在 `||` 里，语义没有任何一处文档化，因此三份源打架时无人察觉。

## 目标

- 用一段可执行的契约定死状态语义与真相源权重：事件账本是机器状态唯一真相源，`progress.txt` 降级为人的笔记且不再被丢弃。
- 修掉投影层的三处语义错误：`lastUpdated` 被会话打开污染、`summary` 标签与内容不符、`blockers` 死字段。
- 修掉渲染层两处缺陷：人写内容整份丢失、INDEX 搁置列表吞掉首项；并把输出分成「机器状态 / 最近事件 / 人的笔记」三区。

## 非目标

- 不改事件 schema、不做历史账本迁移（已写入的 57 条 `session_started` 保持原样，语义修正只作用于投影）。
- 不改 `requirements/INDEX.md` 的维护方式，不把 INDEX 改为生成物（活跃/搁置区仍由人维护）。
- 不改 `check-governance.mjs` 与 `tests/governance.test.mjs`——门禁参照升级属 REQ-2026-099（见"关键决策"），本 REQ 只保证投影侧产出可比对的数据。
- 不新增 hook、不改 Hook 策略矩阵、不动 worktree 聚合（`req:status --all`）语义。
- 不重写 `parseProgress` 为完整解析器：`progress.txt` 只按"原文照登"渲染，不再被结构化解析成状态。

## 颗粒度自检

- [x] 目标数 ≤ 4？（3 个目标：契约、投影语义、渲染三区）
- [ ] 涉及文件数 ≤ 4？（实施后为 5 个源码/文档：`scripts/event-store.mjs`、`scripts/session-start.js`、`tests/event-store.test.mjs`、`AGENTS.md`、`README.md`。第 5 个由 `scripts/docs-sync-rules.json` 的 `governance-automation` 规则强制——改 `tests/` 必须同步 `README.md` 或 `CONTRIBUTING.md`；README 第 308 行本就描述事件账本与 progress.txt 的关系，属真实需要更新的文档，不是为过门禁凑数）
- [x] 涉及模块/目录 ≤ 4？（scripts 投影、scripts 渲染、tests、根级治理文档）
- [x] 能否用一句话描述"解决了什么问题"？（让会话交接输出的每个字段都只有一个语义、且人写的意图不再被丢弃）
- [x] 如果失败，能否干净回滚？（四处改动彼此独立，`git revert` 单个提交即可；不涉及数据迁移）

## 范围

- 涉及文件：
  - `scripts/event-store.mjs`
  - `scripts/session-start.js`
  - `tests/event-store.test.mjs`
  - `AGENTS.md`
  - `README.md`（由 docs-sync 门禁要求，见"关键决策"）
  - `requirements/in-progress/REQ-2026-098-p0-state-handoff-single-truth-source.md`（本 REQ 自身：范围修订与关键决策记录）
  - `requirements/reports/REQ-2026-098-*.md`（三份交付报告）
  - `context/experience/REQ-2026-098-*.md`（完成前置的经验文档，需人工补齐沉淀要点）
  - `.claude/.req-exempt`（范围修订所需的临时豁免，用完即删）
- 涉及目录 / 模块：状态投影（event-store）、会话启动渲染（session-start）、契约测试、治理契约文档
- 影响接口 / 页面 / 脚本：SessionStart hook 的输出格式（新增"最近事件/人的笔记"两区、`lastUpdated` 取值变化）、`buildProgressProjection()` 返回结构（`blockers` 字段移除）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（契约即设计：四个字段的语义与渲染分区已在"关键决策"中定死；另写 `docs/plans/REQ-2026-098-design.md` 会制造第二份真相，与本 REQ 要修的问题同源）

**允许（CAN）**：
- 可修改的文件 / 模块：上述四个文件；`buildProgressProjection` 返回结构及其在 `session-start.js` 内的消费点
- 可新增的测试 / 脚本：`tests/event-store.test.mjs` 内新增用例；可新增测试用 fixture 目录

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/check-governance.mjs`、`tests/governance.test.mjs`、`scripts/req-cli.mjs`、`requirements/INDEX.md`、事件 schema
- 不可引入的依赖 / 操作：不引入第三方依赖；不 commit/push 事件账本的历史重写；不删除或改写既有事件行

**边界条件**：
- 时间 / 环境 / 数据约束：Node ≥20，零依赖；测试为 `node:test`，与现有 `npm test` 串联执行
- 改动规模或发布边界：仅模板仓库自身；对已安装的消费方（其他项目）属行为变更，须在 ship 报告注明 `lastUpdated` 语义变化

## 验收标准

- [x] `lastUpdated` 只由 `req_*` 事件更新：给同一 fixture 灌入 `req_started(2026-07-10)` + `session_started(2026-08-13)`，投影结果必须是 `2026-07-10`
- [x] 投影返回的最近事件带计数元信息（总量 + 窗口大小），渲染标签为「最近事件」而非 `Summary`；现状字段（activeReq/phase/lastUpdated/suspendedReqs）与事件流水在结构中分离 —— **第 2 条的分离落在渲染层与契约层，未改返回结构**（结构嵌套会破坏范围外消费者 `req-cli.mjs` 与 `req-status-json.test.mjs`），取舍记于"关键决策"
- [x] `blockers` 死字段移除：投影不再返回该字段，`session-start.js` 不再引用它；搁置原因由 `suspendedReqs[].reason` 单独承载（单测断言输出含 reason）
- [x] 渲染新增「人的笔记」区，`progress.txt` 原文照登（不做结构化改写）；本仓库实跑时，文件内 4 条 Next steps 与 2 条 Open questions 逐条出现在该区
- [x] INDEX 的「当前搁置 REQ」列表渲染不丢项：给定 3 条搁置项，输出必须含 3 条（复现当前吞掉首项的缺陷）
- [x] `AGENTS.md` 含状态语义契约段（真相源权重、`lastUpdated`/`phase` 定义、三区渲染约定）；`npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor` 全绿

## 设计与实现链接
- 设计稿：按"范围 → 豁免项"说明，设计即本 REQ 的"关键决策"段，不另建设计文档
- 相关规范：`docs/plans/2026-07-harness-lab-product-route-decision.md`（D4 状态真相冲突、P07）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-098-code-review.md`
- QA：`requirements/reports/REQ-2026-098-qa.md`
- Ship：`requirements/reports/REQ-2026-098-ship.md`

## 验证计划
- 计划执行的命令：
  - `node tests/event-store.test.mjs`（新增用例，先红后绿）
  - `node scripts/session-start.js`（本仓库实跑，核对三区输出与 `progress.txt` 逐条对应）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`
- 需要的环境：macOS + Node ≥20（本机），零第三方依赖
- 需要的人工验证：用户核对 SessionStart 输出不再出现自相矛盾行（`idle` vs `blocked`、`Active REQ: 095` 与 `completed 095` 并排），且"人的笔记"区能看到 hook 实测清单等只有人知道的事项

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：3 个目标全部达成——契约进 `AGENTS.md`/README，投影语义单义化，渲染三区落地；核心场景在本仓库实跑通过，4 处缺陷各有复现测试。
- [x] 旧功能保护：event-store 既有 21 项测试全通过（其中 2 项仅因字段删除而更新断言，语义未弱化）；`req:status` 消费的投影字段名未变；session-start 在"无 progress.txt / 无事件 / 非 git 目录"三种边界下与既有测试断言一致。
- [x] 逻辑正确性：会话事件排除集覆盖 `session_started`/`session_ended`；INDEX 改为逐行扫描，不再依赖捕获组；`isEmptyIndexItem` 同时处理 `- 无` 与反引号包裹的 `- 无`。已知边界：章节项若不用 `- ` 前缀（如 `* `）不识别，与既有行为一致，无回归。
- [x] 完整性：6 项验收全部有实现与测试；`parseProgress` 孤儿已清理；未做项（结构嵌套、`updateProgress` 合一、legacy 事件 WARN 噪声）均已显式登记，无半成品。
- [x] 可维护性：渲染拆为三个职责单一的 print 函数；语义契约集中在 `AGENTS.md` 一段；README 与实现同步。

#### 对齐检查（record 阶段）
- [x] 目标对齐：直接服务于"跨会话恢复不得给出错误下一步"这一核心承诺；修的是投影语义与可见性，不是新增能力。
- [x] 设计对齐：无独立设计稿（`skip-design-validation` 已声明）；实现与五条关键决策一致，其中两条为实施中偏离并已记入决策——`lastUpdated` 口径细化为"排除会话事件"（而非字面 `req_*` 白名单）、范围扩展 README.md（docs-sync 门禁要求）。
- [x] 验收标准对齐：逐条对应实现与证据；第 2 条的"结构分离"改在渲染层与契约层达成，理由（破坏范围外消费者）已记入关键决策、QA 报告与 code-review。


## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- 实施期使用了一次 `.claude/.req-exempt` 临时豁免以修订本 REQ 范围，**完成后已删除**（见"关键决策"与 QA 报告）。
- 观察项（不属本 REQ 交付）：`updateProgress()`（`scripts/req-cli.mjs:401-442`）会独立计算 activeReq/phase/lastUpdated 并改写 `progress.txt` 头部，与 `buildProgressProjection()` 构成同一事实的两处计算。当前渲染已不解析该文件，漂移不再影响交接输出，但两处计算本身仍是隐患。退出条件：由 REQ-2026-099 或新 REQ 决定——要么让 `updateProgress` 从投影取值，要么删除其机器头部。

## 风险与回滚
- 风险：`progress.txt` 停止参与状态判定后，若其内容长期不更新，"人的笔记"区会展示过期信息——缓解：渲染时标注该区的文件 mtime，由人判断新鲜度
- 风险：消费方（已安装 harness 的其他项目）依赖 `progress.summary` 或 `blockers` 字段——缓解：`blockers` 为死字段无消费方；`summary` 保留原字段名与内容，仅改渲染标签，ship 报告记录变更
- 回滚方式：`git revert` 本 REQ 的提交；无数据迁移、无 schema 变更、无外部副作用

## 关键决策
- 2026-09-22：**真相源定死为事件账本**。`progress.txt` 降级为"人的笔记"，不再参与状态判定，也不再被 `parseProgress` 结构化解析（改原文照登）。依据：课程 ch02「唯一真相源=冲突时只有一个说了算，事先定死权重」，且当前权重只存在于 `session-start.js:194` 的 `||` 表达式里。
- 2026-09-22：**`phase` 只有一个语义**——"当前活跃 REQ 的阶段"，无活跃 REQ 即 `idle`；"被阻塞"由 suspended 集合表达，不复用 `phase` 字段。`progress.txt` 的 `Current phase:` 行不再影响渲染。
- 2026-09-22：**删 `blockers` 字段而非填它**。理由是它与 `suspendedReqs[].reason` 承载同一事实，填充等于制造第二份真相；渲染层同步删除 `⚠️ Blockers` 分支。
- 2026-09-22：**门禁参照升级拆到 REQ-2026-099**（`check-governance.mjs` + `tests/governance.test.mjs`：把"投影 active+suspended ↔ INDEX 活跃/搁置"一致性做成会失败的检查）。依据：4 实体规则下本 REQ 已达 4 文件上限；且门禁依赖本 REQ 产出的投影数据，顺序上必须后置。
- 2026-09-22：**不写独立设计文档**（skip-design-validation）。设计内容即上列四条决策；另建 `docs/plans/` 副本与本 REQ 要修的"第二份真相"问题同源。
- 2026-09-22：**`lastUpdated` 的语义细化为"只由工作事件推进"**（排除 `session_started` / `session_ended`），而非字面的"只由 `req_*` 事件更新"。依据：`conflict_detected`、`human_decision_made`、`verifier_*` 等事件同样是进展，把它们排除会让该字段漏报真实工作。验收标准中的用例（`req_started` + `session_started`）两种实现都通过，此处记录实际采用的口径。
- 2026-09-23：**范围扩展 README.md**。触发原因：`docs:verify` 的 `governance-automation` 规则要求 `tests/` 变更必须同步 `README.md` 或 `CONTRIBUTING.md`。选择 README 而非 CONTRIBUTING，因为 README:308 已描述事件账本 / progress projection / `progress.txt` 的关系，本次语义变更正落在该段。
- 2026-09-23：**为修订范围使用了一次临时豁免**（`.claude/.req-exempt`，由用户手工创建）。原因：`scope-guard.mjs:352` 以该文件存在作为豁免开关，但创建该文件本身要过同一条 scope 检查，而本 REQ 初始范围未含 `.claude/` → 自举死锁。**这是治理缺陷，不属于本 REQ 的交付**，已在"临时实现与债务"登记，建议在 REQ-2026-099 或新 REQ 修复：豁免文件写入应免于 scope 检查，或 REQ 自身与 `requirements/reports/**` 按约定自动 allow。
- 2026-09-23：**投影返回结构不做嵌套拆分**。验收标准第 2 条的"结构分离"在渲染层与契约层达成（「机器状态」区不再含流水，语义写入 `AGENTS.md`）；改返回结构会连带修改 `req-cli.mjs` 与 `req-status-json.test.mjs`，两者都在本 REQ 的 CANNOT 列表中，且属于"为形式付出破坏性改动"。

<!-- Source file: REQ-2026-098-p0-state-handoff-single-truth-source.md -->
