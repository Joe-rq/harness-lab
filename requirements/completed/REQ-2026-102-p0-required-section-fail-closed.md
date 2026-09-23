# REQ-2026-102: P0 必需章节 fail-closed（缺章节/空章节一律拒绝启动）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

产品承诺（README「生命周期」段与 `AGENTS.md`）："空模板 REQ 既不能通过 PreToolUse，也不能执行 `req:start`"、"只有补齐真实背景、目标、验收标准后，REQ 才能通过 hook 与 `req:start`"。**当前实现做不到**——这是 2026-07-16 路线报告的 D2，两条路线都标记为必修。

根因（实测）：`scripts/req-validation.mjs:28-32` 的 `getSection()` 在标题不存在时返回**空字符串**，而占位符检查是"空串里是否包含占位词"——恒为 false，于是**缺章节的 REQ 一路绿灯**：

```
findReqTemplateIssues('# REQ: x\n\n## 目标\n- 真目标\n')   // 缺 背景 / 验收标准
→ []                                                        // 期望：两个 missing-section
```

另一处根因（本次实测撞到）：占位符检查是**子串匹配**，因此"正文里引用了占位符字面量"也会被判为"占位符未替换"——本 REQ 起草时在背景里引用模板占位句，`req:start` 直接拒绝（起草者不得不先把那行字面量改写成省略式才能启动）。这是同一天第四个"把文本当数据"的同族缺陷：占位符只在**行首**（去掉列表标记后）出现时才算未填，句中被引用不算。

同一漏检还有**第二份实现**：`scripts/req-check.js:119-136` 自己维护一套占位符正则，只查占位符、同样不查缺失；两份实现各自 fail-open，修一处不影响另一处。

路线报告的原始记录见 `docs/plans/2026-07-harness-lab-product-route-decision.md` D2："章节不存在时返回空字符串，但只检查空字符串是否包含已知占位词……与'背景、目标、验收标准未写实不能启动'的核心承诺相冲突。"

课程判据（L5）："放一个故意违规的样本，命令必须抓出来退非零"——本 REQ 的验收方式照此设计。

## 目标

- 必需章节（`## 背景` / `## 目标` / `## 验收标准`）的**缺失**与**空内容**一律判为问题，`req:start` 与 PreToolUse hook 都拒绝。
- 占位符判定改为**行首匹配**：占位符只在行首（去掉列表标记后）出现才算未填；正文里引用占位符字面量不再误报。
- 消除第二份实现：`req-check.js` 改为消费 `req-validation.mjs` 的 `findReqTemplateIssues()`，让两处门禁同源。
- 标题不被支持时（如英文 `## Background`）报"缺少必需章节"并给出期望标题，而不是静默放行。

## 非目标

- 不改 `req:audit` 的历史 REQ 判定与基线（125 warning 口径不变）。
- 不改设计文档校验（`validateDesignDocument` 的占位符表）。
- 不给必需章节增加新要求（不检查字数、不要求特定结构）——只判"有没有、是不是空的、是不是模板占位"。
- 不追溯修改历史 REQ；已完成的 REQ 不因新规则报错。

## 颗粒度自检

- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（4 个：`scripts/req-validation.mjs`、`scripts/req-check.js`、`tests/governance.test.mjs`、`README.md`——README 由 docs-sync 的 `governance-automation` 规则强制，且其生命周期段的承诺正是本 REQ 兑现的对象）
- [x] 涉及模块/目录 ≤ 4？（REQ 校验器、PreToolUse 门禁、门禁契约测试、公开说明）
- [x] 能否用一句话描述"解决了什么问题"？（让"必填章节没写就不能启动"这条承诺真正落地，并让两处门禁共用同一份判定）
- [x] 如果失败，能否干净回滚？（判定逻辑为纯函数新增分支 + 一处替换，`git revert` 即可；无数据迁移）

## 范围

- 涉及文件：
  - `scripts/req-validation.mjs`
  - `scripts/req-check.js`
  - `tests/governance.test.mjs`
  - `README.md`
  - （REQ 自身与报告/经验文档由 REQ-2026-100 的"约定交付物自动 allow"覆盖，不在此声明）
