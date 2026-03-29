# REQ-2026-016: One-click setup parity with hard-block governance hooks

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
README 和当前治理脚本已经升级到“PreToolUse 硬阻断 + 空模板 REQ 不能 start”的契约，但一键接入路径仍停留在旧状态。`/harness-setup` 文档没有说明 `req:create` 只生成骨架；`harness-install.mjs` 仍写入软提醒型 `prompt` hook，而且缺少 `req-check.sh` 与 `req-validation.mjs` 这些当前治理链路必需脚本。结果是“一键安装”和仓库当前实际治理机制不一致。

## 目标
- 让 `/harness-setup` 文档准确描述当前一键接入后的硬阻断行为
- 让 `harness-install.mjs` 生成与仓库现状一致的 `SessionStart + PreToolUse command hooks`
- 确保一键安装复制当前治理链路必需脚本，不留下缺失依赖
- 用自动化测试证明安装结果与治理契约一致

## 非目标
- 不重做安装器整体交互流程
- 不修改 REQ 生命周期本身
- 不扩展到新的模块选择能力

## 范围
- 涉及目录 / 模块：`.claude/commands/harness-setup.md`、`scripts/harness-install.mjs`、相关测试与 REQ 报告
- 影响接口 / 页面 / 脚本：一键接入后的 hooks、安装报告、目标项目接入说明

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：安装器、接入说明、治理测试、当前 REQ 文档
- 可新增的测试 / 脚本：围绕安装结果的仓库级测试

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：REQ 模板结构、外部业务仓库
- 不可引入的依赖 / 操作：新增外部 npm 依赖

**边界条件**：
- 时间 / 环境 / 数据约束：在当前仓库内完成一键接入链路修复，不依赖远端网络
- 改动规模或发布边界：仅修复治理框架模板自身的一键接入契约

## 验收标准
- [x] `harness-install.mjs` 会复制 `req-validation.mjs` 与 `req-check.sh` 等当前必需脚本
- [x] `--with-hook` 生成的 `settings.local.json` 与示例一致，使用 `command` 硬阻断而不是 `prompt`
- [x] 安装报告和终端后续步骤会明确“创建 REQ 骨架后还需写实内容再 start”
- [x] `/harness-setup` 文档同步说明硬阻断和骨架 REQ 约束
- [x] 自动化测试覆盖新的安装结果和 hook 配置

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-016-design.md`
- 相关规范：`README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.example.json`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-016-code-review.md`
- QA：`requirements/reports/REQ-2026-016-qa.md`
- Ship：`requirements/reports/REQ-2026-016-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 需要的环境：Node.js、Git、本地文件系统
- 需要的人工验证：检查 `/harness-setup` 文档和安装报告中的接入步骤是否与实现一致

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：安装器 hook 配置变更可能影响已有接入预期
- 回滚方式：恢复 `scripts/harness-install.mjs` 和 `/harness-setup` 到原实现，并重新跑治理测试

## 关键决策
- 2026-03-29：一键接入必须以仓库当前治理契约为准，不能继续输出旧版软提醒 hook
- 2026-03-29：`req:create` 只创建骨架的说明属于一键接入路径的关键交付信息，必须在文档与报告中同时出现

<!-- Source file: REQ-2026-016-one-click-setup-hard-block-parity.md -->
