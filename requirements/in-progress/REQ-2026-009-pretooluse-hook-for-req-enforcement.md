# REQ-2026-009: PreToolUse hook for REQ enforcement

## 状态
- 当前状态：review
- 当前阶段：review

## 背景

在 REQ-2026-008 中添加了会话启动协议和实施前检查点，但 AI 仍然可以忽略这些声明式指令直接修改文件。需要更强的强制机制在文件写入前进行拦截。

**根本问题**：治理框架不能依赖 AI 的自觉，必须有代码层面的强制机制。

## 目标
- 在 Write/Edit 操作前自动检查是否需要 REQ
- 当改动需要 REQ 但没有活跃 REQ 时，输出警告并建议创建
- 提供可配置的豁免机制（小改动、用户明确说不用 REQ）

## 非目标
- 不做硬性阻止（可能影响紧急修复）
- 不做 CI 集成（后续 REQ）
- 不改变现有 REQ 生命周期

## 范围
- 涉及目录 / 模块：scripts/, .claude/, CLAUDE.md
- 影响接口 / 页面 / 脚本：所有文件写入操作

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件：scripts/pre-tool-use-check.sh, .claude/settings.example.json, CLAUDE.md
- 可新增的脚本：pre-tool-use-check.sh

**禁止（CANNOT）**：
- 不可修改 requirements/ 目录结构
- 不可阻止用户明确豁免的操作

**边界条件**：
- 改动仅限治理层 hook，不影响业务代码

## 验收标准
- [ ] PreToolUse hook 配置正确
- [ ] pre-tool-use-check.sh 脚本可正常运行
- [ ] 无活跃 REQ 时修改文件会触发警告
- [ ] 小文件改动（<3 个文件）不触发警告
- [ ] 提供 .claude/.req-exempt 临时豁免机制

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-009-design.md`
- 相关规范：AGENTS.md

## 报告链接
- Code Review：`requirements/reports/REQ-2026-009-code-review.md`
- QA：`requirements/reports/REQ-2026-009-qa.md`
- Ship：不适用（框架模板）

## 验证计划
- 计划执行的命令：手动测试 Write 操作
- 需要的环境：Git 仓库
- 需要的人工验证：触发警告场景测试

## 阻塞 / 搁置说明（可选）
- 无

## 风险与回滚
- 风险：hook 可能增加操作延迟
- 回滚方式：删除 settings.local.json 中的 PreToolUse 配置

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架
- 2026-03-29：决定使用 prompt-based hook（比 command-based 更灵活）

<!-- Source file: REQ-2026-009-pretooluse-hook-for-req-enforcement.md -->
