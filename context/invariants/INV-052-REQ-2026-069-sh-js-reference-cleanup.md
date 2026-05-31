---
id: INV-052
title: 2026-05-19 Phase 2 清理 sh 引用残留：显式声明不动历史
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: ".claude/commands/**"
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-052: 2026-05-19 Phase 2 清理 sh 引用残留：显式声明不动历史
  来源: experience/REQ-2026-069-sh-js-reference-cleanup.md
---

## 详细说明

## 问题 / 模式

- **显式残留 vs 历史残留区分困难**：手动 grep 时需要精心设计 `--exclude-dir` 参数，才能把"活跃引用"（配置/文档/SKILL）和"历史引用"（报告/经验/不变量/设计稿）分开。
- **本地配置不应强制覆盖**：`.claude/settings.local.json` 中的 sh 权限条目是本次运行时自动记录的，repo 不应强制覆盖；新用户从 `settings.example.json` 继承会自动得到 `.js` 命令。
- **SKILL 与 commands 内容需同步**：`.claude/commands/harness-setup.md` 与 `.agents/skills/source-command-harness-setup/SKILL.md` 是同一内容的两个分发渠道，改一处漏一处会漂移。

<!-- 来源: context/experience/REQ-2026-069-sh-js-reference-cleanup.md -->