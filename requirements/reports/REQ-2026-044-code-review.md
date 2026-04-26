# REQ-2026-044 Code Review

**日期**：2026-04-26
**REQ**：REQ-2026-044 Phase 3C 风险追踪

## 变更范围

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/risk-tracker.mjs | 新建 | ~150 |
| scripts/session-start.sh | 修改 | +8 (风险显示) |
| .claude/settings.local.json | 修改 | +5 (PostToolUse hook 注册) |

## 代码审查

| 维度 | 结论 |
|------|------|
| 正确性 | ✅ R0-R4 分级覆盖所有文件类型；棘轮机制只升不降 |
| 风险分类 | ✅ R4(治理核心) → R3(脚本/配置) → R2(源码) → R1(文档) → R0(Read) |
| 输出隔离 | ✅ risk-tracker 用 stderr（纯文本），loop-detection 用 stdout（JSON），互不干扰 |
| 棘轮持久化 | ✅ .claude/.risk-ratchet 文件，跨 hook 调用持久化 |
| 零依赖 | ✅ 纯 Node.js stdlib（fs, path, child_process） |
| 与 loop-detection 共存 | ✅ 两者在同一 matcher 下注册，独立运行 |

## 设计决策

1. **risk-tracker 用 stderr 而非 stdout**：PostToolUse hook 的 stdout 可能被其他 hook 使用（如 loop-detection 输出 JSON）。stderr 输出纯文本提醒，不干扰结构化输出。
2. **风险分级基于文件路径模式**：不需要 AI 语义理解。匹配规则有序（first match wins），从最具体（R4 治理核心脚本名）到最通用（.md 文件）。
3. **棘轮用文件而非内存**：risk-tracker 每次被调用是独立进程，需要文件来跨调用持久化最大风险值。
4. **session-start 显示风险等级**：让用户在会话开始时就知道上一会话的最高风险，提醒是否需要验证。

## 延后项

- 风险等级可配置化（当前硬编码在 RISK_RULES 中）
- R4 操作可考虑自动触发 npm test（当前只提醒）
- 跨会话风险累积（当前每次会话重置 ratchet）
