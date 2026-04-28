# REQ-2026-052 Code Review

**日期**：2026-04-28
**REQ**：REQ-2026-052 Phase 5.6 不变量清理

## 变更范围

| 文件 | 变更类型 | 改动说明 |
|------|---------|---------|
| scripts/invariant-extractor.mjs | 修改 | 去重（dedupKey + dedupInvariants + scan 去重索引）+ 频率追踪（--check 写 .inv-usage.json）+ 自动废弃 + 高频升级 |
| scripts/invariant-gate.mjs | 修改 | 新增 --deprecate-stale 和 --upgrade-frequent 命令 |
| context/invariants/ | 大量删除 | 330 条重复文件删除 |

## 代码审查

| 维度 | 结论 |
|------|------|
| 去重逻辑 | ✅ 标题+触发路径组合作为 key，保留 ID 最小的，删除后续重复 |
| 扫描去重 | ✅ --scan 时构建 existingByKey 索引，新候选匹配已有 key 则跳过 |
| 频率追踪 | ✅ --check 时写入 .inv-usage.json，结构 {count, lastTriggered} |
| 自动废弃 | ✅ 90 天阈值，优先用 usage 文件的 lastTriggered，回退到文件 mtime |
| 高频升级 | ✅ 触发 ≥10 次的 medium INV 升级为 high |
| 向后兼容 | ✅ --scan/--check/--inject 原有功能不变，新增 --dedup 参数 |

## 设计决策

1. **去重 key = title + sortedGlobs**：只比较标题不够（不同 experience 可能同标题不同触发路径），加上触发路径排序组合才准确
2. **保留 ID 最小**：最早的 INV 经过最多人工审阅，可信度最高
3. **频率追踪独立于 --scan**：--check 才是实际触发场景，--scan 只是候选提取
4. **gate.mjs 添加独立命令**：与 extractor.mjs 的 --scan 流程复用相同逻辑，提供独立入口

## 延后项

- 无
