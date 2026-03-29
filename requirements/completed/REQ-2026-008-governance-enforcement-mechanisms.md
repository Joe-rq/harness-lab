# REQ-2026-008: Governance enforcement mechanisms

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

在 agent-flow-lite 项目中发现治理框架被绕过的问题：
1. CLAUDE.md 中的指令是"声明式"的，AI 不会自动执行启动顺序
2. 用户提供的"实施计划"被当作跳过 REQ 的借口
3. 缺少强制机制确保治理流程被执行

## 目标
- 添加"会话启动协议"强制 AI 在回复前先读取关键文件
- 添加"实施前检查点"明确什么情况需要 REQ
- 创建 SessionStart hook 机制自动加载上下文
- 明确"用户计划 ≠ REQ"防止绕过

## 非目标
- 不做 CI 集成（后续 REQ）
- 不做 Git hooks（后续 REQ）
- 不改变现有 REQ 生命周期

## 范围
- 涉及目录 / 模块：CLAUDE.md, AGENTS.md, scripts/, .claude/
- 影响接口 / 页面 / 脚本：所有接入此框架的项目

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件：CLAUDE.md, AGENTS.md, scripts/session-start.sh, .claude/settings.example.json
- 可新增的测试 / 脚本：session-start.sh

**禁止（CANNOT）**：
- 不可修改 requirements/ 目录结构
- 不可修改现有 REQ 的内容

**边界条件**：
- 改动仅限治理层，不影响业务代码

## 验收标准
- [x] CLAUDE.md 包含"会话启动协议"
- [x] CLAUDE.md 包含"实施前检查点"和违规示例
- [x] scripts/session-start.sh 可正常运行
- [x] .claude/settings.example.json 包含 SessionStart hook 配置
- [x] AGENTS.md 更新了强制机制说明
- [x] subagent 会话检测机制

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-008-design.md`
- 相关规范：AGENTS.md

## 报告链接
- Code Review：`requirements/reports/REQ-2026-008-code-review.md`
- QA：`requirements/reports/REQ-2026-008-qa.md`
- Ship：不适用（框架模板，无需发布流程）

## 验证计划
- 计划执行的命令：`bash scripts/session-start.sh`
- 需要的环境：Git 仓库
- 需要的人工验证：新会话测试

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：hook 可能增加新会话启动时间
- 回滚方式：删除 settings.local.json 中的 hooks 配置

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架
- 2026-03-29：完成实现，进入 review 阶段

## 实现记录
- commit d79d7b1: feat(governance): 添加会话启动协议和实施前检查点

<!-- Source file: REQ-2026-008-governance-enforcement-mechanisms.md -->
