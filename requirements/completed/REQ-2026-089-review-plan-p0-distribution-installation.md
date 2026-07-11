# REQ-2026-089: P0 公开分发与安装闭环

## 状态
- 当前状态：completed
- 当前阶段：ship

## 背景
2026-07-10 全景评审确认：README 公布的 `npx harness-install` 与 npm 包名不一致；当前 `npm pack --dry-run` 候选包包含会话日志、事件账本和本机绝对路径；默认安装后的 npm scripts 与已分发 skills/README 不闭合；重跑安装器会覆盖 `.claude/progress.txt`；复制或安装后验证失败仍可能输出“安装完成”。

这些缺陷集中在用户从“获取包”到“完成首次安装”的同一信任链，直接影响首次采用、状态安全和发布隐私。用户已要求执行评审报告中的全部 P0/P1/P2，本 REQ 是顺序整改计划的第一批。

## 目标
- 建立可执行且文档一致的 npm 获取入口，并将发布包限制为明确的分发资产。
- 让默认安装产物具备 README 与 source-command skills 依赖的完整命令、脚本和 context 索引。
- 让重复安装保留现有 progress/settings；任何复制或验证失败都以非零状态和 partial/failed 报告结束。
- 用安装 fixture 与 tarball smoke test 证明公开分发和 fresh-install 契约。

## 非目标
- 本 REQ 不修改 `req-check`、`scope-guard` 或 Bash 写目标解析；由后续门禁 REQ 完成。
- 本 REQ 不实现 capability manifest、profile-aware doctor 或受管文件升级；由 P1 REQ 完成。
- 本 REQ 不修改事件/worktree 投影、团队并发或 agent 适配。
- 本 REQ 不执行 npm publish、Git commit 或远端推送。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（共有 6 个实现文件；README、Claude command、source skill 是同一公开入口契约，拆开会继续向用户分发错误命令，因此作为一次有记录的原子例外）
- [x] 涉及模块/目录 ≤ 4？（发布元数据、安装器、测试、用户文档）
- [x] 能否用一句话描述“解决了什么问题”？（公开分发与安装结果不可信）
- [x] 如果失败，能否干净回滚？（四个实现文件可独立回滚，不迁移现有仓库状态）

## 范围
- 涉及文件：
  - `package.json`
  - `scripts/harness-install.mjs`
  - `tests/governance.test.mjs`
  - `README.md`
  - `.claude/commands/harness-setup.md`
  - `.agents/skills/source-command-harness-setup/SKILL.md`
- 涉及目录 / 模块：npm 发布元数据、安装器、安装 fixture、快速开始文档
- 影响接口 / 页面 / 脚本：`harness-install` CLI、目标项目 `package.json` scripts、npm tarball 内容

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：仅上述六个实现文件，以及本 REQ 的设计、review、QA、ship、experience 交付物。
- 可新增的测试 / 脚本：只允许在 `tests/governance.test.mjs` 增加 tarball、fresh-install、重复安装和失败语义用例；不新增运行时依赖。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：Hook、REQ CLI、event-store、doctor、用户现有 `.claude/session-log/**` 与 `.claude/worktrees/**`。
- 不可引入的依赖 / 操作：不得新增第三方 npm 依赖；不得 publish、commit、push；不得覆盖目标项目已有业务文件。

**边界条件**：
- 环境：Node.js 20+，离线本地 tarball smoke；网络不是验收前提。
- 发布边界：本 REQ 只证明候选 tarball，不推断 npm registry 当前已发布版本内容。

## 验收标准
- [x] README 使用与 `name`/`bin` 一致、经本地 tarball smoke 验证的 npx 命令。
- [x] `package.json` 声明 `files`、`engines`、`type`；候选 tarball 不包含 `.claude/events`、`.claude/session-log`、`.claude/worktrees`、tests、历史 completed REQ 或本机绝对路径。
- [x] 默认安装后的目标 package scripts 至少包含 README/skills 使用的 `req:create/start/block/complete/status/experience/reflect/align`、`req:audit`、`governance:health`、`docs:verify`、`check:governance`、`harness:doctor`。
- [x] 默认安装复制上述命令依赖脚本、source-command skills、context 子目录 README/模板与基础 Hook 所需文件。
- [x] 重跑安装器不会覆盖已有 `.claude/progress.txt` 或有效 `.claude/settings.local.json`；无效 settings 不被静默替换。
- [x] 复制/安装后验证出现失败时，CLI 不输出无条件成功语义并以非零状态退出，同时保留可诊断报告。
- [x] fixture 验证 fresh install 后的 doctor 与核心 REQ 生命周期命令可调用；重复安装保持 active progress。
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm pack --dry-run` 全部通过相应断言；目标项目的 `check:governance` 在 P1 profile REQ 前只保证入口存在，不宣称模板仓库自检规则已适配业务项目。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-089-design.md`
- 评审依据：`reviews/harness-lab-review-2026-07-10.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-089-code-review.md`
- QA：`requirements/reports/REQ-2026-089-qa.md`
- Ship：`requirements/reports/REQ-2026-089-ship.md`

## 验证计划
- 计划执行的命令：`npm test`；`npm run docs:verify`；`npm run check:governance`；`npm pack --dry-run --json`；测试内本地 tarball安装/重装 fixture。
- 需要的环境：本仓库、Node.js 20+、git、npm；不依赖外网。
- 需要的人工验证：审阅 tarball 文件清单、安装报告的 success/partial/failed 语义、README 命令与真实 CLI 一致性。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：四项分发与安装目标均有直接测试证据。
- [x] 旧功能保护：97 项自动化用例和治理门禁无回归。
- [x] 逻辑正确性：fresh、reinstall、invalid settings、copy/verify failure 均覆盖。
- [x] 完整性：README、package、installer、fixture 四个契约源保持一致。
- [x] 可维护性：不新增第三份 scripts 映射；P1 manifest 的迁移入口清晰。

#### 对齐检查（record 阶段）
- [x] 目标对齐：只解决公开分发与安装信任链，不夹带 Hook/状态架构改造。
- [x] 设计对齐：实现与设计稿一致；偏差记录在 QA。
- [x] 验收标准对齐：每条标准均链接到测试、命令输出或人工清单。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 本 REQ 可直接修正现有双映射，但 capability manifest 的最终单一事实源留给 P1；退出条件为 P1 manifest REQ 完成。

## 风险与回滚
- 风险：`files` allowlist 漏掉 installer 运行时资产；通过从 tarball 执行 fresh-install smoke 防止。
- 风险：重复安装保护逻辑使用户无法主动重置；本 REQ 默认 preserve，显式 reset/upgrade 语义由 P1 设计。
- 风险：严格失败退出影响依赖旧成功码的脚本；报告仍保留 copied/skipped/failed 明细。
- 回滚方式：分别回滚四个实现文件；fixture 只在临时目录运行，不修改用户项目。

## 关键决策
- 2026-07-11：采用顺序 REQ，不使用尚未完成真实聚合验证的 worktree 并行实施。
- 2026-07-11：npm 只要被 README 公开承诺就按受支持渠道治理，但不宣称线上现有 tarball 已泄漏。
- 2026-07-11：本 REQ 先闭合 P0 契约；P1 再将映射迁移为 capability manifest，并实现 target/profile-aware governance gate，避免用模板仓库自检冒充目标项目 gate。
- 2026-07-11：公开 npx 说明存在于三个同步面，批准 6 文件颗粒度例外；拆分会让已分发 skill 在两个 REQ 之间继续给出错误入口。

<!-- Source file: REQ-2026-089-review-plan-p0-distribution-installation.md -->
