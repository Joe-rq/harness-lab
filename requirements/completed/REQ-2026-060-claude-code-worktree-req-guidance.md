# REQ-2026-060: feat: Claude Code worktree REQ guidance

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：Claude Code 日常通过 `feature` / `bugfix` / `refactor` skill 创建 REQ，但这些入口仍按“全局无活跃 REQ”判断，会误导 worktree 并行模式；同时缺少一个专门引导“新建 worktree 后创建并启动 REQ”的 skill。
业务背景：Harness Lab 已支持 worktree 本地进度隔离，需要把 Claude Code 的操作入口、迁移分发和文档统一到“一个 worktree 一个 active REQ”的模型。

## 目标
- 将 `source-command-feature` / `bugfix` / `refactor` 的前置检查改为当前 worktree 维度
- 新增 `source-command-worktree-req` skill，专门引导并行 REQ 的 worktree 创建、REQ 创建/启动和收尾
- 更新 `harness-setup` skill 与安装器分发清单，使迁移时包含新 skill
- 补充 Claude Code 下“一个 worktree 一个 active REQ”的文档说明

## 非目标
- 不修改 `req-cli.mjs` 的核心 worktree 状态算法
- 不实现自动创建/删除 git worktree 的新 CLI 命令
- 不改变 REQ 编号生成策略

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？（预计超过 4 个；但均属于 Claude Code skill 分发与文档入口同一契约）
- [x] 涉及模块/目录 ≤ 4？（`.agents/skills/`、`scripts/`、`tests/`、`README.md` / REQ 交付物）
- [x] 能否用一句话描述"解决了什么问题"？→ 让 Claude Code 用户按 worktree 维度创建和并行推进 REQ
- [x] 如果失败，能否干净回滚？→ 回退 skill 文档、安装器清单和测试即可

## 范围
- 涉及目录 / 模块：
  - `.agents/skills/source-command-feature/SKILL.md`
  - `.agents/skills/source-command-bugfix/SKILL.md`
  - `.agents/skills/source-command-refactor/SKILL.md`
  - `.agents/skills/source-command-worktree-req/SKILL.md`
  - `.agents/skills/source-command-harness-setup/SKILL.md`
  - `scripts/harness-install.mjs`
  - `tests/governance.test.mjs`
  - `README.md`
  - `docs/plans/REQ-2026-060-design.md`
- 影响接口 / 页面 / 脚本：`harness-install` 迁移清单、Claude Code source-command skills

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：上述 source-command skills、安装器模块清单、迁移契约测试、README、本 REQ 交付物
- 可新增的测试 / 脚本：扩展 `tests/governance.test.mjs` 覆盖新 skill 被安装器复制；不新增运行时脚本

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`req-cli.mjs` worktree 核心逻辑、REQ 模板、hook 阻断语义
- 不可引入的依赖 / 操作：新增 npm 依赖、自动执行 `git worktree add/remove`、网络发布

**边界条件**：
- 时间 / 环境 / 数据约束：本地仓库验证，不依赖网络
- 改动规模或发布边界：只更新 Claude Code 引导和迁移分发，不改变业务项目结构

## 验收标准
- [x] `feature` / `bugfix` / `refactor` skills 明确按当前 worktree 检查活跃 REQ，而不是全局检查
- [x] 新增 `source-command-worktree-req` skill，覆盖创建 worktree、进入目录、检查状态、创建/启动 REQ、查看全局状态和收尾
- [x] `harness-setup` skill 与 `harness-install` 迁移清单包含新 worktree skill
- [x] README 补充 Claude Code 下“一个 worktree 一个 active REQ”的使用说明
- [x] 自动化测试覆盖安装器会复制新 skill，`npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-060-design.md`（Feature 建议创建设计文档）
- 相关规范：`AGENTS.md`, `README.md`, `.agents/skills/source-command-harness-setup/SKILL.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-060-code-review.md`
- QA：`requirements/reports/REQ-2026-060-qa.md`
- Ship：`requirements/reports/REQ-2026-060-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：阅读新 skill 流程，确认 Claude Code 用户能按 worktree 维度创建并行 REQ

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [x] 旧功能保护：新功能是否破坏了现有功能？
- [x] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [x] 完整性：是否有遗漏的子功能？
- [x] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于最初的用户痛点？
- [x] 设计对齐：实现是否符合设计文档？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：skill 之间的判断口径不一致，导致 Claude Code 用户仍被引导回全局单活跃 REQ 模型
- 回滚方式：回退 `.agents/skills/`、安装器清单、测试和 README 改动

## 关键决策
- 2026-05-12：Feature 型 REQ，建议创建设计文档
- 2026-05-12：采用“更新现有 REQ 类型 skill + 新增专用 worktree skill”的组合方案

<!-- Source file: REQ-2026-060-claude-code-worktree-req-guidance.md -->
