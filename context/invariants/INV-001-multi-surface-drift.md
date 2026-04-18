---
id: INV-001
title: 契约多面漂移：改一处漏四面
triggers:
  - glob: "README.md"
  - glob: "CLAUDE.md"
  - glob: "scripts/harness-install.mjs"
  - glob: "scripts/check-governance.mjs"
  - glob: "requirements/REQ_TEMPLATE.md"
confidence: high
message: |
  ⚠️ INV-001: 你正在修改治理系统的"多面契约"文件
  README / CLAUDE.md / installer / governance check / REQ 模板 中的任一改动，
  需要检查其他四面是否需要同步更新。
  来源: experience/2026-03-29-governance-contract-parity.md
---

## 详细说明

harness-lab 有五个"源真相面"：入口文档 (README/CLAUDE.md)、自动检查 (governance/docs-verify)、
安装器 (harness-install.mjs)、REQ 模板、CLI 脚本。单面修改会静默导致其他面漂移。

**检查清单**：
- [ ] 如果改了 README 命令说明 → 检查 package.json scripts 和 check-governance.mjs
- [ ] 如果改了 REQ 模板字段 → 检查 req-cli.mjs 骨架生成和 harness-install.mjs
- [ ] 如果改了 scripts/ 中的文件 → 检查 harness-install.mjs 复制列表
- [ ] 如果新增了 hook 类型 → 检查 harness-install.mjs 和 settings.example.json

<!-- 来源: context/experience/2026-03-29-governance-contract-parity.md, 2026-03-28-scope-control-template-sync.md, 2026-03-29-installer-contract-drift.md -->
