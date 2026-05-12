# REQ-2026-059: fix: include worktree support in harness install

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Bug 现象：REQ-2026-058 已让源仓库支持 worktree 本地进度隔离，但 `harness-install` 迁移目标项目时没有复制 `scripts/worktree-utils.mjs`；同时迁移生成的 hook 配置使用 `scripts/req-check.js`，该跨平台脚本仍硬编码 `.claude/progress.txt` 和 `.claude/.req-exempt`。因此目标项目迁移后运行 `node scripts/req-cli.mjs` 可能因缺少依赖失败，PreToolUse hook 也无法正确读取 worktree 专属状态。
影响范围：所有通过 `/harness-setup`、`node scripts/harness-install.mjs` 或 `npx harness-install` 接入 Harness Lab 的目标项目，尤其是使用 git worktree 并行推进多个 REQ 的项目。

## 目标
- 将 worktree 支持所需脚本纳入迁移安装清单
- 让迁移生成的跨平台 `req-check.js` 使用 worktree-aware 的 progress / exempt 路径
- 添加回归测试，确保迁移后的 fixture 能直接运行核心 CLI 与 hook 脚本

## 非目标
- 不做影响范围外的改动
- 不重构相关代码（除非 Bug 本身由代码质量问题引起）

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个）
- [ ] 涉及文件数 ≤ 4？（安装器、跨平台 hook、测试、入口文档、source-command skill、本 REQ 与报告；属于同一迁移契约修复）
- [x] 涉及模块/目录 ≤ 4？（scripts/、tests/、requirements/）
- [x] 能否用一句话描述"解决了什么问题"？→ 让迁移命令完整包含 REQ-058 的 worktree 支持能力
- [x] 如果失败，能否干净回滚？→ 回退安装清单、req-check.js 与测试即可

## 范围
- 涉及目录 / 模块：`scripts/`、`tests/`、`requirements/`、入口文档与 skill
- 影响接口 / 页面 / 脚本：`harness-install` 迁移清单、`scripts/req-check.js`、安装器回归测试、`/harness-setup` 说明

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/harness-install.mjs`、`scripts/req-check.js`、`tests/governance.test.mjs`、`README.md`、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md`、本 REQ 交付物
- 可新增的测试 / 脚本：安装器 fixture 实跑回归测试

**禁止（CANNOT）**：
- 不可修改与 Bug 无关的文件
- 不可引入新依赖
- 不扩大默认安装模块边界到高级治理脚本

**边界条件**：
- 迁移后未启用 hook 的项目也应能运行 `node scripts/req-cli.mjs status`
- 启用 hook 的项目中 `req-check.js` 应优先读取 worktree 专属 `.req-exempt`，不存在时回退全局 `.claude/.req-exempt`

## 验收标准
- [x] `harness-install` 默认 CLI 清单包含 `scripts/worktree-utils.mjs`
- [x] 迁移后的 fixture 能直接执行 `node scripts/req-cli.mjs status`，不再因缺少 `worktree-utils.mjs` 失败
- [x] 迁移后的 `scripts/req-check.js` 使用 `getProgressPath()` / `getExemptPath()`，支持 worktree 专属状态和全局豁免兜底
- [x] 安装器回归测试覆盖迁移后 CLI / hook 脚本可执行性
- [x] `/harness-setup` command、source-command skill、README 与真实安装清单保持一致
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：`requirements/completed/REQ-2026-058-worktree-local-isolation.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-059-code-review.md`
- QA：`requirements/reports/REQ-2026-059-qa.md`
- Ship：不适用（本次为迁移命令与模板文档修复，无独立发布动作）
- Experience：`context/experience/REQ-2026-059-harness-install-runtime-dependencies.md`

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：检查迁移清单与 fixture 实跑结果，确认迁移命令完整包含 worktree 支持

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：Bug 是否已修复？回归测试是否已添加？
- [x] 旧功能保护：修复是否引入新问题？
- [x] 逻辑正确性：修复是否针对根因而非症状？
- [x] 完整性：是否处理了相关边界情况？
- [x] 可维护性：修复代码是否清晰？

#### 对齐检查（record 阶段）
- [x] 目标对齐：修复是否只针对声明的 Bug？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：迁移清单新增脚本后，默认安装文件数增加；`req-check.js` 路径逻辑若处理不当可能影响非 worktree 项目
- 回滚方式：移除 `worktree-utils.mjs` 安装清单项，回退 `req-check.js` 到硬编码路径版本，删除新增测试

## 关键决策
- 2026-05-12：Bug 修复 REQ，skip-design-validation 已预勾选

<!-- Source file: REQ-2026-059-fix-include-worktree-support-in-harness-install.md -->
