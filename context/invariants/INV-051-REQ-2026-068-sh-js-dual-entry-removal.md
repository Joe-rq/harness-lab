---
id: INV-051
title: 2026-05-19 删除 sh/js 双入口：从模板源头消除命令漂移
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: ".claude/**"
  - glob: "requirements/completed/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-051: 2026-05-19 删除 sh/js 双入口：从模板源头消除命令漂移
  来源: experience/REQ-2026-068-sh-js-dual-entry-removal.md
---

## 详细说明

## 问题 / 模式

- **双实现长期并存**：sh 版本是早期 PoC，js 版本是后续跨平台重写，但 sh 始终没被删
- **配置漂移**：`harness-install.mjs` 早已使用 `.js`，模板入口配置仍引用 `.sh`，新用户接入时看到的命令与实际安装产物不一致
- **隐性预期 bug**：在删 sh 后才发现 `req-check.js:88` 用 `${activeReq}.md` 精确拼接路径，而 sh 版本是 `find ${ACTIVE_REQ}-*.md` glob 匹配——这个不一致原本被 sh 入口"挡住"了

<!-- 来源: context/experience/REQ-2026-068-sh-js-dual-entry-removal.md -->