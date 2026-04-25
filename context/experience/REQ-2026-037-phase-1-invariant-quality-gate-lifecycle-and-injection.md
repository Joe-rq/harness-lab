# 2026-04-25 Phase 1: invariant quality gate, lifecycle, and injection

## 场景

REQ-036 建立了不变量提取器，但 24 条不变量全部"裸存"——无状态字段、无质量门禁、注入只覆盖 PreToolUse、启动无统计。Phase 1 要从"不变量存在"进化到"不变量驱动行为"。

## 关联材料

- REQ: `requirements/completed/REQ-2026-037.md`
- Code Review: `requirements/reports/REQ-2026-037-code-review.md`
- QA: `requirements/reports/REQ-2026-037-qa.md`

## 问题 / 模式

- **自动扫描候选质量低**：INV-005~024 全部带日期前缀标题、message 只是来源复读，无实质提醒内容。自动 --scan 生成的 21 条候选，只有 3 条手工种子（INV-001~003）质量达标
- **req:start 的 Scope Control 标题必须精确匹配**：写 `### 约束（Scope Control）` 不行，必须写 `### 约束（Scope Control，可选）`，否则 hasExemption 找不到节，skip-design-validation 不生效
- **checkbox 格式**：豁免字段必须用 `- [x] skip-design-validation`，不能用 `- skip-design-validation: xxx`

## 关键决策

- **status 字段加在 frontmatter 中，不建索引文件**：保持不变量文件自包含，任何消费者只需读单个 .md 文件即可获取全部信息
- **INV-001~003 标 active，004 标 deprecated，005~024 标 draft**：手工种子高置信度直接激活，自动扫描候选默认 draft 待人工审核
- **4 实体不加独立设计稿**：TEMPLATE + gate + extractor + session-start，每个实体边界清晰，REQ 内联设计即可

## 解决方案

1. 创建 TEMPLATE.md 定义结构化字段标准（status/severity/triggers/verification）
2. 批量 sed 给 24 条不变量 frontmatter 追加 status + severity 字段
3. invariant-gate.mjs --scan 扫描质量问题，--mark-draft 批量标记
4. invariant-extractor.mjs --inject 只输出 active 不变量，写 .claude/.invariant-injections/
5. session-start.sh grep -rl 统计各状态数量

## 复用建议

- **批量 frontmatter 修改用 sed -i**：macOS 的 `sed -i ''` 和 Linux 的 `sed -i` 语法不同，跨平台需注意
- **质量门禁的"标记但不删除"策略**：gate 只标记 draft，不删除低质量条目，保留数据供后续分析
- **--inject 的双输出**：同时写文件和 stdout，方便不同消费者（hook 读文件 vs CLI 调试看 stdout）
