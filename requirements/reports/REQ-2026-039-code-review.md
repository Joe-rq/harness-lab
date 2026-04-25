# REQ-2026-039 Code Review

**日期**：2026-04-25
**审查范围**：`.claude/commands/bugfix.md`、`.claude/commands/feature.md`、`.claude/commands/refactor.md`

## 变更摘要

新增 3 个特化 REQ slash command，为 bugfix/feature/refactor 三种类型提供不同的创建体验。

## 审查结果

### 格式一致性 ✅
- 3 个文件均使用 frontmatter (name + description) + markdown body 格式
- 与现有 `first-req.md`、`harness-setup.md` 格式一致
- Claude Code 已自动识别并注册为 slash command

### 类型差异 ✅
- bugfix：Bug 现象 + 影响范围 + skip-design-validation 预勾选 + 低风险/低目标数
- feature：用户痛点 + 业务背景 + Scope Control CAN/CANNOT 必填提示 + 建议设计文档
- refactor：技术债描述 + 行为不变约束 + 后续 Phase 排除 + skip-design-validation 预勾选

### 安全检查 ✅
- 无代码注入风险（markdown prompt 文件）
- 不修改 req-cli.mjs、REQ_TEMPLATE.md、req-validation.mjs
- 复用现有 req:create + req:start 验证流程

### INV-039 合规 ✅
- 明确使用 Write 重写整个文件，不使用 Edit 逐节替换
- 在"约束"章节显式声明

### 发现的问题
- 无代码问题
- 建议：未来可考虑将三个命令的"前置检查"和"Step 2"抽取为共享片段，但当前重复是可接受的（独立 command 的清晰性优先）

## 结论

通过。3 个 slash command 格式正确、类型差异清晰、与现有流程无缝集成。
