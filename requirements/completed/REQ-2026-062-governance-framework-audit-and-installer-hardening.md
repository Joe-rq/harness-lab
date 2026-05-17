# REQ-2026-062: governance framework audit and installer hardening

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：MediAppHub 连续 100+ 次真实提交暴露出治理状态漂移、完成态 REQ 不自洽、报告后补、安装器清理目标项目历史、QA 缺少真实证据等问题。现有 Harness Lab 已有 REQ 生命周期、docs gate、报告/经验门禁和 worktree 隔离，但缺少对 completed REQ 本体一致性、安装器安全清理、QA 证据和治理健康状态的统一检查。
业务背景：Harness Lab 是可迁移的研发治理层模板，必须把目标项目踩过的真实坑沉淀成自动化门禁，避免后续项目继续依赖人工记忆维护 INDEX、progress、报告链接和 QA 证据。

## 目标
- 新增完成态一致性审计能力，并集成到 `req:complete` 与 `check:governance`
- 安全化 harness 安装器，避免误删目标项目已有 REQ，并对齐目标项目 npm scripts
- 强化 QA 证据契约、显式 REQ 编号创建、临时债务记录和治理健康报告
- 补充自动化测试与入口文档，确保目标项目迁移后能力不弱化

## 非目标
- 不实现多人并发锁、权限系统或审计数据库
- 不做自动修复模式，审计和健康报告只读输出
- 不拆分业务项目架构或引入外部依赖
- 不回写 MediAppHub 仓库，只把经验反哺到 Harness Lab

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个目标）
- [x] 涉及文件数 ≤ 4？（超过 4；这是计划指定的完整治理路线图，本 REQ 作为一次框架能力批量升级）
- [x] 涉及模块/目录 ≤ 4？（scripts / tests / requirements / docs）
- [x] 能否用一句话描述"解决了什么问题"？把真实项目暴露的治理漂移转成自动审计和迁移安全门禁。
- [x] 如果失败，能否干净回滚？新增脚本和模板改动可通过 git revert 回滚。

## 范围
- 涉及目录 / 模块：`scripts/`, `tests/`, `requirements/`, `docs/plans/`, `context/experience/`
- 影响接口 / 页面 / 脚本：`req:audit`, `governance:health`, `req:create --id`, `req:complete`, `check:governance`, `harness-install`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（本 REQ 有独立设计稿，不豁免）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-cli.mjs`, `scripts/check-governance.mjs`, `scripts/harness-install.mjs`, `scripts/auto-qa.mjs`, `requirements/REQ_TEMPLATE.md`, `package.json`, `README.md`, `CLAUDE.md`, `.agents/skills/source-command-harness-setup/SKILL.md`
- 可新增的测试 / 脚本：`scripts/req-audit.mjs`, `scripts/governance-health.mjs`, `tests/governance.test.mjs` 内新增测试，必要时新增专门测试文件

**禁止（CANNOT）**：
- 不可修改业务运行时文件（本仓库无业务运行时）
- 不可引入 npm 依赖
- 不可实现自动修复或删除目标项目真实历史
- 不可修改 git 历史或执行 destructive git 操作

**边界条件**：
- 时间 / 环境 / 数据约束：仅使用 Node.js 标准库；所有审计命令可在本地和 CI 中运行
- 改动规模或发布边界：一次性完成计划中的 6 类能力，但以只读审计和保守门禁为优先

## 验收标准
- [x] `npm run req:audit` 和 `node scripts/req-audit.mjs --format json` 可运行，输出 `{ ok, findings }`
- [x] `req:audit` 能发现 completed REQ 标题 ID / 文件名 ID 不一致、状态未 completed、报告链接错号、未勾选验收项、重复 REQ ID
- [x] `req:complete` 在完成前后执行目标 REQ 审计，并要求 QA 报告包含 `## 验证证据`
- [x] `check:governance` 集成 `req:audit --all`
- [x] `harness-install --dry-run` 不改目标文件，默认不按编号范围删除目标项目 REQ，目标项目脚本使用 git-status-backed 命令
- [x] `req:create --id REQ-YYYY-NNN` 支持显式编号，已存在编号硬失败
- [x] REQ 模板包含 `## 临时实现与债务`，债务缺少退出条件时 `req:audit` 给 warning
- [x] `npm run governance:health` 支持文本和 JSON 输出
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-062-design.md`（Feature 建议创建设计文档）
- 相关规范：MediAppHub 提交历史治理复盘、本 REQ 设计稿

## 报告链接
- Code Review：`requirements/reports/REQ-2026-062-code-review.md`
- QA：`requirements/reports/REQ-2026-062-qa.md`
- Ship：`requirements/reports/REQ-2026-062-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：手动查看 `req:audit` / `governance:health` 文本输出是否可读，确认 `harness-install --dry-run` 无文件写入

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：核心审计、完成门禁、安装器安全化、QA 证据、显式编号、债务记录和健康报告均已实现。
- [x] 旧功能保护：既有测试通过，历史 completed REQ 的旧问题按 warning 暴露，不阻断现有仓库。
- [x] 逻辑正确性：覆盖错号、重复编号、状态漂移、缺报告、缺 QA 证据、dry-run、显式编号冲突等边界。
- [x] 完整性：6 类路线图能力均有脚本、文档或测试覆盖。
- [x] 可维护性：审计逻辑集中在 `req-audit.mjs`，健康报告和 completion gate 复用同一接口。

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现直接覆盖 MediAppHub 暴露的完成态漂移、安装器误删、QA 无证据和编号漂移问题。
- [x] 设计对齐：实现遵循设计稿中的只读审计、保守安装器和不引入外部依赖约束。
- [x] 验收标准对齐：所有验收标准已通过自动测试和治理门禁验证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：功能遗漏（对照验收标准检查）、与现有功能冲突
- 回滚方式：`git revert` 或功能开关关闭

## 关键决策
- 2026-05-17：Feature 型 REQ，建议创建设计文档

<!-- Source file: REQ-2026-062-governance-framework-audit-and-installer-hardening.md -->
