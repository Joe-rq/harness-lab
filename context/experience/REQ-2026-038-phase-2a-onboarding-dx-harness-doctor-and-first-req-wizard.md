# 2026-04-25 Phase 2A: Onboarding DX — harness-doctor and first-req wizard

## 场景

Phase 1 完成后，不变量系统已就绪，但新用户接入 harness-lab 的摩擦仍然很高：无法快速确认接入是否成功，不知道如何创建第一个 REQ。

## 关联材料

- REQ: `requirements/completed/REQ-2026-038.md`
- Code Review: `requirements/reports/REQ-2026-038-code-review.md`
- QA: `requirements/reports/REQ-2026-038-qa.md`

## 问题 / 模式

- settings.local.json 的 hooks 结构不是简单的数组，而是嵌套对象 `{ SessionStart: [{ matcher, hooks: [{ command }] }] }`，初始代码按数组解析导致 TypeError
- harness-doctor 与 harness-setup 边界需要明确：setup 是安装（一次性），doctor 是体检（随时可跑）
- slash command 只能在交互式 Claude Code 环境中测试，自动化测试无法覆盖

## 关键决策

- first-req 放在 `.claude/commands/` 而非 `skills/`：与 harness-setup 保持一致，两者都是 slash command
- harness-doctor 第 5 项检查设为"Hook 脚本存在性"：配置正确但脚本丢失是最常见的接入问题
- REQ 模板检查用"占位符数量 > 2"作为 warn 阈值：模板仓库本身保留占位符是正常的，不应判定为 fail

## 解决方案

1. harness-doctor: 5 项只读检查 + 结构化报告（pass/warn/fail + 修复建议 + --json 模式）
2. first-req: 5 步交互向导（项目类型识别 → 主题选择 → 创建 REQ → 自动填充 → 启动）
3. 解析 settings.local.json 时遍历嵌套 hooks 对象而非假设数组结构

## 复用建议

- 新增诊断检查时，遵循 harness-doctor 的 `function checkXxx() → { name, status, detail, fix }` 模式
- settings.local.json 解析逻辑可提取为共享模块，供其他脚本复用
- first-req 的项目类型识别信号表可被 Phase 2B 的适配器复用