- 涉及目录 / 模块：REQ 内容校验、PreToolUse REQ 就绪判定、门禁契约测试、公开说明
- 影响接口 / 页面 / 脚本：`findReqTemplateIssues()` 的返回将新增 `missing-section` / `empty-section` 两种 code；`req:status` 的 readiness 与 `req:start` 的拒绝范围随之收紧；`req-check.js` 不再自带正则表

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（判据是 README/AGENTS 的既有承诺 + 路线报告 D2，设计即"关键决策"段）
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：`req-validation.mjs` 的 `findReqTemplateIssues` / `renderIssue` / `classifyValidationIssues`；`req-check.js` 的占位符检查替换为共享调用；`tests/governance.test.mjs` 新增用例与必要 fixture；README 生命周期段澄清
- 可新增的测试 / 脚本：本 REQ 新增测试用例（不加新测试文件）

**禁止（CANNOT）**：
- 不得放宽既有判定：占位符检查与 draft-status 检查的拦截范围只增不减
- 不得改动 `req-audit.mjs`、`governance-health.mjs`、`state-semantics.mjs`、事件账本与 capability manifest
- 不得要求历史 REQ 补章节（新规则只对"启动"与"写入"生效，不回溯）

**边界条件**：
- 证据规格：先给出修复前的实测输出（缺章节 REQ → `[]`），再给出修复后的（两条 `missing-section`），并附一次真实的 `req:start` 拒绝
- 兼容：CRLF 与 BOM 已由既有 `validateReqFile` 处理；章节判定沿用既有 `getSection` 语义，不引入新的 Markdown 解析

## 验收标准

- [x] 故意构造一份**缺 `## 目标`** 的 REQ（其余两节写实），`npm run req:start -- --id <该 REQ>` 必须拒绝并列出 `missing-section`（当前：放行）
- [x] 章节存在但内容为空（只有标题、或只有 HTML 注释）判为 `empty-section` 并拒绝
- [x] 章节只有模板占位符时，仍按既有 `template-placeholder` 拒绝（不因新逻辑而漏报或重复报）；"占位符打头、后面追加了括号说明"的那种行仍算未填（本 REQ 的验收用例里会写出该字面量——修复前它会挡住本 REQ 自身的写入）
- [x] 占位符**被引用**（出现在句中，如反引号包裹或在句子中间）不再误报——本 REQ 起草时正是被这条挡住；修复后原文引用占位符字面量的 REQ 必须能通过 `req:start`
- [x] 英文/非模板标题（如 `## Background`）被判为"缺少必需章节"并给出期望标题（当前：静默放行）
- [x] `req-check.js` 不再自带占位符正则表，改为调用 `findReqTemplateIssues()`；同一份缺章节 REQ 在 PreToolUse 下同样被拒
- [x] 既有判定不降强度：draft-status 检查、占位符检查、范围门禁的既有用例全部保持通过；`npm test`、`docs:verify`、`check:governance`、`harness:doctor` 全绿，`req:audit` 基线内无 delta

## 设计与实现链接
- 设计稿：不另建；设计内容即"关键决策"段
- 相关规范：`docs/plans/2026-07-harness-lab-product-route-decision.md` 的 D2；README「生命周期」段与 `AGENTS.md` PreToolUse 补充说明

## 报告链接
- Code Review：`requirements/reports/REQ-2026-102-code-review.md`
- QA：`requirements/reports/REQ-2026-102-qa.md`
- Ship：`requirements/reports/REQ-2026-102-ship.md`

