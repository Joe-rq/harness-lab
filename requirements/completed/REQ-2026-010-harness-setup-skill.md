# REQ-2026-010: harness-setup Skill

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

harness-lab 作为 AI 项目治理框架需要引入到其他项目中使用。当前接入方式需要手动复制多个文件和目录，步骤繁琐且容易遗漏配置项。用户希望有一种更快捷的方式，能在 Claude Code 环境中一键将治理框架接入到已有项目。

**核心问题**：手动接入成本高，容易遗漏配置，缺乏冲突检测。

## 目标
- 创建一个可调用的 skill（`/harness-setup`），一键将 harness-lab 接入到任意项目
- 支持交互式选择要安装的模块
- 自动检测现有治理文件，避免意外覆盖
- 配置必要的 hooks（可选）

## 非目标
- 不支持非 Claude Code 环境（后续可通过 CLI 脚本补充）
- 不做自动化测试框架集成
- 不做 CI/CD 配置
- 不改变 harness-lab 核心功能

## 范围
- 涉及目录 / 模块：.claude/commands/, scripts/, requirements/, skills/
- 影响接口 / 页面 / 脚本：新增 `/harness-setup` 调用入口

### 约束（Scope Control）

**允许（CAN）**：
- 可新增的文件：`.claude/commands/harness-setup.md`, `scripts/harness-install.mjs`
- 可修改的文件：无（只复制模板文件到目标项目）

**禁止（CANNOT）**：
- 不可修改 harness-lab 自身的治理文件
- 不可引入新的运行时依赖
- 不可自动修改目标项目的 package.json（只提供建议）

**边界条件**：
- 改动仅限安装工具，不影响治理框架核心逻辑
- 目标项目必须是 Git 仓库

## 验收标准
- [ ] `/harness-setup` skill 可在任意项目中调用
- [ ] 正确检测目标项目是否已有治理文件，避免覆盖
- [ ] 交互式选择模块功能正常（核心模块、可选模块）
- [ ] PreToolUse hook 配置正确（可选安装）
- [ ] 安装完成后生成接入报告
- [ ] 提供 CLI 脚本备选方案（`npm run harness:install`）

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-010-design.md`
- 相关规范：AGENTS.md, CLAUDE.md

## 报告链接
- Code Review：`requirements/reports/REQ-2026-010-code-review.md`
- QA：`requirements/reports/REQ-2026-010-qa.md`
- Ship：`requirements/reports/REQ-2026-010-ship.md`（需要发布时填写）

## 验证计划
- 计划执行的命令：
  - 在临时目录创建测试项目，调用 `/harness-setup`
  - 运行 `npm run harness:install -- --help`
- 需要的环境：Git 仓库
- 需要的人工验证：交互式流程体验

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：目标项目可能有特殊结构，检测逻辑需要覆盖常见场景
- 回滚方式：skill 是独立文件，删除即可

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架
- 2026-03-29：决定使用 skill + CLI 双轨方案

<!-- Source file: REQ-2026-010-harness-setup-skill.md -->
