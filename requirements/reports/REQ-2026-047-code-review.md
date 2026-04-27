# REQ-2026-047 Code Review

**日期**：2026-04-27
**REQ**：REQ-2026-047 Phase 5.1 Watchdog（看门狗）

## 变更范围

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/watchdog.mjs | 新建 | ~195 |
| .claude/settings.local.json | 修改 | +5 |
| .claude/.watchdog-state | 运行时生成 | — |

## 代码审查

| 维度 | 结论 |
|------|------|
| 停滞检测 | ✅ editCount 阈值检测，阶段变化时重置计数 |
| 循环检测 | ✅ 近 6 次切换中检查双向 pairs，阈值 3 次 |
| 状态持久化 | ✅ JSON 文件读写，跨会话续传 |
| Hook 集成 | ✅ PostToolUse additionalContext 输出，与 loop-detection/risk-tracker 共存 |
| 安全模式 | ✅ collaborative 提醒 vs supervised 更强语气 |
| CLI 诊断 | ✅ --diagnose 模式，显示活跃 REQ + 历史追踪 |
| 零依赖 | ✅ 纯 Node.js stdlib |

## 设计决策

1. **PostToolUse hook 而非 CronCreate**：Claude Code 会话不适合长驻进程，改为每次文件操作后被动检查
2. **跨会话状态文件**：`.watchdog-state` 而非 per-session 文件，支持跨会话检测长期停滞
3. **editCount 计数而非时间戳**：hook 是事件驱动的，用操作次数比时间戳更准确反映"有进展 vs 停滞"
4. **双向 pair 匹配循环**：检测 A<->B 反复切换，不要求严格交替

## 延后项

- 可配置阈值（当前硬编码 STAGNATION_THRESHOLD=10, LOOP_THRESHOLD=3）
- 停滞检测可加入时间维度（如 30 分钟无阶段推进）
- 循环检测可检测三方循环（A->B->C->A）
