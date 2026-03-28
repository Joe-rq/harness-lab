# 2026-03-28 Scope Control Template Sync

## 场景

为 Harness Lab 增加新的 REQ 字段时，不能只改 `requirements/REQ_TEMPLATE.md`，还要确认 `req:create` 生成骨架、阶段 skill 和入口说明文档是否同步。

## 关联材料

- REQ：`requirements/completed/REQ-2026-007-scope-control-lightweight-upgrade.md`
- Design：`docs/plans/REQ-2026-007-design.md`
- Code Review：`requirements/reports/REQ-2026-007-code-review.md`
- QA：`requirements/reports/REQ-2026-007-qa.md`

## 问题 / 模式

- 在 Harness Lab 里，REQ 骨架既存在于 `REQ_TEMPLATE.md`，也存在于 `scripts/req-cli.mjs`
- 如果只更新模板，不更新 CLI，维护者通过 `req:create` 生成的仍然会是旧协议
- 仅更新模板还不够，review skill 和入口文档也需要解释新字段何时使用，否则字段会退化成隐形约定

## 解决方案

1. 修改 REQ 字段时，先确认是否存在 CLI 级骨架生成逻辑。
2. 同步更新 `REQ_TEMPLATE.md` 与 `scripts/req-cli.mjs`，确保手写和命令生成路径一致。
3. 为对应阶段的 skill 增加审查点，让新字段进入 review 语义，而不是只停留在模板展示层。
4. 至少更新一个入口文档，明确该字段的适用场景和是否强制。

## 复用建议

- 以后再新增 REQ 字段时，默认检查这四类文件：模板、CLI、skill、入口文档。
- 对轻量治理模板，优先引入“可选但显式”的字段，再决定是否需要自动 enforcement。
- 如果双写骨架的维护成本持续上升，再考虑把 `req:create` 改为从模板或共享片段生成。
