---
id: INV-111
title: 2026-05-12 feat: Claude Code worktree REQ guidance
status: draft
severity: medium
triggers:
  - glob: ".agents/skills/source-command-*/SKILL.md"
  - glob: ".claude/commands/harness-setup.md"
  - glob: "scripts/harness-install.mjs"
  - glob: "README.md"
confidence: medium
message: |
  ⚠️ INV-111: 2026-05-12 feat: Claude Code worktree REQ guidance
  来源: experience/REQ-2026-060-feat-claude-code-worktree-req-guidance.md
---

## 详细说明

## 问题 / 模式

- 入口 skill 的前置检查必须与底层状态模型一致：底层按 worktree 读取 `progress.txt`，skill 也应按当前 worktree 判断活跃 REQ。
- 完整 worktree 流程包含创建目录、分支命名、状态检查、REQ 创建/启动和收尾，适合独立 skill 承载。
- 迁移安装器如果只复制阶段导航 `skills/`，不复制 `.agents/skills/source-command-*`，目标项目会缺少 Claude Code source-command 引导。

## 建议

- 修改底层治理状态模型时，同步检查 source-command skills 的前置判断口径。
- 常规 REQ 类型 skill 只保留当前 worktree 状态检查和分流提示；完整并行流程应放入专用 worktree skill。
- 修改迁移入口时，同步更新 `harness-install` 清单、`harness-setup` command/skill、README 和安装器契约测试。

<!-- 来源: context/experience/REQ-2026-060-feat-claude-code-worktree-req-guidance.md -->
