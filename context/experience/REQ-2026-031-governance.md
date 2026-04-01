# 2026-04-01 Governance: 强制经验沉淀闭环

## 场景

Harness Lab 框架在 openclaw-auto-memory 项目的实际使用中暴露了一个 governance 漏洞：虽然框架声称要沉淀经验到 `context/experience/`，但这只是一个软约束（"如有复用价值"），而非强制检查。结果导致 001-006 共 6 个 REQ 的经验文档全部缺失。

## 关联材料

- REQ: `requirements/in-progress/REQ-2026-031-governance.md`（完成后移至 completed）
- Code Review: `requirements/reports/REQ-2026-031-code-review.md`
- QA: `requirements/reports/REQ-2026-031-qa.md`

## 问题 / 模式

- **软约束陷阱**："如有复用价值"这种措辞在实践中几乎等于 optional
- **无校验机制**：`req:complete` 只检查报告，不检查经验文档
- **高摩擦**：没有生成器，创建经验文档需要手动复制模板、命名、填充
- **无逃逸舱口**：对于确实无价值的 REQ，没有官方豁免通道

## 关键决策

- **决策 1：强制检查 + 豁免机制**  
  而不是继续软约束或完全自愿，选择强制检查但允许 `--skip-experience` 逃逸，确保 consciously opt-out 而非 unconsciously forget。

- **决策 2：提供生成器命令**  
  `req:experience --id REQ-xxx` 一键生成骨架，降低摩擦到单次命令执行。

- **决策 3：更新模板而非仅文档**  
  在 `REQ_TEMPLATE.md` 的 Scope Control 中添加 `skip-experience` 豁免项，让豁免机制成为协议的一部分。

## 解决方案

1. **修改 `req:complete`**：在报告检查之后添加 experience 文档存在性检查，使用 `readdirSync` + `startsWith(reqId)` 模糊匹配
2. **添加 `experienceCommand`**：读取 REQ 元数据，基于模板生成骨架文件到 `context/experience/REQ-{id}-{slug}.md`
3. **更新协议文件**：`INDEX.md` 明确强制要求，`REQ_TEMPLATE.md` 添加豁免选项
4. **测试适配**：两个调用 `completeCommand` 的测试用例添加 `'skip-experience'` 参数

## 复用建议

- **下次添加强制检查**：遵循 "强制 + 豁免" 模式，而不是纯自愿或纯强制
- **CLI 新增子命令**：参考 `experienceCommand` 的实现 - 解析选项、读取 REQ、write 文件、console.log 指导
- **测试与实现同步**：修改行为破坏性检查（如新增必填项）时，同步更新测试用例
- **模板与 INDEX 同步**：任何流程变更都要同时更新协议文档和生成模板
