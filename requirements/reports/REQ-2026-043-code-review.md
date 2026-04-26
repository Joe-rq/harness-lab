# REQ-2026-043 Code Review

**日期**：2026-04-26
**REQ**：REQ-2026-043 Phase 3B 范围强制（防越界）

## 变更范围

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/scope-guard.mjs | 新建 | ~200 |
| requirements/REQ_TEMPLATE.md | 修改 | +5 (范围章节结构化) |
| .claude/settings.local.json | 修改 | +5 (PreToolUse hook 注册) |

## 代码审查

| 维度 | 结论 |
|------|------|
| 正确性 | ✅ scope-guard 正确提取 REQ 范围声明，glob 匹配覆盖精确/单星/双星模式 |
| 模式切换 | ✅ collaborative 温和提醒，supervised 严格阻断（与 stop-evaluator 一致） |
| 向后兼容 | ✅ 无范围声明 → 不拦截；非 Write/Edit → 不拦截；无活跃 REQ → 不拦截 |
| 零依赖 | ✅ 纯 Node.js stdlib（fs, path, child_process） |
| 日志记录 | ✅ 越界操作追加到 .claude/scope-violations.log，格式：时间 | REQ ID | BLOCKED | 文件 | 允许范围 |
| 与 req-check.sh 共存 | ✅ 两者在同一 matcher 下注册，独立运行，互不影响 |

## 设计决策

1. **scope-guard 与 req-check.sh 共存于 PreToolUse**：req-check.sh 负责"有无 REQ"（布尔检查），scope-guard 负责"是否在范围内"（模式匹配）。两者职责不重叠，不需要合并。
2. **范围声明格式**：REQ 模板用反引号包裹的文件路径/glob（如 `` `scripts/*.mjs` ``），人类可读且 scope-guard 易于解析。
3. **glob 实现自研**：不引入 minimatch 等外部库。只支持 `*`（单层）和 `**`（任意深度），覆盖 99% 的实际场景。
4. **scope-violations.log 为追加式**：不做日志轮转，避免增加复杂度。长期使用后可手动清理。

## 延后项

- CANNOT 禁止列表的解析（当前只解析 CAN 允许列表）
- glob 更复杂模式（如 `?`、`[a-z]`）待有需求时添加
- scope-violations.log 日志轮转
