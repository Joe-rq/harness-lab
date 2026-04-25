---
id: INV-099
title: 2026-04-25 Phase 2B 补充：req-cli --type 参数化
status: draft
severity: medium
triggers:
  - glob: "requirements/in-progress/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-099: 2026-04-25 Phase 2B 补充：req-cli --type 参数化
  来源: experience/REQ-2026-040-phase-2b-req-cli-type.md
---

## 详细说明

## 问题 / 模式

- **模板源分裂**：三个地方管理模板内容，改一处忘改另一处。将模板统一回 req-cli.mjs 一个源头是正确方向
- **prompt 不可靠性**：slash command 指导 Claude 用 Write 重写——Claude 可能不遵循。代码保证 > prompt 保证
- **buildCommonSections 抽取**：报告链接和阻塞章节是所有类型共享的，抽取为函数避免重复

<!-- 来源: context/experience/REQ-2026-040-phase-2b-req-cli-type.md -->