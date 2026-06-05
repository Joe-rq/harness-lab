---
name: docs-code-drift-audit
description: 文档与代码偏移的系统性模式：dogfood 配置远超前于分发模板和入口文档
metadata:
  type: experience
  req: REQ-2026-080
  date: 2026-06-06
---

## 文档与代码偏移的系统性模式

### 现象

对 harness-lab 进行文档 vs 代码审计，发现 15 处偏移（排除 1 处误报）。偏移方向一致：**代码能力 > 文档描述 > 分发模板**。

本地 dogfood 配置跑着 7 类 hook 的完整治理链，入口文档只描述了 2 类（SessionStart + PreToolUse）。用户从文档理解的能力约是实际能力的 30%。

### 根因

1. **功能迭代速度快于文档更新**：每个新 hook/功能通过独立 REQ 落地，但文档更新不是 REQ 的必选步骤
2. **两份配置手动同步**：`.codex/hooks.json` 与 `.claude/settings.local.json` 无共享机制
3. **多入口文档各自维护**：README、AGENTS.md、CLAUDE.md 三份入口文档的信息没有单一来源

### 判断标准

偏移严重程度分级：
- **高**（功能失效）：代码引用不存在的文件（如 risk-tracker 的 .sh 残留）、两份文档描述矛盾
- **中**（不可发现）：功能存在但文档未提及（如 verifier 系统、harness 模式）
- **低**（措辞/位置）：信息存在但位置不系统（如 --all 标志不在命令表格）

### 修复策略

1. **代码 bug**（.sh 残留、失效权限）→ 直接修，不需要 REQ
2. **Skill 定义不同步**（两份 skill 文档矛盾）→ 直接修
3. **系统性文档缺口**（入口文档缺失高级机制描述）→ 需要 REQ，因为涉及 4+ 文件

### 预防建议

- 在 `docs:verify` 中增加 hook 类型一致性检查（文档表格 vs settings.local.json）
- `.codex/hooks.json` 从 `settings.local.json` 自动生成，避免手动两份维护
- 新增 hook 类型的 REQ 模板中加入"更新入口文档"检查项

**Why:** 文档偏移不是偶发疏忽，而是结构性问题——dogfood 迭代速度与文档/分发模板的同步机制之间存在鸿沟。

**How to apply:** 未来新增 hook、脚本或治理机制时，在 REQ 验收标准中显式加入"更新 README/AGENTS.md/CLAUDE.md 入口文档"检查项。对配置文件（hooks.json），考虑增加自动化一致性检查。
