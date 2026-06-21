# REQ-2026-082: Fix scope guard enforcement and hook installation drift

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Bug 现象：scope-guard 已在源仓库本地 hook 中存在，但默认安装链路和 `.claude/settings.example.json` 只配置 `req-check.js`。目标项目启用治理 hook 后只能校验“是否有可实施 REQ”，不能校验本次写入是否符合 REQ scope。另一个缺口是 scope-guard 只抽取 CAN 中的机器可识别路径；当 REQ 明确写“只读分析 / 无代码改动 / CANNOT 修改源代码”但未写 glob allow-list 时，会因向后兼容逻辑直接放行。
影响范围：Claude Code 目标项目、harness-install 安装产物、scope-guard 对只读审计 REQ 的拦截能力。

## 目标
- 默认 hook 安装链路包含并配置 scope-guard
- scope-guard 能识别只读 / 无代码改动 / CANNOT 修改源码测试配置的 REQ，并阻断源代码、测试和配置写入
- 增加回归测试覆盖安装器配置和只读 REQ 拦截

## 非目标
- 不改 `.codex/hooks.json` 与 `.claude/settings.local.json` 的高级 hook 集合
- 不引入第三方依赖
- 不重写 scope-guard 为完整自然语言策略引擎

## 颗粒度自检
- [x] 目标数 ≤ 4？3 个目标
- [x] 涉及文件数 ≤ 4？核心实现 4 个文件；另需同步 4 个入口/skill 文档以消除安装说明漂移
- [x] 涉及模块/目录 ≤ 4？scripts/、.claude/、tests/、requirements/
- [x] 能否用一句话描述"解决了什么问题"？让默认安装后的 Claude Code hook 真正拦截 REQ scope 越界写入
- [x] 如果失败，能否干净回滚？能，回退本 REQ 改动即可

## 范围
- 涉及文件：
  - `.claude/settings.example.json`
  - `scripts/harness-install.mjs`
  - `scripts/scope-guard.mjs`
  - `tests/governance.test.mjs`
  - `AGENTS.md`
  - `README.md`
  - `.claude/commands/harness-setup.md`
  - `.agents/skills/source-command-harness-setup/SKILL.md`
  - `requirements/in-progress/REQ-2026-082-*.md`
  - `requirements/reports/REQ-2026-082-*.md`
- 涉及目录 / 模块：scripts/、.claude/、tests/、requirements/
- 影响接口 / 页面 / 脚本：harness-install hook 安装、PreToolUse Write/Edit scope 拦截

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：`.claude/settings.example.json`、`scripts/harness-install.mjs`、`scripts/scope-guard.mjs`、`tests/governance.test.mjs`、`AGENTS.md`、`README.md`、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md`
- 可新增的测试 / 脚本：仅在现有测试文件中补回归测试

**禁止（CANNOT）**：
- 不可修改 `.codex/hooks.json`
- 不可修改 `.claude/settings.local.json` 的高级 hook 集合
- 不可引入新依赖

**边界条件**：
- 修复应最小化，只改必要的代码

## 验收标准
- [x] `.claude/settings.example.json` 的 Write/Edit PreToolUse 同时配置 `req-check.js` 与 `scope-guard.mjs`
- [x] `harness-install --with-hook` 复制 `scope-guard.mjs` 并写入目标项目 hook 配置
- [x] 安装器报告不再声明 `scope-guard` 属于默认未安装高级脚本
- [x] scope-guard 对“只读 / 无代码改动 / 禁止修改源代码或测试代码 / 禁止修改配置文件”的 REQ，阻断 `server/app/main.py`、`app/src/App.tsx`、`server/tests/test_api.py`、`Dockerfile` 等写入
- [x] scope-guard 仍允许只读审计 REQ 写入明确报告产物 `requirements/reports/REQ-*.md`
- [x] 旧 REQ 无 scope 声明时仍向后兼容放行
- [x] `npm test` 通过
- [x] `npm run check:governance` 通过

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-082-code-review.md`
- QA：`requirements/reports/REQ-2026-082-qa.md`
- Ship：`requirements/reports/REQ-2026-082-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test`、`npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：手动复现确认 Bug 已修复

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

## 临时实现与债务
- 无

## 风险与回滚
- 风险：低风险，Bug 修复范围小
- 回滚方式：`git revert`

## 关键决策
- 2026-06-10：Bug 修复 REQ，skip-design-validation 已预勾选

<!-- Source file: REQ-2026-082-scope-guard-hook-installation-drift.md -->
