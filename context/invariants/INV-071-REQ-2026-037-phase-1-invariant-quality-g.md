---
id: INV-071
title: 2026-04-25 Phase 1: invariant quality gate, lifecycle, and i
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
  - glob: "

## 关键决策

- **status 字段加在 frontmatter 中，不建索引文件**：保持不变量文件自包含，任何消费者只需读单个 .md 文件即可获取全部信息
- **INV-001~003 标 active，004 标 deprecated，005~024 标 draft**：手工种子高置信度直接激活，自动扫描候选默认 draft 待人工审核
- **4 实体不加独立设计稿**：TEMPLATE + gate + extractor + session-start，每个实体边界清晰，REQ 内联设计即可

## 解决方案

1. 创建 TEMPLATE.md 定义结构化字段标准（status/severity/triggers/verification）
2. 批量 sed 给 24 条不变量 frontmatter 追加 status + severity 字段
3. invariant-gate.mjs --scan 扫描质量问题，--mark-draft 批量标记
4. invariant-extractor.mjs --inject 只输出 active 不变量，写 .claude/.invariant-injections/**"
  - glob: ".claude/**"
confidence: medium
message: |
  ⚠️ INV-071: 2026-04-25 Phase 1: invariant quality gate, lifecycle, and i
  来源: experience/REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md
---

## 详细说明

## 问题 / 模式

- **自动扫描候选质量低**：INV-005~024 全部带日期前缀标题、message 只是来源复读，无实质提醒内容。自动 --scan 生成的 21 条候选，只有 3 条手工种子（INV-001~003）质量达标
- **req:start 的 Scope Control 标题必须精确匹配**：写 `### 约束（Scope Control）` 不行，必须写 `### 约束（Scope Control，可选）`，否则 hasExemption 找不到节，skip-design-validation 不生效
- **checkbox 格式**：豁免字段必须用 `- [x] skip-design-validation`，不能用 `- skip-design-validation: xxx`

<!-- 来源: context/experience/REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md -->