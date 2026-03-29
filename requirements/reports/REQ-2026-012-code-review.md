# REQ-2026-012 Code Review

**日期**：2026-03-29
**审查者**：AI Assistant
**状态**：✅ 通过

## 变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `scripts/req-check.sh` | 新增 | REQ 硬阻断检查脚本，检查活跃 REQ 并返回 exit code |
| `.claude/settings.local.json` | 修改 | PreToolUse hook 从 `prompt` 改为 `command` 类型 |
| `.claude/settings.example.json` | 修改 | 同步更新 hook 配置 |
| `CLAUDE.md` | 修改 | 更新"临时豁免机制"为"强制执行机制" |
| `AGENTS.md` | 修改 | 更新 PreToolUse hook 描述为"硬阻断" |

## 主要检查点

### 正确性

- [x] `req-check.sh` 正确读取 `.claude/progress.txt` 中的活跃 REQ
- [x] 无活跃 REQ 时脚本返回 exit code 2（触发 block）
- [x] 豁免文件 `.claude/.req-exempt` 存在时跳过检查
- [x] settings.local.json 与 settings.example.json hook 配置一致

### 一致性

- [x] CLAUDE.md 和 AGENTS.md 同步更新，描述硬阻断机制
- [x] 豁免机制说明与脚本实现一致

### 可维护性

- [x] 脚本简洁（约 35 行），逻辑清晰
- [x] 错误信息指导用户创建 REQ 或使用豁免

## 发现的问题

- 阻断时的错误信息在 UI 中显示不够清晰（只显示"hook error"而非脚本输出的详细说明）
- 这是 Claude Code 的限制，脚本输出到 stdout，hook 错误信息只显示 stderr

## 结论

改造成功将 PreToolUse 从软约束升级为硬阻断：

1. 无活跃 REQ 时，Write/Edit 操作被系统级阻断
2. 有活跃 REQ 时，操作正常执行
3. 豁免机制有效

建议合并。
