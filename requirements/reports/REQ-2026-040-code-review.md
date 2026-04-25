# REQ-2026-040 Code Review

**日期**：2026-04-25
**REQ**：REQ-2026-040 Phase 2B 补充：req-cli --type 参数化，统一模板源

## 变更范围

| 文件 | 变更类型 | 行数 |
|------|---------|------|
| scripts/req-cli.mjs | 修改 | +220（新增 4 个构建函数） |
| .claude/commands/bugfix.md | 重写 | 166→60（简化为薄壳） |
| .claude/commands/feature.md | 重写 | 176→60（简化为薄壳） |
| .claude/commands/refactor.md | 重写 | 172→60（简化为薄壳） |

## 代码审查

| 维度 | 结论 |
|------|------|
| 正确性 | ✅ 4 个构建函数各自生成完整的 REQ 骨架，包含所有必需章节 |
| 向后兼容 | ✅ 无 --type 时走 buildGenericReqContent，输出与原 buildReqContent 一致 |
| 章节完整性 | ✅ 所有类型都包含 `## 阻塞 / 搁置说明（可选）`（replaceSection 必需） |
| 新增章节 | ✅ 颗粒度自检和反馈与质量检查已补全到所有类型 |
| 安全性 | ✅ --type 值仅在 builders 字典中查找，未知值走通用模板 |

## 风险

- 无。改动仅影响 req:create 的模板生成，不影响 req:start/complete/block 的逻辑。
