---
id: INV-041
title: 2026-04-06 4 实体规则的轻量级实现（深度思考案例）
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: "requirements/docs/**"
confidence: medium
message: |
  ⚠️ INV-041: 2026-04-06 4 实体规则的轻量级实现（深度思考案例）
  来源: experience/2026-04-06-scope-warning-pattern.md
---

## 详细说明

## 解决方案

```bash
# req-check.sh 新增逻辑
MODIFIED_COUNT=$(git status --porcelain=v1 | grep -E '^\s*[MADRC]' | grep -vE 'requirements/|docs/' | wc -l)

<!-- 来源: context/experience/2026-04-06-scope-warning-pattern.md -->