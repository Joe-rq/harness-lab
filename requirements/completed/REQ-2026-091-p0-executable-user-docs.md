# REQ-2026-091: P0 用户可执行文档与首个 REQ 向导

## 状态
- 当前状态：completed
- 当前阶段：ship

## 背景
全景评审的最后一组 P0 聚焦首次采用体验：纯中文标题无法生成 ASCII slug；`/first-req` 虽声称识别 Python/Go/Rust/Generic，却把 `package.json` 和 npm alias 当成唯一前提；bugfix/feature/refactor 模板预填本仓库 npm 命令；README 又把各 Hook 的 mode 行为简化成一套并不存在的全局语义。前序 REQ-089/090 已修复公开分发、fresh install 与路径门禁，本 REQ 只收口用户可执行文档和首个 REQ 契约。

## 目标
- 让纯中文或无 ASCII 字符标题可直接创建安全、稳定的 REQ 文件名，并严格校验显式 slug。
- 让 `/first-req` 和验证模板以项目真实入口/真实命令为准，覆盖无 package.json 的已安装项目。
- 将 README 的 profile/mode 说明改为能力与 Hook 风险点的真实矩阵，不承诺不存在的全局 allow/warn/block 语义。
- 用安装 fixture 执行 README 公布的首次采用与 REQ 生命周期命令，防止文档再次漂移。

## 非目标
- 不建立 P1 capability manifest 或统一 mode 状态机，不改变任何 Hook 的风险决策。
- 不新增 Python/Go/Rust 包管理器执行依赖，不猜测目标项目一定存在某个测试命令。
- 不重构 installer/doctor，不改 npm 发布入口、路径守卫或事件账本。
- 不执行 npm publish、Git commit、push 或外部项目安装。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（6 个实现/文档文件；CLI、向导、模板、测试策略、README 与真实安装 fixture 必须一起闭合，记录为单一用户旅程原子例外）
- [x] 涉及模块/目录 ≤ 4？（REQ 创建、首个向导、用户文档、契约测试）
- [x] 能否用一句话描述"解决了什么问题"？（让文档承诺的首个 REQ 流程在不同技术栈中真实可执行）
- [x] 如果失败，能否干净回滚？（无状态迁移；代码、模板、文档与 fixture 可整体回滚）

## 范围
- 涉及文件：
  - `scripts/req-cli.mjs`
  - `.agents/skills/source-command-first-req/SKILL.md`
  - `requirements/REQ_TEMPLATE.md`
  - `context/tech/testing-strategy.md`
  - `README.md`
  - `tests/governance.test.mjs`
- 涉及目录 / 模块：REQ create/experience 命名、首次向导、验证文档、安装后命令 fixture
- 影响接口 / 页面 / 脚本：`req:create --title/--slug`、`/first-req`、README；无 UI

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：仅上述 6 个实现/文档文件及本 REQ 的 design/review/QA/ship/experience 交付物。
- 可新增的测试 / 脚本：只在现有 `governance.test.mjs` 增加 CLI/文档/安装 fixture，不新增运行时脚本。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：installer、doctor、Hook、package manifest、event-store、其他 source-command skill 和用户 session/worktree 数据。
- 不可引入的依赖 / 操作：不得新增 transliteration 依赖；不得执行网络、publish、commit、push。

**边界条件**：
- 中文 slug：标题保留原文，文件名 fallback 必须为固定 ASCII safe slug；显式 slug 只接受小写 ASCII kebab-case，禁止路径字符。
- 技术栈：文档可以给多生态示例，但不得把示例冒充自动检测到的真实命令；无真实命令时明确记录缺口。
- mode：只描述当前各 Hook 的实际行为与安装 profile，不把分散实现包装成统一状态机。
- fixture：从真实候选 tarball 安装，在临时项目中执行公开入口；不得只做字符串存在断言。

