# REQ-2026-012: PreToolUse 硬阻断：将 REQ 检查从软约束升级为强制 block

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
harness-lab 治理框架的 PreToolUse hook 原本是"软约束"（prompt 类型，始终返回 approve），依赖 Claude 自觉遵守 CLAUDE.md 指令。这导致框架的最大结构性弱点：没有系统级强制阻断能力。

## 目标
- 将 PreToolUse hook 从 `prompt` 类型改为 `command` 类型
- 实现"无活跃 REQ 时阻断文件修改"的硬约束
- 保留豁免机制（`.claude/.req-exempt`）用于紧急修复和小改动

## 非目标
- 不改变 REQ 判断逻辑（3+ 文件、新功能、架构变更仍需要 REQ）
- 不移除豁免机制

## 范围
- 涉及目录 / 模块：`.claude/`, `scripts/`
- 影响接口 / 页面 / 脚本：PreToolUse hook 行为

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件：`.claude/settings.local.json`, `.claude/settings.example.json`, `CLAUDE.md`, `AGENTS.md`
- 可新增的脚本：`scripts/req-check.sh`

**禁止（CANNOT）**：
- 不可修改 req-cli.mjs 的核心逻辑
- 不可移除豁免机制

## 验收标准
- [x] 无活跃 REQ 时，Write/Edit 操作被阻断
- [x] 有活跃 REQ 时，Write/Edit 操作正常执行
- [x] 豁免文件存在时，跳过 REQ 检查
- [x] 阻断信息清晰指导用户创建 REQ

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-012-design.md`
- 相关规范：`AGENTS.md` § 强制机制

## 报告链接
- Code Review：`requirements/reports/REQ-2026-012-code-review.md`
- QA：`requirements/reports/REQ-2026-012-qa.md`
- Ship：不适用（框架模板变更，无需发布）

## 验证计划
- 计划执行的命令：`npm run check:governance`, 手动测试阻断/豁免
- 需要的环境：Git 仓库
- 需要的人工验证：测试无 REQ 时写文件是否被阻断

## 风险与回滚
- 风险：误伤小改动场景（可通过豁免机制解决）
- 回滚方式：将 `settings.*.json` 中的 PreToolUse hook 改回 `prompt` 类型

## 关键决策
- 2026-03-29：选择 `command` 类型 + shell 脚本而非 `prompt` 类型，因为只有 command 类型可以通过 exit code 实现硬阻断
- 2026-03-29：保留豁免机制，避免误伤小改动场景

<!-- Source file: REQ-2026-012-pretooluse-req-block.md -->
