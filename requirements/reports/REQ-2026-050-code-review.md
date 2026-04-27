# REQ-2026-050 Code Review

**日期**：2026-04-27
**REQ**：REQ-2026-050 Phase 5.4 autonomous 模式实质化

## 变更范围

| 文件 | 变更类型 | 改动说明 |
|------|---------|---------|
| scripts/watchdog.mjs | 修改 | 新增 autonomous 静默恢复 + supervised 强制选择 + logAction 函数 |
| scripts/risk-tracker.mjs | 修改 | 新增 autonomous 允许+日志 / supervised 强警告 / getHarnessMode + logRiskAction |
| scripts/stop-evaluator.mjs | 修改 | collaborative 从阻断改为提醒（allow + additionalContext）；autonomous 也阻断 |
| scripts/session-start.sh | 修改 | autonomous 模式自动续传 + 记录日志 |

## 代码审查

| 维度 | 结论 |
|------|------|
| Watchdog 三模式分化 | ✅ autonomous=静默恢复+日志, supervised=强选策略, collaborative=友好提醒 |
| Risk R3+ 三模式分化 | ✅ autonomous=允许+日志, supervised=强警告, collaborative=stderr 提醒 |
| Stop 三模式分化 | ✅ supervised/autonomous=阻断, collaborative=提醒不阻断 |
| 续传三模式分化 | ✅ autonomous=自动继续+日志, collaborative/supervised=询问用户 |
| 安全边界 | ✅ Stop supervised/autonomous 阻断；Scope 三模式都阻断（未修改） |
| scope-guard 未修改 | ✅ 三模式都阻断，无需改动 |

## 设计决策

1. **PostToolUse 无法阻断**：risk-tracker 是 PostToolUse hook，无法真正阻断。supervised 模式用强警告 stderr，5.5 Deploy Guard 补位拦截危险操作
2. **Stop autonomous 也阻断**：假完成在任何模式下都不可接受——这是安全硬边界
3. **日志复用 .watchdog-actions.log**：watchdog 的 autonomous 恢复日志和续传日志写入同一文件，便于审计
4. **collaborative stop-evaluator 改为提醒**：与路线图定义对齐——collaborative = 人确认后执行

## 延后项

- 5.5 Deploy Guard 将补位 risk-tracker 在 supervised 模式下的 R3+ 阻断能力
