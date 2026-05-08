# REQ-2026-056: feat: 完善 harness-setup skill 与一键迁移分发契约

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`harness-install.mjs` 的核心一键接入能力已经可用，但 `/harness-setup` 相关入口存在契约漂移：`.agents/skills/source-command-harness-setup/SKILL.md` 尚未纳入版本控制，且描述中有 `.Codex` 大小写、重复 `AGENTS.md`、源目录检测顺序、冲突策略、`npx harness-install` 等与真实实现不一致的内容。

这会导致新项目迁移时出现两个问题：agent 可能按过期 skill 执行错误步骤，用户也可能误以为当前包已经支持未声明的分发入口。

## 目标
- 同步 `.agents` skill 与 `.claude` command 的一键接入说明，消除与安装器真实行为不一致的描述
- 明确并补齐可分发 CLI 入口，使 `npx harness-install` 这类文档入口有对应 `package.json` 契约
- 增加回归测试，防止 skill / command / installer / package 分发入口再次漂移
- 补齐本 REQ 的 review、QA 与经验沉淀结果

## 非目标
- 不重写安装器整体交互流程
- 不实现覆盖已有文件的交互式冲突处理
- 不引入新的 npm 依赖
- 不改变 REQ 生命周期语义

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？（预计 5 个左右；这些文件共同构成同一个接入契约，拆分会增加漂移风险）
- [x] 涉及模块/目录 ≤ 4？（`.agents/.claude` 接入入口、`package.json` 分发、`tests`、`requirements/context`）
- [x] 能否用一句话描述"解决了什么问题"？让一键迁移新项目的 skill 说明、命令入口、分发契约和测试保持一致
- [x] 如果失败，能否干净回滚？可以回退文档、package bin 与测试改动

## 范围
- 涉及文件：
  - `.agents/skills/source-command-harness-setup/SKILL.md`
  - `.claude/commands/harness-setup.md`
  - `package.json`
  - `README.md`
  - `tests/governance.test.mjs`
  - `docs/plans/REQ-2026-056-design.md`
  - `requirements/reports/REQ-2026-056-*.md`
  - `context/experience/REQ-2026-056-*.md`
- 涉及目录 / 模块：
  - `.agents/skills/`
  - `.claude/commands/`
  - 根目录入口文档
  - `tests/`
  - `requirements/`
- 影响接口 / 页面 / 脚本：
  - `/harness-setup`
  - `source-command-harness-setup`
  - `npx harness-install` / package `bin`
  - `npm test`

### 约束（Scope Control，可选）

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：上述范围内的 skill、command、package 分发配置、治理测试与本 REQ 交付物
- 可新增的测试 / 脚本：仅新增/扩展治理测试，不新增运行时依赖脚本

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/harness-install.mjs` 的核心复制/安装行为，除非测试证明必须修正
- 不可引入的依赖 / 操作：新增 npm 依赖、网络发布、真实外部仓库破坏性迁移

**边界条件**：
- 时间 / 环境 / 数据约束：在本地仓库完成，不依赖远端网络
- 改动规模或发布边界：只收敛一键迁移契约，不扩展到 Phase 6 编排器能力

## 验收标准
- [x] `.agents` skill 与 `.claude` command 对核心模块、可选模块、hook、冲突策略和 CLI 入口的描述一致
- [x] `package.json` 提供与文档一致的 `harness-install` bin 入口，且不影响现有 `npm run harness:install`
- [x] 自动化测试覆盖 command/skill 文档同步和 package bin 契约
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过
- [x] Code Review、QA 与经验沉淀已落盘

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-056-design.md`
- 相关规范：`AGENTS.md`, `README.md`, `.claude/commands/harness-setup.md`, `scripts/harness-install.mjs`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-056-code-review.md`
- QA：`requirements/reports/REQ-2026-056-qa.md`
- Ship：不适用（本次为模板仓库接入契约优化，无独立发布动作）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 需要的环境：本仓库、Node.js、Git
- 需要的人工验证：检查 `/harness-setup` 与 source-command skill 是否表达同一套真实安装行为

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：skill、command、bin、测试是否全部完成？
- [x] 旧功能保护：是否保留现有安装器默认行为和 `npm run harness:install`？
- [x] 逻辑正确性：文档描述是否对应真实实现，而不是未来愿望？
- [x] 完整性：是否覆盖冲突策略、hook 脚本、CLI 入口、后续步骤？
- [x] 可维护性：未来修改安装入口时，测试是否能发现漂移？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于“一键迁移新项目能力收口”？
- [x] 设计对齐：实现是否符合设计文档？如有变更，是否记录原因？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：`bin` 入口声明后如果发布配置遗漏，用户仍可能无法通过包管理器调用
- 回滚方式：移除 `package.json` bin、回退 skill/command 文档与测试

## 关键决策
- 2026-05-08：把 `.agents` skill 纳入本次收口范围，因为它是迁移命令被 agent 调用时的直接依据
- 2026-05-08：不实现覆盖已有文件的冲突处理；当前真实行为是检测后跳过，文档应如实表达

<!-- Source file: REQ-2026-056-feat-harness-setup-skill.md -->
