# REQ-2026-017: 修复无活跃 REQ 时 Hook 绕过漏洞

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
在测试中发现治理框架存在漏洞：当没有活跃 REQ 时，`req-check.sh` 直接返回 `exit 0`（允许所有操作）。这导致 AI 可以绕过 REQ 流程直接修改代码文件。

问题根源在第 77-80 行：
```bash
# No active REQ (or "none") — allow
exit 0
```

这导致"先有鸡还是先有蛋"问题的解决方案引入了新的安全漏洞。

## 目标
- 修复 `req-check.sh` 的逻辑漏洞
- 当没有活跃 REQ 时，只允许写入 requirements/ 和 docs/plans/ 目录
- 阻止无活跃 REQ 时的代码文件修改

## 非目标
- 不改变 REQ 创建流程（仍通过 req:create 创建）
- 不影响豁免机制（.req-exempt 仍然有效）

## 范围
- 涉及目录 / 模块：`scripts/req-check.sh`
- 影响接口 / 页面 / 脚本：PreToolUse hook 行为

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-check.sh`
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他脚本
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：需同步到 agent-flow-lite
- 改动规模或发布边界：仅修复漏洞，不改变流程

## 验收标准
- [x] 没有活跃 REQ 时，写入非 requirements/ 目录会被阻止
- [x] `req:create` 命令仍可正常创建 REQ
- [x] 同步到 agent-flow-lite 项目

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-017-design.md`（不适用，小修复）
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-017-code-review.md`
- QA：`requirements/reports/REQ-2026-017-qa.md`
- Ship：不适用（治理框架内部修复）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run check:governance`
- 需要的环境：Node.js、Git
- 需要的人工验证：确认无 REQ 时写入代码文件被阻止

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：可能阻止用户在无 REQ 时创建第一个 REQ（但 req:create 会自动创建豁免）
- 回滚方式：恢复原有的 `exit 0` 逻辑

## 关键决策
- 2026-03-29：当没有活跃 REQ 时，只允许写入 requirements/ 和 docs/plans/ 目录

<!-- Source file: REQ-2026-017-hook-block-no-req-bypass.md -->
