# REQ-2026-034 Code Review

## 变更摘要
从 wow-harness 借鉴两个轻量治理机制，用 Node.js 重写融入 harness-lab：
1. **循环检测**：PostToolUse hook 检测同一文件 5 次/小时重复编辑
2. **豁免 TTL**：SessionStart 检查 .req-exempt 文件是否超过 2 小时

## 变更文件

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/loop-detection.mjs | 新增 | ~95 |
| scripts/session-start.sh | 修改 | +30 |
| .claude/settings.local.json | 修改 | +10 |

## 审查项

### 代码质量
- [x] 纯 Node.js stdlib，零外部依赖
- [x] 跨平台兼容（Linux stat / BSD stat / find fallback）
- [x] .mjs 后缀避免 ESM 模块类型问题
- [x] 状态文件 TTL 1 小时自动过期

### 安全性
- [x] 循环检测只注入提醒，不阻断操作（fail-open）
- [x] 豁免 TTL 只显示警告，不自动删除文件
- [x] 状态文件存储在 .claude/.loop-state/ 不影响项目

### 与现有系统集成
- [x] 不影响 PreToolUse req-check.sh 的阻断逻辑
- [x] PostToolUse hook 独立于 SessionStart hook
- [x] 豁免 TTL 检查嵌入 session-start.sh，无需额外脚本

## 结论
**通过**。改动精准，风险低，两个机制都是 advisory（不阻断）且 fail-open。
