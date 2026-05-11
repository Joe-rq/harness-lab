# REQ-2026-058: 支持 worktree 本地隔离模式

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
用户希望用 git worktree 方式为每个 REQ 创建独立工作目录并行推进。当前 Harness Lab 的进度追踪（progress.txt）、REQ 活跃状态（INDEX.md）、豁免机制（.req-exempt）均为"全局单例"设计，与 worktree 的物理隔离理念冲突：
- 各 worktree 共用一份 progress.txt，进度互相覆盖
- req:start 拒绝启动第二个 REQ
- session-start、hooks 恢复上下文时找不到本 worktree 的进度

## 目标
- 实现 worktree 检测 + 本地进度隔离（.claude/worktrees/{branch}/progress.txt）
- 允许多个 REQ 同时在 INDEX.md 中标记为活跃
- 改造 req-cli / session-start / hooks / commands 读取正确的本地进度
- 保证非 worktree 环境行为完全不变（向后兼容）

## 非目标
- 不实现 worktree 的自动创建/删除（用户手动用 git worktree）
- 不改 REQ 内容格式或验收标准格式
- 不引入新的外部依赖

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [x] 涉及文件数 ≤ 4？→ 核心逻辑 3 个脚本 + 2 个命令文件 = 5，按功能边界属于同一 REQ
- [x] 涉及模块/目录 ≤ 4？→ scripts/、.claude/commands/、requirements/INDEX.md
- [x] 能否用一句话描述"解决了什么问题"？→ 让 Harness Lab 支持 git worktree 并行推进多 REQ
- [x] 如果失败，能否干净回滚？→ 纯新增路径，回滚即删除 .claude/worktrees/

## 范围
- 涉及目录 / 模块：scripts/、.claude/commands/、requirements/INDEX.md
- 影响接口 / 页面 / 脚本：req-cli、session-start、precompact-notify、session-reflect、resume command、self-review command

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation

**允许（CAN）**：
- 可修改 req-cli.mjs、session-start.js、precompact-notify.mjs、session-reflect.mjs
- 可修改 .claude/commands/resume.md、.claude/commands/self-review.md
- 可新增 scripts/worktree-utils.mjs（worktree 工具函数，可选）
- 可修改 requirements/INDEX.md 格式（活跃 REQ 允许多个）

**禁止（CANNOT）**：
- 不可修改 .gitignore（.claude/worktrees/ 不加入 git 跟踪）
- 不可修改 req 模板格式、report 模板格式
- 不可修改 tests/ 目录下已有测试的逻辑（可新增测试）
- 不可引入新的 npm 依赖

**边界条件**：
- worktree 分支名含特殊字符时目录名需安全化（替换 / 等）
- 主仓库（非 worktree）行为必须 100% 不变

## 验收标准
- [ ] 在 git worktree 中执行 req:start 能成功启动 REQ，进度写入 .claude/worktrees/{branch}/progress.txt
- [ ] 在 git worktree 中 req:status 能正确读取本 worktree 的活跃 REQ
- [ ] 多个 worktree 可同时有活跃 REQ，INDEX.md 正确列出所有活跃 REQ
- [ ] 非 worktree 环境（主仓库直接工作）行为与改动前完全一致
- [ ] session-start 在 worktree 中启动时能恢复本 worktree 的 REQ 上下文
- [ ] PreCompact hook 和 SessionEnd hook 在 worktree 中读取正确的 progress.txt
- [ ] npm test 通过，npm run docs:verify 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-058-design.md`
- 相关规范：CLAUDE.md 续传协议、压缩恢复协议

## 报告链接
- Code Review：`requirements/reports/REQ-2026-058-code-review.md`
- QA：`requirements/reports/REQ-2026-058-qa.md`
- Ship：`requirements/reports/REQ-2026-058-ship.md`

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库 + 手动创建 git worktree 验证
- 需要的人工验证：手动创建 worktree、启动 REQ、验证进度隔离

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：worktree 检测 + 本地进度隔离是否完整？
- [ ] 旧功能保护：主仓库模式是否完全不受影响？
- [ ] 逻辑正确性：分支名安全化、路径处理边界是否正确？
- [ ] 完整性：所有读取 progress.txt 的入口是否都改造了？
- [ ] 可维护性：worktree 工具函数是否集中、复用？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否解决了 worktree 并行推进 REQ 的问题？
- [ ] 设计对齐：实现是否符合方案 A（本地隔离）？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：遗漏某个读取 progress.txt 的入口导致 worktree 中行为异常
- 回滚方式：删除 .claude/worktrees/ 目录，回退 req-cli.mjs 等脚本到上一版本

## 关键决策
- 2026-05-12：采用方案 A（本地隔离），不把 .claude/worktrees/ 加入 git 跟踪
- 2026-05-12：分支名安全化策略：将 / 替换为 --，避免嵌套目录问题
