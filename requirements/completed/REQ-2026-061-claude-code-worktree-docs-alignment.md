# REQ-2026-061: docs: align worktree guidance with Claude Code docs

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：刚新增的 worktree REQ 引导主要使用手动 `git worktree add`，但 Claude Code 官方文档已经提供 `claude --worktree/-w`、`.worktreeinclude`、自动清理和手动管理等约定。
业务背景：Harness Lab 的主要使用环境是 Claude Code，worktree skill 应优先贴近 Claude Code 原生入口，再保留手动 git worktree 作为高级路径。

## 目标
- 将 `source-command-worktree-req` 对齐 Claude Code 官方 worktree 文档
- 在 README 的 Claude Code worktree 使用约定中补充 `claude --worktree`、`.worktreeinclude` 和手动 git worktree 的分工
- 记录官方文档来源和验证结果

## 非目标
- 不修改 `req-cli.mjs` 或 worktree 状态实现
- 不修改安装器分发清单
- 不实现新的 Claude Code hook

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个）
- [x] 涉及文件数 ≤ 4？（worktree skill、README、REQ、QA/Review）
- [x] 涉及模块/目录 ≤ 4？（`.agents/skills/`、README、requirements）
- [x] 能否用一句话描述"解决了什么问题"？→ 让 Harness Lab 的 worktree 引导贴合 Claude Code 官方入口
- [x] 如果失败，能否干净回滚？→ 回退文档和 skill 即可

## 范围
- 涉及目录 / 模块：
  - `.agents/skills/source-command-worktree-req/SKILL.md`
  - `README.md`
  - `requirements/**`
- 影响接口 / 页面 / 脚本：Claude Code worktree 引导文档

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [x] skip-design-validation（官方文档对齐的小型文档/skill 改动）

**允许（CAN）**：
- 可修改的文件 / 模块：worktree source-command skill、README、本 REQ 交付物
- 可新增的测试 / 脚本：不新增测试；沿用 docs/governance 验证

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`req-cli.mjs`、`scripts/worktree-utils.mjs`、安装器清单
- 不可引入的依赖 / 操作：新增 npm 依赖、自动执行 `git worktree remove`

**边界条件**：
- 时间 / 环境 / 数据约束：参考 https://code.claude.com/docs/en/worktrees
- 改动规模或发布边界：只做引导对齐，不改变运行时行为

## 验收标准
- [x] worktree skill 优先说明 `claude --worktree/-w`，并保留手动 `git worktree add` 路径
- [x] worktree skill 覆盖 `.worktreeinclude`、默认位置、base branch 和清理行为的关键提醒
- [x] README 的 Claude Code 使用约定同步官方入口
- [x] `npm run docs:verify` 和 `npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-061-design.md`（Feature 建议创建设计文档）
- 相关规范：Claude Code worktree docs（https://code.claude.com/docs/en/worktrees）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-061-code-review.md`
- QA：`requirements/reports/REQ-2026-061-qa.md`
- Ship：`requirements/reports/REQ-2026-061-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：对照 Claude Code 官方 worktree 文档检查 skill/README 关键点

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
- 风险：把 Claude Code 自动 worktree 与手动 git worktree 的职责混写，导致用户不知道何时使用哪个入口
- 回滚方式：回退 worktree skill、README 和本 REQ 交付物

## 关键决策
- 2026-05-12：Feature 型 REQ，建议创建设计文档
- 2026-05-12：以 Claude Code `--worktree` 作为默认推荐路径，手动 `git worktree add` 作为高级路径

<!-- Source file: REQ-2026-061-claude-code-worktree-docs-alignment.md -->
