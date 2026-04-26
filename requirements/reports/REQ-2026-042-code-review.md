# REQ-2026-042 Code Review

**日期**：2026-04-26
**REQ**：REQ-2026-042 Phase 3A 基础安全模式（模式切换 + Stop 评估器 + SessionEnd 反思）

## 变更范围

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/stop-evaluator.mjs | 新建 | ~130 |
| scripts/session-reflect.mjs | 新建 | ~120 |
| .claude/harness-mode | 新建 | 1 |
| .claude/settings.local.json | 修改 | +28 (Stop + SessionEnd hook 注册) |
| scripts/session-start.sh | 修改 | +5 (显示模式) |

## 代码审查

| 维度 | 结论 |
|------|------|
| 正确性 | ✅ Stop 评估器正确交叉检查验收标准 vs git diff；SessionEnd 正确生成摘要 |
| 模式切换 | ✅ .claude/harness-mode 文件，非 settings.local.json（schema 不允许自定义字段） |
| 关键词匹配 | ✅ 启发式关键词匹配，≥3 字符的词拆分后检查；全部覆盖则放行，有未覆盖则阻断 |
| 零依赖 | ✅ 纯 Node.js stdlib（fs, path, child_process） |
| 副作用隔离 | ✅ SessionEnd 只写 session-log + progress.txt，不影响会话流程 |
| 向后兼容 | ✅ 无 harness-mode 文件时默认 collaborative；无活跃 REQ 时放行；无改动时跳过 |

## 设计决策

1. **harnessMode 放在 .claude/harness-mode 而非 settings.local.json**：settings.local.json 有严格 schema 校验，不允许自定义字段。独立文件更灵活，且各 hook 脚本可独立读取。
2. **Stop hook 用 decision:block 而非 exit 2**：exit 2 是 stderr 反馈，decision:block + reason 是结构化 JSON，Claude 可以直接看到 reason 内容。
3. **collaborative 模式也阻断**：原设计说 collaborative 只提醒，但 Stop hook 的机制是 block/allow 二选一，没有"只提醒不阻断"的中间态。collaborative 模式的 reason 文案更温和（"如果确实已完成，可以再次尝试停止"），而 supervised 更严格。

## 延后项

- autonomous 模式行为待 Phase 5 实现
- stop-evaluator 的关键词匹配可优化为语义匹配（当前启发式够用）