## 验收标准
- [x] `req:create --title "修复登录问题"` 无需显式 slug 即成功，文件名为安全 ASCII fallback，标题保持中文；显式合法 slug 可用，路径/空白/非 kebab slug 被拒绝。
- [x] experience 文档对纯中文 REQ 标题也生成非空、安全、稳定的 ASCII 文件名。
- [x] `/first-req` 同时说明 npm alias 与直接 Node CLI 两种已安装入口；中文主题可直接创建；验证命令来自目标项目真实配置或由用户确认。
- [x] REQ 类型模板和 testing strategy 不再默认宣称 `npm test` 是任意目标项目的真实验证；提供 JavaScript/Python/Go/Rust/Generic 的条件示例与缺口规则。
- [x] README mode/profile 文案逐 Hook 如实描述现状，明确三档不是统一全局开关；不改变现有 Hook 行为。
- [x] README 的公开 npx、first create/start/status/block/resume/experience/reflect/align/complete/doctor 命令均由真实 tarball 安装 fixture 执行或通过同一公开入口等价执行。
- [x] 契约测试会在 README 命令缺参数、别名缺失、中文创建失败或重新出现硬编码 npm 验证时失败。
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor` 与 `npm pack --dry-run --json` 全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-091-design.md`
- 评审依据：`reviews/harness-lab-review-2026-07-10.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-091-code-review.md`
- QA：`requirements/reports/REQ-2026-091-qa.md`
- Ship：`requirements/reports/REQ-2026-091-ship.md`

## 验证计划
- 计划执行的命令：三个相关脚本语法检查；`node --test tests/governance.test.mjs`；`npm test`；`npm run docs:verify`；`npm run check:governance`；`npm run harness:doctor`；隔离 cache 的 `npm pack --dry-run --json --ignore-scripts`。
- 需要的环境：本仓库、Node.js 20+、npm、git；测试只使用系统临时目录与本地候选 tarball。
- 需要的人工验证：审阅 first-req 在 JS/非 JS 路径下是否可理解；逐项核对 mode/profile 表与 Hook 当前代码；审阅 README 最短路径是否仍清晰。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：中文 create/experience、技术栈中立、mode 事实与命令 fixture 均有直接证据。
- [x] 旧功能保护：英文/显式 slug、现有 lifecycle、installer 与 Hook 行为无回归。
- [x] 逻辑正确性：fallback 不可冲突或形成路径；示例与真实命令有明确边界。
- [x] 完整性：CLI、skill、模板、testing context、README、fixture 同步。
- [x] 可维护性：公开命令契约集中为可执行 fixture，P1 边界清楚。

#### 对齐检查（record 阶段）
- [x] 目标对齐：只完成评审中的“用户可执行文档”P0。
- [x] 设计对齐：实现遵循安全 fallback、真实命令优先、按 Hook 说明三项设计。
- [x] 验收标准对齐：每条验收都有命令、fixture 或人工审阅证据。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 三档 mode 继续由各 Hook 分散解释；README 只如实记录，不在本 REQ 建立 P1 状态机。退出条件：后续 P1 mode 风险矩阵落地并由表驱动测试替代文档矩阵。

## 风险与回滚
- 风险：fallback slug 过于通用降低文件可读性；REQ ID 已保证唯一，标题原文保留在正文/索引，优先保证零阻断和路径安全。
- 风险：文档 fixture 过度绑定展示格式；只锁定受支持公开命令与必要参数，不锁定无关段落排版。
- 风险：mode 说明变长；用最小矩阵区分基础 profile 与高级 Hook，避免抽象成错误的三行口号。
- 回滚方式：还原六个范围文件；无数据迁移和外部状态。

## 关键决策
- 2026-07-11：纯中文标题采用固定 `requirement` ASCII fallback，不引入拼音/transliteration 依赖；REQ ID 提供唯一性。
- 2026-07-11：显式 slug 使用严格 lowercase kebab-case 校验，不对危险输入做静默“修正”。
- 2026-07-11：验证命令只来自目标项目真实配置或人工确认；技术栈示例均标注条件，不自动冒充事实。
- 2026-07-11：mode 本轮只校正文档，不改变风险决策；统一状态机留在 P1。

<!-- Source file: REQ-2026-091-p0-executable-user-docs.md -->