## 验证计划
- 计划执行的命令：
  - `node -e "… findReqTemplateIssues(缺章节 REQ) …"`（修复前后各一次，留输出）
  - 真实 `npm run req:start -- --id <故意缺章节的 fixture REQ>`（期望：GOVERNANCE BLOCKED + missing-section）
  - `printf '{…}' | node scripts/req-check.js`（缺章节 REQ 活跃时，写非治理目录 → 期望阻断）
  - `node tests/governance.test.mjs`（新增用例：缺章节、空章节、英文标题、占位符并存、不含误伤）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`、`npm run req:audit`
- 需要的环境：macOS + Node ≥20；临时目录 fixture，不污染真实 REQ
- 需要的人工验证：确认没有把"写实但简短"的 REQ 误判为问题（例如只有一行的目标）

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：4 个目标全部达成——缺章节/空章节/非模板标题三类 fail-closed；占位符改行首匹配；`req-check` 与 `req:start` 共用同一份判定与渲染；双向证据齐备（缺章节样本被拒 + 含引用的本文档通过）。
- [x] 旧功能保护：governance 72→74（既有 72 项全通过，其中 `req validation detects template placeholders and draft status` 一度因归一化漏掉复选框而红，已修）；生命周期/worktree/tarball/slug 等 fixture 流程在恢复被误删的 `parseReqStatus` 后全部回归；`req:audit` 基线 125 无 delta。
- [x] 逻辑正确性：行首归一化对"占位符"与"正文行"两侧同规则；`getSection` 的空行贪婪 bug 在本 REQ 内一并修掉（否则空章节漏判）；`hasHeading` 独立判定避免把"标题在文件末尾"误报成缺章节。已知边界：设计文档占位符表仍独立（见债务）。
- [x] 完整性：7 项验收全部完成；两类同族问题在实施中发现并当场修掉，无半成品。
- [x] 可维护性：判定与渲染单点（`findReqTemplateIssues` / `formatReqIssue`），三处门禁（req:start、req:status readiness、PreToolUse）共享；请求方不再各自维护正则表。

#### 对齐检查（record 阶段）
- [x] 目标对齐：兑现的是 README 与 AGENTS.md 早已写下的承诺（"空模板 REQ 既不能通过 PreToolUse，也不能执行 req:start"），路线报告 D2 标记的必修项。
- [x] 设计对齐：无独立设计稿（已声明豁免）；实现与 5 条关键决策一致，其中"占位符行首匹配"为起草时被误拦后新增的决策，已记录背景与验证方式。
- [x] 验收标准对齐：逐条有实现与证据；"不降强度"由既有用例全通过 + 基线无 delta + 三个 fixture 流程回归共同保证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- **已关闭（无残留）**：实施中发现的同族问题已当场修掉——
  - `getSection()` 的 `\n+` 贪婪吃掉标题后的空行，导致"空章节"把下一个标题吞进正文；已改为标题后只吃一个换行。
  - `req-check.js` 的阻断消息（`printBlockMessage`）里还有第三份占位符正则表（同样子串匹配）；已改为渲染共享校验器的问题列表（新增导出 `formatReqIssue`）。
- **残留债务**：`validateDesignDocument` 的设计文档占位符表仍是独立实现（设计文档结构与 REQ 不同，未纳入本 REQ）。
  - 退出条件：出现"设计文档占位符误报/漏报"的实际案例时（例如正文引用设计占位符字面量被拦），按本 REQ 同一套"行首匹配 + 共享渲染"改造 `validateDesignDocument`；在此之前不为统一而统一。
  - 清理触发点：该误报在 `docs/plans/REQ-*-design.md` 的起草过程中复现一次即触发。

## 风险与回滚
- 风险：判定变严会挡住"想快速起草"的用法——缓解：`req:create` 生成的骨架本就带占位符，先填三节再 `req:start` 是既有流程；豁免项 `skip-req-validation` 的既有机制仍在（如需紧急跳过）
- 风险：fixture 受影响——缓解：实施后跑全量测试逐个核对，必要时只补 fixture 的缺失章节（不放松判定）
- 回滚方式：`git revert` 本 REQ 提交；无数据迁移、无外部副作用

## 关键决策
- 2026-09-23：**把"缺章节"与"空章节"做成两类 issue，而不是复用 `template-placeholder`**。理由：三者的修复动作不同（补标题 / 写内容 / 替换占位符），错误信息必须能指导动作；由 `renderIssue` 分别渲染。
- 2026-09-23：**`req-check.js` 改为消费共享校验器**。当前两处各有一份 fail-open 的占位符实现（`req-validation.mjs:42-53` 与 `req-check.js:119-136`），修一处不影响另一处——门禁判定必须单一来源。
- 2026-09-23：**不引入新 Markdown 解析**。复用既有 `getSection()` 语义，另加"标题是否存在"的独立判定（避免把"标题在文件末尾"误判成缺章节），保持零依赖与可预测性。
- 2026-09-23：**不回溯历史 REQ**。新判定只作用于启动与写入路径，`req:audit` 的历史口径与 125 warning 基线不变。
- 2026-09-23：**占位符判定从子串匹配改为行首匹配**。原实现用 `section.includes(placeholder)`，任何引用都会误报（本 REQ 起草时被挡）。新规则：把行首的列表标记去掉后，行内容**以占位符开头**才算未填——保留"`- 目标 1（补充）` 这类占位符打头、后面追加括号说明仍算未填"的严格性，同时让句中引用不再误报。这与今天另三处缺陷（豁免自举、CANNOT 路径、heredoc 正文）同族：**判定必须区分"内容"与"提及"**。
- 2026-09-23：**本条决策的验证方式**——修复前本 REQ 因引用占位符字面量而被 PreToolUse 阻断（起草时被迫改写三处措辞）；修复后同样的引用可以原样留在正文里，且 `req:start` 通过。同时用一份故意缺 `## 目标` 的样本验证反向：`req:start` 报 `missing required section: 目标` 并拒绝。

<!-- Source file: REQ-2026-102-p0-required-section-fail-closed.md -->
